import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { dbAll } from '../database.js'
import XLSX from 'xlsx'

import { fileURLToPath } from 'url'

export const iaRouter = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path prioritario para producción (Railway)
const BUNDLED_DATA_PATH = path.join(__dirname, '..', 'data')
// Path de desarrollo local
const LOCAL_ISO_BASE = 'D:\\ISO CALIDAD PORTACHUELO'

// Proveedor: Model Studio (Alibaba Cloud International - Singapore)
const IA_API_URL = process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const IA_API_KEY = process.env.SEMAPACH_IA_KEY;
const IA_MODEL = process.env.QWEN_MODEL || 'qwen-plus';

/** 
 * Función para cargar conocimiento local (Excel + DB) 
 */
async function getFullPtapContext() {
    let contextStr = ""
    
    // 1. Cargar el Manual Técnico (Excel)
    try {
        let filePath = path.join(BUNDLED_DATA_PATH, 'CUADRO_DE_PARAMETROS.xlsx')
        
        // Si no existe el bundle, intentar local (fallback dev)
        if (!fs.existsSync(filePath)) {
            filePath = path.join(LOCAL_ISO_BASE, 'NC-11 Operaciones y Calidad\\Evidencias de Tratamiento de No conformidad\\OPAPTAR\\CARPETA\\CUADRO DE PARAMETROS.xlsx')
        }

        if (fs.existsSync(filePath)) {
            const workbook = XLSX.readFile(filePath)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(sheet)
            contextStr += "--- MANUAL TÉCNICO Y PARÁMETROS ISO ---\n"
            contextStr += JSON.stringify(data) + "\n\n"
        } else {
            console.warn("[IA ROUTE] No se encontró el Excel de parámetros en:", filePath)
        }
    } catch (e) {
        console.error("[IA ROUTE] Error leyendo Excel:", e)
        contextStr += "Error al cargar Manual ISO.\n"
    }

    // 2. Cargar Historial Operativo Reciente (Base de Datos)
    try {
        const logs = await dbAll('SELECT * FROM ptap_readings ORDER BY fecha DESC, hora DESC LIMIT 50')
        contextStr += "--- ÚLTIMOS 50 REGISTROS OPERATIVOS (PTAP PORTACHUELO) ---\n"
        contextStr += JSON.stringify(logs) + "\n"
    } catch (e) {
        console.error("[IA ROUTE] Error leyendo DB:", e)
        contextStr += "Error al cargar historial operativo de la base de datos.\n"
    }

    return contextStr
}

// ENDPOINT PARA DESCARGAR DOCUMENTOS CITADOS
iaRouter.get('/download', (req, res) => {
    const { file } = req.query
    if (!file) return res.status(400).json({ error: 'Archivo no especificado' })

    // Mapeo de archivos seguros para descarga
    let filePath = ''
    const fileNameMap: Record<string, string> = {
        'CUADRO DE PARAMETROS.xlsx': 'CUADRO_DE_PARAMETROS.xlsx'
    }

    const internalName = fileNameMap[file as string] || file as string
    filePath = path.join(BUNDLED_DATA_PATH, internalName)

    // Fallback development local
    if (!fs.existsSync(filePath) && file === 'CUADRO DE PARAMETROS.xlsx') {
        filePath = path.join(LOCAL_ISO_BASE, 'NC-11 Operaciones y Calidad\\Evidencias de Tratamiento de No conformidad\\OPAPTAR\\CARPETA\\CUADRO DE PARAMETROS.xlsx')
    }

    if (fs.existsSync(filePath)) {
        res.download(filePath, file as string) // Descargar con el nombre original bonito
    } else {
        res.status(404).json({ error: 'Archivo no encontrado en el servidor' })
    }
})

iaRouter.post('/chat', async (req, res) => {
    const { message } = req.body
    
    if (!IA_API_KEY) {
        console.error("[IA ROUTE] API Key no configurada")
        return res.status(500).json({ error: 'Configuración de IA (Qwen) no encontrada en .env' })
    }

    const currentDate = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    let context = ""
    try {
        console.log("[IA ROUTE] Cargando contexto completo...")
        context = await getFullPtapContext()
        console.log("[IA ROUTE] Contexto cargado (Longitud):", context.length)
    } catch (e: any) {
        console.error("[IA ROUTE] Error crítico cargando contexto:", e.message)
        return res.status(500).json({ error: 'Error al preparar el conocimiento técnico: ' + e.message })
    }

    // --- BÚSQUEDA DINÁMICA POR FECHA ---
    const dateMatch = message.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)
    if (dateMatch) {
        try {
            const day = dateMatch[1].padStart(2, '0')
            const month = dateMatch[2].padStart(2, '0')
            const year = dateMatch[3]
            const isoDate = `${year}-${month}-${day}`
            
            console.log("[IA ROUTE] Búsqueda por fecha detectada:", isoDate)
            const specificLogs = await dbAll('SELECT * FROM ptap_readings WHERE fecha = $1 ORDER BY hora ASC', isoDate)
            if (specificLogs.length > 0) {
                context += `\n--- REGISTROS ENCONTRADOS PARA EL DÍA ${isoDate} ---\n`
                context += JSON.stringify(specificLogs) + "\n"
            }
        } catch (e) {
             console.error("[IA ROUTE] Error en búsqueda dinámica:", e)
        }
    }

    try {
        console.log("[IA ROUTE] Contactando API Qwen...")
        const response = await fetch(IA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${IA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: IA_MODEL,
                messages: [
                    { 
                        role: 'system', 
                        content: `Eres el Ingeniero Asistente de Inteligencia Operativa de la PTAP Portachuelo (Semapach). 
                        FECHA ACTUAL: ${currentDate}
                        HORA ACTUAL: ${currentTime}

                        Tu objetivo es proporcionar asistencia técnica precisa basada en los manuales de calidad e ISO proporcionados.

                        CONOCIMIENTO TÉCNICO Y OPERATIVO:
                        ${context}

                        INSTRUCCIÓN DE EVIDENCIA: 
                        Si citas datos numéricos específicos, incluye un bloque [EVIDENCIA] al final.

                        REGLAS CRÍTICAS:
                        1. Utiliza un tono ejecutivo y formal.` 
                    },
                    { role: 'user', content: message }
                ],
                temperature: 0.1
            })
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error("[IA ROUTE] Error de API Qwen:", response.status, errorBody)
            throw new Error(`Error de API: ${response.status}`)
        }

        const data = await response.json()
        console.log("[IA ROUTE] Respuesta exitosa de Qwen")
        const answer = data.choices[0].message.content
        
        res.json({ 
            answer,
            sources: ["CUADRO DE PARAMETROS.xlsx"]
        })
    } catch (e: any) {
        console.error("[IA ROUTE] Error final en chat:", e.message)
        res.status(500).json({ error: 'Error procesando solicitud: ' + e.message })
    }
})

