import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const assetsRouter = Router()

assetsRouter.get('/', async (req, res) => {
    const { tipo_unidad, estado, criticidad, buscar, categoria, incluir_inactivos } = req.query

    let sql = 'SELECT * FROM assets WHERE 1=1'
    const params: any[] = []

    console.log('[ASSETS] Query params:', req.query)

    if (!incluir_inactivos) { sql += ' AND activo = 1' }
    if (categoria) { sql += ' AND categoria = ?'; params.push(categoria) }
    if (tipo_unidad) { sql += ' AND tipo_unidad = ?'; params.push(tipo_unidad) }
    if (estado) { sql += ' AND estado = ?'; params.push(estado) }
    if (criticidad) { sql += ' AND criticidad = ?'; params.push(criticidad) }
    if (buscar) {
        sql += ' AND (codigo_patrimonial LIKE ? OR placa_principal LIKE ? OR tipo_unidad LIKE ? OR marca LIKE ? OR modelo LIKE ?)'
        const term = `%${buscar}%`
        params.push(term, term, term, term, term)
    }
    sql += ' ORDER BY codigo_patrimonial ASC'

    try {
        const result = await dbAll(sql, ...params)
        console.log('[ASSETS] Found:', result.length, 'assets')
        res.json(result)
    } catch (err: any) {
        console.error('[ASSETS] Error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

assetsRouter.get('/:id', async (req, res) => {
    const row = await dbGet('SELECT * FROM assets WHERE id = ?', Number(req.params.id))
    if (!row) return res.status(404).json({ error: 'Activo no encontrado' })
    res.json(row)
})

assetsRouter.post('/', async (req, res) => {
    const a = req.body
    const result = await dbRun(`
  INSERT INTO assets (codigo_patrimonial, tipo_unidad, categoria, station_id, fuente, placa_principal, placa_secundaria,
      anio_fabricacion, estado, criticidad, forma_control, km_actual, horometro_actual,
      marca, modelo, serie, potencia_hp, potencia_kw, voltaje, tension, especificaciones_tecnicas,
      observaciones, calidad_dato_inicial, horas_programadas_estandar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        a.codigo_patrimonial, a.tipo_unidad, a.categoria || 'fleet', a.station_id || null, a.fuente || '', a.placa_principal || '',
        a.placa_secundaria || '', a.anio_fabricacion, a.estado || 'Operativo',
        a.criticidad || 'Media', a.forma_control || 'Kilometraje',
        a.km_actual || 0, a.horometro_actual || 0,
        a.marca || '', a.modelo || '', a.serie || '', a.potencia_hp || 0, a.potencia_kw || 0, a.voltaje || '', a.tension || '', a.especificaciones_tecnicas || '',
        a.observaciones || '', a.calidad_dato_inicial || 'no disponible', a.horas_programadas_estandar || 8
    )
    const created = await dbGet('SELECT * FROM assets WHERE id = ?', result.lastInsertRowid)
    res.status(201).json(created)
})

assetsRouter.put('/:id', async (req, res) => {
    const a = req.body
    await dbRun(`
    UPDATE assets SET
      codigo_patrimonial = ?, tipo_unidad = ?, categoria = ?, station_id = ?, fuente = ?, placa_principal = ?,
      placa_secundaria = ?, anio_fabricacion = ?, estado = ?, criticidad = ?,
      forma_control = ?, km_actual = ?, horometro_actual = ?, 
      marca = ?, modelo = ?, serie = ?, potencia_hp = ?, potencia_kw = ?, voltaje = ?, tension = ?, especificaciones_tecnicas = ?,
      observaciones = ?, calidad_dato_inicial = ?, horas_programadas_estandar = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
        a.codigo_patrimonial, a.tipo_unidad, a.categoria, a.station_id || null, a.fuente || '', a.placa_principal || '',
        a.placa_secundaria || '', a.anio_fabricacion, a.estado, a.criticidad,
        a.forma_control, a.km_actual, a.horometro_actual,
        a.marca || '', a.modelo || '', a.serie || '', a.potencia_hp || 0, a.potencia_kw || 0, a.voltaje || '', a.tension || '', a.especificaciones_tecnicas || '',
        a.observaciones || '', a.calidad_dato_inicial || 'no disponible', a.horas_programadas_estandar || 8, Number(req.params.id)
    )
    const updated = await dbGet('SELECT * FROM assets WHERE id = ?', Number(req.params.id))
    res.json(updated)
})

assetsRouter.delete('/:id', async (req, res) => {
    await dbRun("UPDATE assets SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", Number(req.params.id))
    res.json({ ok: true })
})
