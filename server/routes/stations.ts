import { Router } from 'express'
import { validateStation } from '../validators.js'
import {
    listStations, getStation, createStation, updateStation, deactivateStation,
    getStationEquipment, getStationMaintenanceHistory,
    addStationEquipment, updateStationEquipment, deactivateStationEquipment,
    addStationMaintenance, deleteStationMaintenance,
    addStationRecord, getStationMaintenance, getStationRecords,
} from '../services/stationService.js'

export const stationsRouter = Router()

stationsRouter.get('/', async (req, res) => {
    try {
        const { tipo, zona, distrito, estado, buscar, incluir_inactivos } = req.query as Record<string, string | undefined>
        res.json(await listStations({ tipo, zona, distrito, estado, buscar, incluir_inactivos }))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.get('/:id', async (req, res) => {
    try {
        const row = await getStation(Number(req.params.id))
        if (!row) return res.status(404).json({ error: 'Estación no encontrada' })
        res.json(row)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.get('/:id/equipment', async (req, res) => {
    try {
        res.json(await getStationEquipment(Number(req.params.id)))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.get('/:id/maintenance-history', async (req, res) => {
    try {
        res.json(await getStationMaintenanceHistory(Number(req.params.id)))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.post('/', validateStation, async (req, res) => {
    try {
        res.status(201).json(await createStation(req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.put('/:id', async (req, res) => {
    try {
        res.json(await updateStation(Number(req.params.id), req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.delete('/:id', async (req, res) => {
    try {
        await deactivateStation(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.post('/:id/equipment', async (req, res) => {
    try {
        res.status(201).json(await addStationEquipment(Number(req.params.id), req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.put('/equipment/:id', async (req, res) => {
    try {
        await updateStationEquipment(Number(req.params.id), req.body)
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.delete('/equipment/:id', async (req, res) => {
    try {
        await deactivateStationEquipment(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.post('/:id/maintenance', async (req, res) => {
    try {
        res.status(201).json(await addStationMaintenance(Number(req.params.id), req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.delete('/maintenance/:id', async (req, res) => {
    try {
        await deleteStationMaintenance(Number(req.params.id))
        res.json({ ok: true })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.post('/:id/records', async (req, res) => {
    try {
        res.status(201).json(await addStationRecord(Number(req.params.id), req.body))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.get('/:id/maintenance', async (req, res) => {
    try {
        res.json(await getStationMaintenance(Number(req.params.id)))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.get('/:id/records', async (req, res) => {
    try {
        res.json(await getStationRecords(Number(req.params.id)))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

// Plan 2026
stationsRouter.get('/plan-2026/activities', async (_req, res) => {
    try {
        const { dbAll } = await import('../database.js')
        res.json(await dbAll('SELECT * FROM maintenance_activities WHERE activo = 1 ORDER BY codigo'))
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

stationsRouter.get('/plan-2026/summary', async (_req, res) => {
    try {
        const { dbAll } = await import('../database.js')
        const activities = await dbAll('SELECT * FROM maintenance_activities WHERE activo = 1 ORDER BY codigo')
        const summary = {
            total: activities.reduce((s: number, a: any) => s + Number(a.presupuesto_anual), 0),
            t1: activities.reduce((s: number, a: any) => s + Number(a.presupuesto_t1), 0),
            t2: activities.reduce((s: number, a: any) => s + Number(a.presupuesto_t2), 0),
            t3: activities.reduce((s: number, a: any) => s + Number(a.presupuesto_t3), 0),
            t4: activities.reduce((s: number, a: any) => s + Number(a.presupuesto_t4), 0),
            activities,
        }
        res.json(summary)
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})
