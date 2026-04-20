import { Router } from 'express'
import fs from 'fs'
import { dbAll } from '../database.js'
import XLSX from 'xlsx'

export const iaRouter = Router()

// Proveedor: Qwen (Alibaba)
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
        const filePath = 'D:\\ISO CALIDAD PORTACHUELO\\NC-11 Operaciones y Calidad\\Evidencias de Tratamiento de No conformidad\\OPAPTAR\\CARPETA\\CUADRO DE PARAMETROS.xlsx'
        if (fs.existsSync(filePath)) {
            const workbook = XLSX.readFile(filePath)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(sheet)
            // Ya no limitamos a 30, incluimos l Manual Completo para precisión ISO
            contextStr += "--- MANUAL TÉCNICO Y PARÁMETROS ISO ---\n"
            contextStr += JSON.stringify(data) + "\n\n"
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

iaRouter.post('/chat', async (req, res) => {
    const { message } = req.body
    
    if (!IA_API_KEY) {
        console.error("[IA ROUTE] API Key no configurada")
        return res.status(500).json({ error: 'Configuración de IA (Qwen) no encontrada en .env' })
    }

    const context = await getFullPtapContext()
    
    const currentDate = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    let context = await getFullPtapContext()

    // --- BÚSQUEDA DINÁMICA POR FECHA ---
    // Si el usuario menciona una fecha, buscamos datos específicos de ese día
    const dateMatch = message.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)
    if (dateMatch) {
        try {
            const day = dateMatch[1].padStart(2, '0')
            const month = dateMatch[2].padStart(2, '0')
            const year = dateMatch[3]
            const isoDate = `${year}-${month}-${day}`
            
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

                        Tu objetivo es proporcionar asistencia técnica precisa basada en los manuales de calidad e ISO del Drive D:/.

                        REGLAS CRÍTICAS:
                        1. Estamos en el año 2026. Si el usuario pregunta por una fecha pasada (como enero 2026) y los datos están en el contexto, REPÓRTALOS.
                        2. Si los datos específicos de una fecha te han sido proporcionados en el contexto (bajo el título "REGISTROS ENCONTRADOS"), úsalos para responder.
                        3. Utiliza un tono ejecutivo, técnico y extremadamente formal.` 
                    },
                    { role: 'user', content: message }
                ],
                temperature: 0.2
            })
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Error de API Qwen: ${response.status} - ${errorBody}`)
        }

        const data = await response.json()
        const answer = data.choices[0].message.content
        
        res.json({ 
            answer,
            sources: ["CUADRO DE PARAMETROS.xlsx", "Drive D:/ISO CALIDAD PORTACHUELO"]
        })
    } catch (e: any) {
        console.error("[IA ROUTE] Error en chat IA:", e.message)
        res.status(500).json({ error: 'Error procesando la solicitud de IA: ' + e.message })
    }
})
