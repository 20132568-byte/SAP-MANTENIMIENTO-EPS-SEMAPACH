import { Router } from 'express'
import {
    listPreventiveEvents, createPreventiveEvent, updatePreventiveEvent, deletePreventiveEvent,
    getPreventiveConfig, createPreventiveConfig, updatePreventiveConfig,
    deletePreventiveConfig, getPreventiveBacklog,
} from '../services/preventiveService.js'

export const preventiveRouter = Router()

preventiveRouter.get('/events', async (req, res) => {
    try {
        const { asset_id, categoria } = req.query
        res.json(await listPreventiveEvents({ asset_id: asset_id as string, categoria: categoria as string }))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.post('/events', async (req, res) => {
    try {
        res.status(201).json(await createPreventiveEvent(req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.put('/events/:id', async (req, res) => {
    try {
        await updatePreventiveEvent(Number(req.params.id), req.body)
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.delete('/events/:id', async (req, res) => {
    try {
        await deletePreventiveEvent(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.get('/config', async (_req, res) => {
    try {
        res.json(await getPreventiveConfig())
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.post('/config', async (req, res) => {
    try {
        res.status(201).json(await createPreventiveConfig(req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.put('/config/:id', async (req, res) => {
    try {
        await updatePreventiveConfig(Number(req.params.id), req.body)
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.delete('/config/:id', async (req, res) => {
    try {
        await deletePreventiveConfig(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

preventiveRouter.get('/backlog', async (req, res) => {
    try {
        const { asset_id, categoria } = req.query
        res.json(await getPreventiveBacklog({ asset_id: asset_id as string, categoria: categoria as string }))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})
