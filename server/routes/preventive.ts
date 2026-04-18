import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const preventiveRouter = Router()

preventiveRouter.get('/events', async (req, res) => {
    const { asset_id, categoria } = req.query
    let sql = `
    SELECT pe.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo
    FROM preventive_events pe LEFT JOIN assets a ON pe.asset_id = a.id WHERE 1=1
  `
    const params: any[] = []
    if (asset_id) { sql += ' AND pe.asset_id = ?'; params.push(Number(asset_id)) }
    if (categoria) { sql += ' AND a.categoria = ?'; params.push(categoria) }
    sql += ' ORDER BY pe.fecha_mantenimiento DESC'
    res.json(await dbAll(sql, ...params))
})

preventiveRouter.post('/events', async (req, res) => {
    const p = req.body
    const siguienteObjetivo = (p.lectura_al_momento || 0) + (p.intervalo || 0)
    const result = await dbRun(`
    INSERT INTO preventive_events (asset_id, tipo_preventivo, fecha_mantenimiento,
      lectura_al_momento, intervalo, unidad_control, siguiente_objetivo, estado, costo, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        p.asset_id, p.tipo_preventivo || '', p.fecha_mantenimiento,
        p.lectura_al_momento || 0, p.intervalo || 0, p.unidad_control || 'km',
        siguienteObjetivo, p.estado || 'Ejecutado', p.costo, p.observaciones || ''
    )
    res.status(201).json(await dbGet('SELECT * FROM preventive_events WHERE id = ?', result.lastInsertRowid))
})

preventiveRouter.put('/events/:id', async (req, res) => {
    const p = req.body
    const siguienteObjetivo = (p.lectura_al_momento || 0) + (p.intervalo || 0)
    await dbRun(`
    UPDATE preventive_events SET asset_id = ?, tipo_preventivo = ?, fecha_mantenimiento = ?,
      lectura_al_momento = ?, intervalo = ?, unidad_control = ?, siguiente_objetivo = ?, estado = ?, costo = ?, observaciones = ?
    WHERE id = ?`,
        p.asset_id, p.tipo_preventivo || '', p.fecha_mantenimiento,
        p.lectura_al_momento || 0, p.intervalo || 0, p.unidad_control || 'km',
        siguienteObjetivo, p.estado || 'Ejecutado', p.costo, p.observaciones || '',
        Number(req.params.id)
    )
    res.json({ ok: true })
})

preventiveRouter.get('/config', async (_req, res) => {
    res.json(await dbAll('SELECT * FROM preventive_config ORDER BY tipo_unidad, tipo_preventivo'))
})

preventiveRouter.post('/config', async (req, res) => {
    const c = req.body
    const result = await dbRun(`
    INSERT INTO preventive_config (asset_id, tipo_unidad, tipo_preventivo, intervalo,
      unidad_control, criterio_alerta_temprana, criterio_alerta_critica)
    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        c.asset_id, c.tipo_unidad, c.tipo_preventivo, c.intervalo,
        c.unidad_control || 'km', c.criterio_alerta_temprana || 90, c.criterio_alerta_critica || 95
    )
    res.status(201).json(await dbGet('SELECT * FROM preventive_config WHERE id = ?', result.lastInsertRowid))
})

preventiveRouter.put('/config/:id', async (req, res) => {
    const c = req.body
    await dbRun(`
    UPDATE preventive_config SET asset_id = ?, tipo_unidad = ?, tipo_preventivo = ?,
      intervalo = ?, unidad_control = ?, criterio_alerta_temprana = ?, criterio_alerta_critica = ?
    WHERE id = ?`,
        c.asset_id, c.tipo_unidad, c.tipo_preventivo, c.intervalo,
        c.unidad_control, c.criterio_alerta_temprana, c.criterio_alerta_critica, Number(req.params.id)
    )
    res.json({ ok: true })
})

preventiveRouter.delete('/config/:id', async (req, res) => {
    await dbRun('DELETE FROM preventive_config WHERE id = ?', Number(req.params.id))
    res.json({ ok: true })
})

preventiveRouter.delete('/events/:id', async (req, res) => {
    await dbRun('DELETE FROM preventive_events WHERE id = ?', Number(req.params.id))
    res.json({ ok: true })
})

preventiveRouter.get('/backlog', async (req, res) => {
    const { categoria } = req.query
    let assetsSql = 'SELECT * FROM assets WHERE activo = 1'
    const assetsParams: any[] = []
    if (categoria) {
        assetsSql += ' AND categoria = ?'
        assetsParams.push(categoria)
    }

    const [assets, configs] = await Promise.all([
        dbAll(assetsSql, ...assetsParams),
        dbAll('SELECT * FROM preventive_config')
    ])
    
    const backlog: any[] = []

    for (const asset of assets as any[]) {
        const config = (configs as any[]).find((c: any) => c.asset_id === asset.id)
            || (configs as any[]).find((c: any) => c.tipo_unidad === asset.tipo_unidad)

        if (!config) {
            backlog.push({
                asset_id: asset.id, asset_codigo: asset.codigo_patrimonial,
                asset_tipo: asset.tipo_unidad, estado_preventivo: 'Sin dato confiable',
                progreso: 0, lectura_actual: asset.forma_control === 'Horómetro' ? asset.horometro_actual : asset.km_actual,
                siguiente_objetivo: null, intervalo: null
            })
            continue
        }

        const ultimoPreventivo = await dbGet(`
      SELECT * FROM preventive_events WHERE asset_id = ?
      ORDER BY fecha_mantenimiento DESC LIMIT 1`, asset.id
        )

        const lecturaActual = (config as any).unidad_control === 'horometro' ? Number(asset.horometro_actual) : Number(asset.km_actual)
        let siguienteObjetivo = (config as any).intervalo
        let progreso = 0

        if (ultimoPreventivo) {
            siguienteObjetivo = (ultimoPreventivo as any).siguiente_objetivo || ((ultimoPreventivo as any).lectura_al_momento + (config as any).intervalo)
            const recorrido = lecturaActual - ((ultimoPreventivo as any).lectura_al_momento || 0)
            progreso = (config as any).intervalo > 0 ? Math.min((recorrido / (config as any).intervalo) * 100, 150) : 0
        } else {
            progreso = 100
        }

        let estadoPrev = 'Al día'
        if (progreso >= 100) estadoPrev = 'Vencido'
        else if (progreso >= (config as any).criterio_alerta_critica) estadoPrev = 'Crítico'
        else if (progreso >= (config as any).criterio_alerta_temprana) estadoPrev = 'Próximo'

        backlog.push({
            asset_id: asset.id, asset_codigo: asset.codigo_patrimonial,
            asset_tipo: asset.tipo_unidad, estado_preventivo: estadoPrev,
            progreso: Math.round(progreso * 10) / 10, lectura_actual: lecturaActual,
            siguiente_objetivo: siguienteObjetivo, intervalo: (config as any).intervalo,
            unidad_control: (config as any).unidad_control
        })
    }
    res.json(backlog)
})
