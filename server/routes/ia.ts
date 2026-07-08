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

const IA_API_URL = process.env.IA_API_URL || process.env.QWEN_API_URL || '';
const IA_API_KEY = process.env.SEMAPACH_IA_KEY;
const IA_MODEL = process.env.IA_MODEL || process.env.QWEN_MODEL || 'deepseek-chat';

let contextCache: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 120_000; // 2 minutos

async function getCachedContext() {
    if (contextCache && Date.now() - contextCache.timestamp < CACHE_TTL) {
        return contextCache.data;
    }
    console.log("[IA] Recargando contexto completo...");
    const data = await getFullAppContext();
    contextCache = { data, timestamp: Date.now() };
    console.log("[IA] Contexto cargado:", data.length, "caracteres");
    return data;
}

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

    // === PRODUCCIÓN OPAPTAR ===
    ctx += await loadTable('produccion_bd', 'PRODUCCIÓN DIARIA OPAPTAR', 'fecha', 30)
    ctx += await loadTable('produccion_surtidor', 'DESPACHO AGUA SURTIDOR OPAPTAR', 'fecha', 30)
    ctx += await loadTable('produccion_rsanjuan', 'MONITOREO RÍO SAN JUAN OPAPTAR', 'id', 30)
    ctx += await loadTable('produccion_metas', 'METAS DE PRODUCCIÓN OPAPTAR', 'id', 50)

    ctx += await loadTable('users', 'USUARIOS', 'updated_at', 10)

    return ctx
}

function buildSystemPrompt(currentDate: string, currentTime: string, context: string, message: string) {
    return `Eres OPAPTARCITO, un asistente del sistema EPS SEMAPACH.
Hablas español claro y directo, como un compañero de trabajo explicando algo.

REGLAS ESTRICTAS:
- NO uses markdown: nada de **negritas**, *cursivas*, - listas, # titulos, > citas, ni ningun formato especial.
- NO uses asteriscos, guiones, corchetes, llaves, backticks, ni ningun simbolo de formato.
- NO muestres JSON, codigo, tablas con pipes, ni bloques de evidencia.
- SOLO texto plano, con puntos y comas. Como un mensaje de WhatsApp bien escrito.
- Si mencionas numeros, hacelo simple: "Hay 15 activos registrados".
- Si no sabes algo, decí: "No tengo ese dato ahora".

FECHA ACTUAL: ${currentDate}
HORA ACTUAL: ${currentTime}

DATOS DEL SISTEMA:
${context}

Responde en español, corto y al punto.`
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
    console.log("[IA] Chat request recibido:", message, "Body:", JSON.stringify(req.body))
    
    if (!message) {
        return res.status(400).json({ error: 'Mensaje requerido' })
    }

    try {
        const now = new Date()
        const currentDate = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const currentTime = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

        // Intentar fallback primero para preguntas simples (evita esperar contexto)
        const simpleQs = ['activo', 'falla', 'produccion', 'producción', 'opaptar', 'ph', 'cloro', 'portachuelo', 'turbiedad', 'vehiculo', 'vehículo', 'total', 'pz10']
        const isSimple = simpleQs.some(k => message && message.toLowerCase().includes(k))

        if (isSimple) {
            console.log("[IA] Consulta simple, usando fallback directo");
            return handleDatabaseFallback(message, "fallback directo", res);
        }

        if (!IA_API_KEY || !IA_API_URL) {
            return handleDatabaseFallback(message, !IA_API_KEY ? "API Key no configurada en .env" : "URL de API no configurada en .env", res);
        }

        // Cargar contexto cacheado
        let context = ""
        try {
            context = await getCachedContext()
        } catch (e: any) {
            console.error("[IA] Error cargando contexto:", e.message)
            return handleDatabaseFallback(message, "Error de contexto: " + e.message, res);
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        try {
            console.log("[IA] Contactando API...");
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
                    temperature: 0
                }),
                signal: controller.signal
            });

            clearTimeout(timeout)

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("[IA] Error de API:", response.status, errorBody);
                throw new Error(`Error de API: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            console.log("[IA] Respuesta exitosa");
            const answer = data.choices[0].message.content;
            
            return res.json({ answer, sources: ["Base de conocimiento SEMAPACH"] });
        } catch (e: any) {
            clearTimeout(timeout)
            console.warn("[IA] Falla en llamada a API. Iniciando fallback de base de datos. Razón:", e.message);
            return handleDatabaseFallback(message, e.message, res);
        }
    } catch (e: any) {
        console.error("[IA] Error fatal en chat:", e.message);
        if (!res.headersSent) return res.status(500).json({ error: e.message });
    }
});

// Función de respaldo para consultas de base de datos directa cuando la IA falla
async function handleDatabaseFallback(message: string, reason: string, res: any) {
    let answer = '';
    console.log("[IA FALLBACK] Consultando DB para:", message, "| Razón:", reason);
    
    try {
        const q = message.toLowerCase();
        if (q.includes('pz10') || q.includes('produccion') || q.includes('producción') || q.includes('opaptar')) {
            const rows = await dbAll("SELECT * FROM produccion_bd ORDER BY fecha DESC LIMIT 3");
            if (rows.length > 0) {
                const parts: string[] = ['Estos son los últimos registros de produccion:'];
                rows.forEach((r: any) => {
                    const f = r.fecha ? new Date(r.fecha).toLocaleDateString('es-PE') : `${r.dia}/${r.mes}/2026`;
                    parts.push(`${f}: caudal ${r.pz10_caudal} L/s, ${r.pz10_horas} horas, volumen ${r.pz10_m3} m3`);
                });
                answer = parts.join('. ');
            } else {
                answer = 'No tengo registros de producción disponibles.';
            }
        } else if (q.includes('activo') || q.includes('vehiculo') || q.includes('vehículo') || q.includes('flota') || q.includes('total')) {
            const total = await dbGet("SELECT COUNT(*) as total FROM assets");
            const estados = await dbAll("SELECT estado, COUNT(*) as count FROM assets GROUP BY estado");
            const parts: string[] = [`Hay ${total?.total || 0} activos registrados`];
            estados.forEach((s: any) => {
                parts.push(`${s.estado || 'sin estado'}: ${s.count} activos`);
            });
            answer = parts.join('. ');
        } else if (q.includes('ph') || q.includes('cloro') || q.includes('portachuelo') || q.includes('turbiedad')) {
            const rows = await dbAll("SELECT * FROM ptap_readings ORDER BY fecha DESC, hora DESC LIMIT 2");
            if (rows.length > 0) {
                const parts: string[] = ['Ultimas lecturas de PTAP Portachuelo:'];
                rows.forEach((r: any) => {
                    parts.push(`${r.fecha} ${r.hora}: turbiedad ${r.tratada_turbiedad} NTU, cloro ${r.tratada_cloro} mg/L, pH ${r.tratada_ph}`);
                });
                answer = parts.join('. ');
            } else {
                answer = 'No hay lecturas de PTAP registradas.';
            }
        } else {
            const a = await dbGet("SELECT COUNT(*) as total FROM assets");
            const f = await dbGet("SELECT COUNT(*) as total FROM failures");
            answer = `En el sistema hay ${a?.total || 0} activos y ${f?.total || 0} fallas registradas.`;
        }
        console.log("[IA FALLBACK] Respuesta lista:", answer?.substring(0, 100));
        if (!res.headersSent) return res.json({ answer, sources: [] });
    } catch (dbErr: any) {
        console.error("[IA FALLBACK] Error en DB:", dbErr.message);
        if (!res.headersSent) return res.status(500).json({ error: `Error al consultar: ${dbErr.message}` });
    }
}

