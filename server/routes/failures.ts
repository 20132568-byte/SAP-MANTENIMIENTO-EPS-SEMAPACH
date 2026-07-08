import { Router } from 'express'
import { validateFailure } from '../validators.js'
import { listFailures, createFailure, updateFailure, deleteFailure } from '../services/failureService.js'

export const failuresRouter = Router()

failuresRouter.get('/', async (req, res) => {
    try {
        const { asset_id, desde, hasta, solo_correctivas, categoria } = req.query
        const result = await listFailures({
            asset_id: asset_id as string,
            desde: desde as string,
            hasta: hasta as string,
            solo_correctivas: solo_correctivas as string,
            categoria: categoria as string,
        })
        res.json(result)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

function sanitizeFailureBody(req: any, res: any, next: any) {
    const numericKeys = [
        'asset_id', 'operador_id', 'costo_reparacion', 'duracion_horas'
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

failuresRouter.post('/', sanitizeFailureBody, validateFailure, async (req, res) => {
    try {
        const created = await createFailure(req.body)
        res.status(201).json(created)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

failuresRouter.put('/:id', sanitizeFailureBody, async (req, res) => {
    try {
        await updateFailure(Number(req.params.id), req.body)
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

failuresRouter.delete('/:id', async (req, res) => {
    try {
        await deleteFailure(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})
