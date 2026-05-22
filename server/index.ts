import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { initDb } from './database.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { assetsRouter } from './routes/assets.js'
import { catalogsRouter } from './routes/catalogs.js'
import { operatorsRouter } from './routes/operators.js'
import { dailyRecordsRouter } from './routes/dailyRecords.js'
import { failuresRouter } from './routes/failures.js'
import { preventiveRouter } from './routes/preventive.js'
import { diagnosisRouter } from './routes/diagnosis.js'
import { kpiRouter } from './routes/kpi.js'
import { waterRouter } from './routes/water.js'
import { stationsRouter } from './routes/stations.js'
import { authRouter } from './routes/auth.js'
import { iaRouter } from './routes/ia.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = Number(process.env.PORT) || 3001

async function main() {
    const app = express()
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }))
    app.use(cors())
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ limit: '10mb', extended: true }))

    // Rutas API
    app.use('/api/auth', authRouter)
    app.use('/api/assets', assetsRouter)
    app.use('/api/catalogs', catalogsRouter)
    app.use('/api/operators', operatorsRouter)
    app.use('/api/daily-records', dailyRecordsRouter)
    app.use('/api/failures', failuresRouter)
    app.use('/api/preventive', preventiveRouter)
    app.use('/api/diagnosis', diagnosisRouter)
    app.use('/api/kpi', kpiRouter)
    app.use('/api/water', waterRouter)
    app.use('/api/stations', stationsRouter)
    app.use('/api/ia', iaRouter)

    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', port: PORT })
    })

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('[ERROR]', err.stack || err.message || err)
        res.status(err.status || 500).json({
            error: err.message || 'Error interno del servidor',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        })
    })

    // Servir archivos estáticos del cliente en producción
    const distPath = path.join(__dirname, '..', 'dist')
    app.use(express.static(distPath))

    // Manejar rutas de React (SPA)
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'))
        }
    })

    // ESCUCHAR INMEDIATAMENTE PARA EVITAR TIMEOUT EN RAILWAY
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SERVER] ✅ API corriendo exitosamente en puerto ${PORT}`)

        // Inicializar BD en segundo plano o después de escuchar
        setTimeout(async () => {
            await initDb()
        }, 0)
    })
}

main().catch(err => {
    console.error('[FATAL] Error durante el inicio del servidor:', err)
    process.exit(1)
})
