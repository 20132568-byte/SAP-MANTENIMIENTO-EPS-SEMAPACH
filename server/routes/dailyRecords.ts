import { Router } from 'express'
import { validateDailyRecord } from '../validators.js'
import { listDailyRecords, createDailyRecord, updateDailyRecord, deleteDailyRecord } from '../services/dailyRecordService.js'

export const dailyRecordsRouter = Router()

dailyRecordsRouter.get('/', async (req, res) => {
    try {
        const { fecha, asset_id, desde, hasta, categoria } = req.query
        const records = await listDailyRecords({
            fecha: fecha as string,
            asset_id: asset_id as string,
            desde: desde as string,
            hasta: hasta as string,
            categoria: categoria as string,
        })
        res.json(records)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

function sanitizeDailyRecordBody(req: any, res: any, next: any) {
    const numericKeys = [
        'asset_id', 'operador_id', 'km_inicial', 'km_final', 
        'horometro_inicial', 'horometro_final', 'horas_programadas', 
        'horas_reales', 'horas_parada'
    ]
    for (const key of numericKeys) {
        if (req.body[key] === '' || req.body[key] === undefined || req.body[key] === 'null') {
            req.body[key] = null
        } else if (req.body[key] !== null) {
            req.body[key] = Number(req.body[key])
        }
    }
    next()
}

dailyRecordsRouter.post('/', sanitizeDailyRecordBody, validateDailyRecord, async (req, res) => {
    try {
        const created = await createDailyRecord(req.body)
        res.status(201).json(created)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

dailyRecordsRouter.put('/:id', sanitizeDailyRecordBody, async (req, res) => {
    try {
        await updateDailyRecord(Number(req.params.id), req.body)
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

dailyRecordsRouter.delete('/:id', async (req, res) => {
    try {
        await deleteDailyRecord(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})
