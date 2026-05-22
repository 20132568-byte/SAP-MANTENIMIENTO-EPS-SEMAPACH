import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { dbAll, dbGet } from '../database.js'
import XLSX from 'xlsx'

import { fileURLToPath } from 'url'

export const iaRouter = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BUNDLED_DATA_PATH = path.join(__dirname, '..', 'data')
const LOCAL_ISO_BASE = 'D:\\ISO CALIDAD PORTACHUELO'

const IA_API_URL = process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const IA_API_KEY = process.env.SEMAPACH_IA_KEY;
const IA_MODEL = process.env.QWEN_MODEL || 'qwen-plus';

async function loadExcelContext() {
    let contextStr = ""
    try {
        let filePath = path.join(BUNDLED_DATA_PATH, 'CUADRO_DE_PARAMETROS.xlsx')
        if (!fs.existsSync(filePath)) {
            filePath = path.join(LOCAL_ISO_BASE, 'NC-11 Operaciones y Calidad\\Evidencias de Tratamiento de No conformidad\\OPAPTAR\\CARPETA\\CUADRO DE PARAMETROS.xlsx')
        }
        if (fs.existsSync(filePath)) {
            const workbook = XLSX.readFile(filePath)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(sheet)
            contextStr += "--- MANUAL TÉCNICO Y PARÁMETROS ISO ---\n"
            contextStr += JSON.stringify(data.slice(0, 100)) + "\n\n"
        }
    } catch (e) {
        console.error("[IA] Error leyendo Excel:", e)
    }
    return contextStr
}

async function loadTable(table: string, label: string, orderBy: string, limit = 30) {
    let str = ""
    try {
        const rows = await dbAll(`SELECT * FROM ${table} ORDER BY ${orderBy} DESC LIMIT ${limit}`)
        if (rows.length > 0) {
            str += `--- ${label} (últimos ${rows.length}) ---\n`
            str += JSON.stringify(rows) + "\n"
        }
    } catch (e: any) {
        console.warn(`[IA] Tabla ${table} no disponible:`, e.message)
    }
    return str
}

async function getFullAppContext() {
    let ctx = ""

    ctx += await loadExcelContext()

    ctx += await loadTable('assets', 'MAESTRO DE ACTIVOS', 'updated_at')
    ctx += await loadTable('failures', 'REGISTRO DE FALLAS', 'created_at')
    ctx += await loadTable('daily_records', 'OPERACIÓN DIARIA', 'created_at')
    ctx += await loadTable('preventive_config', 'CONFIGURACIÓN DE PREVENTIVOS', 'updated_at')
    ctx += await loadTable('preventive_events', 'EVENTOS PREVENTIVOS', 'event_date')
    ctx += await loadTable('ptap_readings', 'LECTURAS PTAP PORTACHUELO', 'fecha', 30)
    ctx += await loadTable('water_stations', 'ESTACIONES HÍDRICAS', 'updated_at')
    ctx += await loadTable('station_equipment', 'EQUIPOS DE ESTACIONES', 'updated_at')
    ctx += await loadTable('maintenance_activities', 'ACTIVIDADES DE MANTENIMIENTO', 'updated_at')
    ctx += await loadTable('station_maintenance_log', 'BITÁCORA DE MANTENIMIENTO ESTACIONES', 'maintenance_date')
    ctx += await loadTable('maintenance_records', 'REGISTROS DE MANTENIMIENTO', 'created_at')
    ctx += await loadTable('initial_diagnosis', 'DIAGNÓSTICOS INICIALES', 'created_at')
    ctx += await loadTable('operators', 'OPERADORES', 'updated_at')
    ctx += await loadTable('catalogs', 'CATÁLOGOS', 'updated_at')
    ctx += await loadTable('weekly_snapshots', 'SNAPSHOTS SEMANALES', 'created_at')

    ctx += await loadTable('users', 'USUARIOS', 'updated_at', 10)

    return ctx
}

function buildSystemPrompt(currentDate: string, currentTime: string, context: string, message: string) {
    const dateDetected = message.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)

    return `Eres el Asistente de Inteligencia Operativa del sistema EPS SEMAPACH.

FECHA ACTUAL: ${currentDate}
HORA ACTUAL: ${currentTime}

GESTIÓN DE MANTENIMIENTO:
Gestionas toda la información operativa de la empresa EPS SEMAPACH, incluyendo activos, fallas, operación diaria, mantenimiento preventivo y correctivo, estaciones hídricas, PTAP Portachuelo, y más.

DATOS DEL SISTEMA:
${context}

FUNCIONALIDADES DISPONIBLES:
- Dashboard gerencial y operativo
- Maestro de activos (flota y estaciones)
- Diagnóstico inicial de activos
- Operación diaria con registro de parámetros
- Registro de fallas y soluciones
- Planes de mantenimiento preventivo
- Órdenes de trabajo
- APM (salud del activo)
- Control hídrico y monitoreo de agua
- PTAP Portachuelo (control fisicoquímico, dosificación, cronogramas)
- Estaciones hídricas con equipos críticos${dateDetected ? `\n\nATENCIÓN: El usuario preguntó sobre una fecha específica. Incluye datos de esa fecha si están disponibles.` : ''}

INSTRUCCIONES:
1. Responde de forma clara, ejecutiva y en español.
2. Si citas números específicos, incluye un bloque [EVIDENCIA] al final con los datos exactos.
3. Si no sabes la respuesta, dilo honestamente.
4. Da contexto sobre qué módulo del sistema contiene la información que mencionas.`
}

iaRouter.get('/download', (req, res) => {
    const { file } = req.query
    if (!file) return res.status(400).json({ error: 'Archivo no especificado' })

    const fileNameMap: Record<string, string> = {
        'CUADRO DE PARAMETROS.xlsx': 'CUADRO_DE_PARAMETROS.xlsx'
    }

    const internalName = fileNameMap[file as string] || file as string
    const filePath = path.resolve(BUNDLED_DATA_PATH, internalName)

    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${file}"`)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.sendFile(filePath)
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' })
    }
})

iaRouter.post('/chat', async (req, res) => {
    const { message } = req.body
    
    if (!IA_API_KEY) {
        console.error("[IA] API Key no configurada")
        return res.status(500).json({ error: 'Configuración de IA no encontrada en .env' })
    }

    const now = new Date()
    const currentDate = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const currentTime = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

    let context = ""
    try {
        console.log("[IA] Cargando contexto completo de la aplicación...")
        context = await getFullAppContext()
        console.log("[IA] Contexto cargado:", context.length, "caracteres")
    } catch (e: any) {
        console.error("[IA] Error cargando contexto:", e.message)
        return res.status(500).json({ error: 'Error al preparar el contexto: ' + e.message })
    }

    try {
        console.log("[IA] Contactando API Qwen...")
        const response = await fetch(IA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${IA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: IA_MODEL,
                messages: [
                    { role: 'system', content: buildSystemPrompt(currentDate, currentTime, context, message) },
                    { role: 'user', content: message }
                ],
                temperature: 0.1
            })
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error("[IA] Error de API Qwen:", response.status, errorBody)
            throw new Error(`Error de API: ${response.status}`)
        }

        const data = await response.json()
        console.log("[IA] Respuesta exitosa de Qwen")
        const answer = data.choices[0].message.content
        
        res.json({ answer, sources: ["Base de conocimiento SEMAPACH"] })
    } catch (e: any) {
        console.error("[IA] Error final:", e.message)
        res.status(500).json({ error: 'Error procesando solicitud: ' + e.message })
    }
})

