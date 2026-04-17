import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const operatorsRouter = Router()

operatorsRouter.get('/', async (_req, res) => {
    res.json(await dbAll('SELECT * FROM operators WHERE activo = 1 ORDER BY nombre'))
})

operatorsRouter.post('/', async (req, res) => {
    const { nombre, area, observaciones } = req.body
    const result = await dbRun('INSERT INTO operators (nombre, area, observaciones) VALUES (?, ?, ?) RETURNING id',
        nombre, area || '', observaciones || '')
    const created = await dbGet('SELECT * FROM operators WHERE id = ?', result.lastInsertRowid)
    res.status(201).json(created)
})

operatorsRouter.put('/:id', async (req, res) => {
    const { nombre, area, observaciones } = req.body
    await dbRun('UPDATE operators SET nombre = ?, area = ?, observaciones = ? WHERE id = ?',
        nombre, area || '', observaciones || '', Number(req.params.id))
    const updated = await dbGet('SELECT * FROM operators WHERE id = ?', Number(req.params.id))
    res.json(updated)
})

operatorsRouter.delete('/:id', async (req, res) => {
    await dbRun('UPDATE operators SET activo = 0 WHERE id = ?', Number(req.params.id))
    res.json({ ok: true })
})
