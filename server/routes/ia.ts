import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'

export const iaRouter = Router()

// Endpoint para el modelo DeepSeek (OpenAI compatible) - PROVEEDOR DE PAGO ACTUAL
const IA_API_URL = 'https://api.deepseek.com/chat/completions';
const IA_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-981077b763504a0aaecfe6ce07dc8882';
const IA_MODEL = 'deepseek-chat';

// Respaldo: Qwen (Alibaba Singapur)
// const IA_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
// const IA_API_KEY = process.env.QWEN_API_KEY || 'sk-f98cb9d1e7354d41ae811a83983c862b';
// const IA_MODEL = 'qwen3.5-plus';

/** 
 * Función para cargar conocimiento local (Excel) 
 * En una implementación RAG completa aquí se usarían embeddings y búsqueda vectorial,
 * pero para esta iteración cargamos la data técnica clave del Excel de la unidad D.
 */
function getLocalContext() {
    try {
        const filePath = 'D:\\ISO CALIDAD PORTACHUELO\\NC-11 Operaciones y Calidad\\Evidencias de Tratamiento de No conformidad\\OPAPTAR\\CARPETA\\CUADRO DE PARAMETROS.xlsx'
        if (fs.existsSync(filePath)) {
            const workbook = XLSX.readFile(filePath)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json(sheet)
            // Tomamos una muestra significativa de los parámetros técnicos para el contexto
            return JSON.stringify(data.slice(0, 30)) 
        }
    } catch (e) {
        console.error("[IA ROUTE] Error leyendo contexto local:", e)
    }
    return "No se pudo cargar el contexto técnico de drive D:/."
}

iaRouter.post('/chat', async (req, res) => {
    const { message } = req.body
    
    if (!QWEN_API_KEY) {
        console.error("[IA ROUTE] API Key no configurada")
        return res.status(500).json({ error: 'Configuración de IA no encontrada' })
    }

    const context = getLocalContext()
    
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
                        content: `Eres el Asistente de Inteligencia Operativa de la PTAP Portachuelo. 
                        Tu misión es ayudar a los operadores con dudas sobre parámetros técnicos e ISO.
                        Contexto extraído del manual de parámetros: ${context}
                        Responde de forma ejecutiva, formal y técnica. Si el usuario pregunta por algo que no está en el contexto, 
                        puedes usar tu conocimiento general pero prioriza siempre los estándares de la PTAP Portachuelo.` 
                    },
                    { role: 'user', content: message }
                ],
                temperature: 0.3
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
