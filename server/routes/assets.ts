import { Router } from 'express'
import { validateAsset } from '../validators.js'
import { listAssets, getAsset, createAsset, updateAsset, deactivateAsset } from '../services/assetService.js'

export const assetsRouter = Router()

assetsRouter.get('/', async (req, res) => {
    try {
        const { tipo_unidad, estado, criticidad, buscar, categoria, incluir_inactivos } = req.query
        const result = await listAssets({
            tipo_unidad: tipo_unidad as string,
            estado: estado as string,
            criticidad: criticidad as string,
            buscar: buscar as string,
            categoria: categoria as string,
            incluir_inactivos: incluir_inactivos as string,
        })
        res.json(result)
    } catch (err: any) {
        console.error('[ASSETS] Error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

assetsRouter.get('/:id', async (req, res) => {
    try {
        const row = await getAsset(Number(req.params.id))
        if (!row) return res.status(404).json({ error: 'Activo no encontrado' })
        res.json(row)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

assetsRouter.post('/', validateAsset, async (req, res) => {
    try {
        const created = await createAsset(req.body)
        res.status(201).json(created)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

assetsRouter.put('/:id', async (req, res) => {
    try {
        const updated = await updateAsset(Number(req.params.id), req.body)
        res.json(updated)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

assetsRouter.delete('/:id', async (req, res) => {
    try {
        await deactivateAsset(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})
