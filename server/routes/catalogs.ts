import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const catalogsRouter = Router()

catalogsRouter.get('/', async (req, res) => {
    const { tipo } = req.query
    if (tipo) {
        res.json(await dbAll('SELECT * FROM catalogs WHERE tipo = ? AND activo = 1 ORDER BY valor', String(tipo)))
    } else {
        res.json(await dbAll('SELECT * FROM catalogs WHERE activo = 1 ORDER BY tipo, valor'))
    }
})

catalogsRouter.get('/tipos', async (_req, res) => {
    const rows = await dbAll('SELECT DISTINCT tipo FROM catalogs ORDER BY tipo')
    res.json(rows.map((r: any) => r.tipo))
})

catalogsRouter.post('/', async (req, res) => {
    const { tipo, valor } = req.body
    try {
        const result = await dbRun('INSERT INTO catalogs (tipo, valor) VALUES (?, ?) RETURNING id', tipo, valor)
        const created = await dbGet('SELECT * FROM catalogs WHERE id = ?', result.lastInsertRowid)
        res.status(201).json(created)
    } catch (e: any) {
        if (e.message?.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Este valor ya existe en el catálogo' })
        }
        throw e
    }
})

catalogsRouter.delete('/:id', async (req, res) => {
    await dbRun('UPDATE catalogs SET activo = 0 WHERE id = ?', Number(req.params.id))
    res.json({ ok: true })
})
