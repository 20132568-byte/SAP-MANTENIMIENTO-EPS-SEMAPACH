import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const stationsRouter = Router()

// === ESTACIONES ===

stationsRouter.get('/', async (req, res) => {
    const { tipo, zona, distrito, estado, buscar, incluir_inactivos } = req.query
    let sql = 'SELECT * FROM water_stations WHERE 1=1'
    const params: any[] = []

    if (!incluir_inactivos) { sql += ' AND activo = 1' }
    if (tipo) { sql += ' AND tipo = ?'; params.push(tipo) }
    if (zona) { sql += ' AND zona = ?'; params.push(zona) }
    if (distrito) { sql += ' AND distrito = ?'; params.push(distrito) }
    if (estado) { sql += ' AND estado = ?'; params.push(estado) }
    if (buscar) {
        sql += ' AND (codigo ILIKE ? OR nombre ILIKE ? OR zona ILIKE ? OR distrito ILIKE ?)'
        const term = `%${buscar}%`
        params.push(term, term, term, term)
    }
    sql += ' ORDER BY nombre ASC'
    res.json(await dbAll(sql, ...params))
})

stationsRouter.get('/:id', async (req, res) => {
    const row = await dbGet('SELECT * FROM water_stations WHERE id = ?', Number(req.params.id))
    if (!row) return res.status(404).json({ error: 'Estación no encontrada' })
    res.json(row)
})

stationsRouter.get('/:id/equipment', async (req, res) => {
    const rows = await dbAll('SELECT * FROM station_equipment WHERE station_id = ? AND activo = 1 ORDER BY codigo', Number(req.params.id))
    res.json(rows)
})

stationsRouter.get('/:id/maintenance-history', async (req, res) => {
    const rows = await dbAll(`
        SELECT sml.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM station_maintenance_log sml
        LEFT JOIN station_equipment se ON sml.equipment_id = se.id
        WHERE sml.station_id = ?
        ORDER BY sml.fecha DESC
    `, Number(req.params.id))
    res.json(rows)
})

stationsRouter.post('/', async (req, res) => {
    const s = req.body
    const result = await dbRun(`
        INSERT INTO water_stations (codigo, nombre, tipo, zona, distrito, direccion, coordenadas_lat, coordenadas_lng, estado, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        s.codigo, s.nombre, s.tipo || '', s.zona || '', s.distrito || '', s.direccion || '',
        s.coordenadas_lat || null, s.coordenadas_lng || null, s.estado || 'Operativa', s.observaciones || ''
    )
    const created = await dbGet('SELECT * FROM water_stations WHERE id = ?', result.lastInsertRowid)
    res.status(201).json(created)
})

stationsRouter.put('/:id', async (req, res) => {
    const s = req.body
    await dbRun(`
        UPDATE water_stations SET codigo=?, nombre=?, tipo=?, zona=?, distrito=?, direccion=?,
            coordenadas_lat=?, coordenadas_lng=?, estado=?, observaciones=?, updated_at=CURRENT_TIMESTAMP
        WHERE id = ?`,
        s.codigo, s.nombre, s.tipo || '', s.zona || '', s.distrito || '', s.direccion || '',
        s.coordenadas_lat || null, s.coordenadas_lng || null, s.estado || 'Operativa', s.observaciones || '', Number(req.params.id)
    )
    const updated = await dbGet('SELECT * FROM water_stations WHERE id = ?', Number(req.params.id))
    res.json(updated)
})

stationsRouter.delete('/:id', async (req, res) => {
    await dbRun("UPDATE water_stations SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", Number(req.params.id))
    res.json({ ok: true })
})

// === EQUIPOS POR ESTACIÓN ===

stationsRouter.post('/:id/equipment', async (req, res) => {
    const e = req.body
    const result = await dbRun(`
        INSERT INTO station_equipment (station_id, codigo, tipo_equipo, marca, modelo, serie, potencia_hp, potencia_kw, voltaje, horas_operacion, ultimo_mantenimiento, proximo_mantenimiento, estado, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        Number(req.params.id), e.codigo, e.tipo_equipo, e.marca || '', e.modelo || '', e.serie || '',
        e.potencia_hp || null, e.potencia_kw || null, e.voltaje || '', e.horas_operacion || 0,
        e.ultimo_mantenimiento || null, e.proximo_mantenimiento || null, e.estado || 'Operativo', e.observaciones || ''
    )
    const created = await dbGet('SELECT * FROM station_equipment WHERE id = ?', result.lastInsertRowid)
    res.status(201).json(created)
})

stationsRouter.put('/equipment/:id', async (req, res) => {
    const e = req.body
    await dbRun(`
        UPDATE station_equipment SET codigo=?, tipo_equipo=?, marca=?, modelo=?, serie=?,
            potencia_hp=?, potencia_kw=?, voltaje=?, horas_operacion=?, ultimo_mantenimiento=?,
            proximo_mantenimiento=?, estado=?, observaciones=?, updated_at=CURRENT_TIMESTAMP
        WHERE id = ?`,
        e.codigo, e.tipo_equipo, e.marca || '', e.modelo || '', e.serie || '',
        e.potencia_hp || null, e.potencia_kw || null, e.voltaje || '', e.horas_operacion || 0,
        e.ultimo_mantenimiento || null, e.proximo_mantenimiento || null, e.estado || 'Operativo', e.observaciones || '', Number(req.params.id)
    )
    const updated = await dbGet('SELECT * FROM station_equipment WHERE id = ?', Number(req.params.id))
    res.json(updated)
})

stationsRouter.delete('/equipment/:id', async (req, res) => {
    await dbRun("UPDATE station_equipment SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", Number(req.params.id))
    res.json({ ok: true })
})

// === LOG DE MANTENIMIENTO POR ESTACIÓN ===

stationsRouter.get('/:id/maintenance', async (req, res) => {
    const { desde, hasta, tipo, activity_code } = req.query
    let sql = `SELECT sml.*, se.codigo as equipo_codigo, se.tipo_equipo, se.marca, se.modelo
        FROM station_maintenance_log sml
        LEFT JOIN station_equipment se ON sml.equipment_id = se.id
        WHERE sml.station_id = ?`
    const params: any[] = [Number(req.params.id)]

    if (desde) { sql += ' AND sml.fecha >= ?'; params.push(desde) }
    if (hasta) { sql += ' AND sml.fecha <= ?'; params.push(hasta) }
    if (tipo) { sql += ' AND sml.tipo = ?'; params.push(tipo) }
    if (activity_code) { sql += ' AND sml.activity_code = ?'; params.push(activity_code) }
    sql += ' ORDER BY sml.fecha DESC'
    res.json(await dbAll(sql, ...params))
})

stationsRouter.post('/:id/maintenance', async (req, res) => {
    const m = req.body
    const result = await dbRun(`
        INSERT INTO station_maintenance_log (station_id, equipment_id, activity_code, fecha, tipo, descripcion, horas_trabajadas, costo, tecnico, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        Number(req.params.id), m.equipment_id || null, m.activity_code || '', m.fecha,
        m.tipo || 'preventivo', m.descripcion || '', m.horas_trabajadas || null, m.costo || null,
        m.tecnico || '', m.observaciones || ''
    )
    const created = await dbGet(`SELECT sml.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM station_maintenance_log sml LEFT JOIN station_equipment se ON sml.equipment_id = se.id
        WHERE sml.id = ?`, result.lastInsertRowid)
    res.status(201).json(created)
})

stationsRouter.delete('/maintenance/:id', async (req, res) => {
    await dbRun('DELETE FROM station_maintenance_log WHERE id = ?', Number(req.params.id))
    res.json({ ok: true })
})

// === ACTAS DE MANTENIMIENTO ===

stationsRouter.get('/:id/records', async (req, res) => {
    const rows = await dbAll(`SELECT mr.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM maintenance_records mr
        LEFT JOIN station_equipment se ON mr.equipment_id = se.id
        WHERE mr.station_id = ? ORDER BY mr.fecha_inicio DESC`, Number(req.params.id))
    res.json(rows)
})

stationsRouter.post('/:id/records', async (req, res) => {
    const r = req.body
    const result = await dbRun(`
        INSERT INTO maintenance_records (station_id, equipment_id, activity_code, fecha_inicio, fecha_fin, tecnico_responsable, trabajo_realizado, materiales_usados, horas_empleadas, costo_total, conformidad, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        Number(req.params.id), r.equipment_id || null, r.activity_code || '', r.fecha_inicio,
        r.fecha_fin || null, r.tecnico_responsable || '', r.trabajo_realizado || '',
        r.materiales_usados || '', r.horas_empleadas || null, r.costo_total || null,
        r.conformidad || '', r.observaciones || ''
    )
    const created = await dbGet(`SELECT mr.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM maintenance_records mr LEFT JOIN station_equipment se ON mr.equipment_id = se.id
        WHERE mr.id = ?`, result.lastInsertRowid)
    res.status(201).json(created)
})

// === PLAN DE MANTENIMIENTO 2026 ===

stationsRouter.get('/plan-2026/activities', async (req, res) => {
    const rows = await dbAll('SELECT * FROM maintenance_activities WHERE activo = 1 ORDER BY codigo')
    res.json(rows)
})

stationsRouter.get('/plan-2026/summary', async (req, res) => {
    const totalPresupuesto = await dbGet('SELECT SUM(presupuesto_anual) as total FROM maintenance_activities')
    const ejecutado = await dbGet('SELECT SUM(costo) as total_ejecutado, COUNT(*) as total_registros FROM station_maintenance_log')
    const porEstacion = await dbAll(`
        SELECT ws.nombre as estacion, ws.tipo, COUNT(sml.id) as total_mantenimientos,
            COALESCE(SUM(sml.costo), 0) as costo_total
        FROM water_stations ws
        LEFT JOIN station_maintenance_log sml ON ws.id = sml.station_id
        WHERE ws.activo = 1
        GROUP BY ws.id, ws.nombre, ws.tipo
        ORDER BY costo_total DESC
    `)
    res.json({
        presupuesto_total: Number(totalPresupuesto.total) || 0,
        ejecutado_total: Number(ejecutado.total_ejecutado) || 0,
        registros_total: Number(ejecutado.total_registros) || 0,
        por_estacion: porEstacion
    })
})

// === INTELIGENCIA PARA ESTACIONES ===

stationsRouter.get('/intelligence/alerts', async (req, res) => {
    const { desde, hasta } = req.query
    const alerts: any[] = []

    // 1. Estaciones fuera de servicio
    const fueraServicio = await dbAll(`SELECT * FROM water_stations WHERE estado != 'Operativa' AND activo = 1`)
    for (const e of fueraServicio) {
        alerts.push({
            tipo: 'critica', icono: 'block', titulo: 'Estación fuera de servicio',
            detalle: `${e.nombre} (${e.tipo}) — Estado: ${e.estado}`,
            source: 'station', station_id: e.id, station_name: e.nombre
        })
    }

    // 2. Equipos fuera de servicio
    const equiposFuera = await dbAll(`SELECT se.*, ws.nombre as station_name
        FROM station_equipment se JOIN water_stations ws ON se.station_id = ws.id
        WHERE se.estado != 'Operativo' AND se.activo = 1`)
    for (const e of equiposFuera) {
        alerts.push({
            tipo: 'advertencia', icono: 'build', titulo: 'Equipo fuera de servicio',
            detalle: `${e.codigo} (${e.tipo_equipo}) en ${e.station_name} — Estado: ${e.estado}`,
            source: 'station', station_id: e.station_id, station_name: e.station_name
        })
    }

    // 3. Mantenimientos correctivos recientes con alto costo
    if (desde && hasta) {
        const altoCosto = await dbAll(`SELECT sml.*, ws.nombre as station_name, se.codigo as equipo_codigo
            FROM station_maintenance_log sml
            JOIN water_stations ws ON sml.station_id = ws.id
            LEFT JOIN station_equipment se ON sml.equipment_id = se.id
            WHERE sml.fecha BETWEEN ? AND ? AND sml.tipo = 'correctivo' AND sml.costo > 500
            ORDER BY sml.costo DESC LIMIT 10`, desde, hasta)
        for (const m of altoCosto) {
            alerts.push({
                tipo: 'advertencia', icono: 'payments', titulo: 'Correctivo de alto costo',
                detalle: `${m.station_name}: ${m.descripcion} — Costo: S/ ${Number(m.costo).toFixed(2)}`,
                source: 'station', station_id: m.station_id, station_name: m.station_name
            })
        }
    }

    // 4. Estaciones sin mantenimiento en últimos 30 días
    const sinMantenimiento = await dbAll(`
        SELECT ws.*, MAX(sml.fecha) as ultimo_mtto
        FROM water_stations ws
        LEFT JOIN station_maintenance_log sml ON ws.id = sml.station_id
        WHERE ws.activo = 1 AND ws.estado = 'Operativa'
        GROUP BY ws.id HAVING MAX(sml.fecha) IS NULL OR MAX(sml.fecha) < CURRENT_DATE - INTERVAL '30 days'
    `)
    for (const e of sinMantenimiento) {
        alerts.push({
            tipo: 'info', icono: 'schedule', titulo: 'Sin mantenimiento reciente',
            detalle: `${e.nombre} — Último: ${e.ultimo_mtto ? e.ultimo_mtto.split('T')[0] : 'Nunca'}`,
            source: 'station', station_id: e.id, station_name: e.nombre
        })
    }

    // 5. Emergencias recientes
    if (desde && hasta) {
        const emergencias = await dbAll(`SELECT sml.*, ws.nombre as station_name
            FROM station_maintenance_log sml JOIN water_stations ws ON sml.station_id = ws.id
            WHERE sml.fecha BETWEEN ? AND ? AND sml.tipo = 'emergencia'
            ORDER BY sml.fecha DESC LIMIT 5`, desde, hasta)
        for (const e of emergencias) {
            alerts.push({
                tipo: 'critica', icono: 'emergency', titulo: 'Emergencia registrada',
                detalle: `${e.station_name}: ${e.descripcion} (${e.fecha?.split('T')[0]})`,
                source: 'station', station_id: e.station_id, station_name: e.station_name
            })
        }
    }

    res.json(alerts)
})

stationsRouter.get('/intelligence/recommendations', async (req, res) => {
    const recs: any[] = []

    // 1. Equipos próximos a mantenimiento
    const proximos = await dbAll(`SELECT se.*, ws.nombre as station_name
        FROM station_equipment se JOIN water_stations ws ON se.station_id = ws.id
        WHERE se.proximo_mantenimiento IS NOT NULL AND se.proximo_mantenimiento <= CURRENT_DATE + INTERVAL '7 days'
        AND se.activo = 1 AND se.estado = 'Operativo'`)
    if (proximos.length > 0) {
        recs.push({
            prioridad: 'alta', titulo: 'Mantenimientos próximos',
            detalle: `${proximos.length} equipo(s) requieren mantenimiento en los próximos 7 días.`,
            source: 'station', estaciones: [...new Set(proximos.map((p: any) => p.station_name))]
        })
    }

    // 2. Estaciones con muchos equipos fuera de servicio
    const muchasFallas = await dbAll(`
        SELECT ws.nombre, COUNT(*) as equipos_fuera
        FROM station_equipment se JOIN water_stations ws ON se.station_id = ws.id
        WHERE se.estado != 'Operativo' AND se.activo = 1
        GROUP BY ws.id HAVING COUNT(*) >= 2
    `)
    for (const e of muchasFallas) {
        recs.push({
            prioridad: 'inmediata', titulo: 'Múltiples equipos fuera de servicio',
            detalle: `${e.nombre}: ${e.equipos_fuera} equipos requieren atención.`,
            source: 'station', estaciones: [e.nombre]
        })
    }

    // 3. Alto gasto en correctivos vs preventivos
    const correctivoVsPreventivo = await dbAll(`
        SELECT
            SUM(CASE WHEN tipo = 'correctivo' THEN COALESCE(costo, 0) ELSE 0 END) as costo_correctivo,
            SUM(CASE WHEN tipo = 'preventivo' THEN COALESCE(costo, 0) ELSE 0 END) as costo_preventivo
        FROM station_maintenance_log
    `)
    const cc = Number(correctivoVsPreventivo[0]?.costo_correctivo) || 0
    const cp = Number(correctivoVsPreventivo[0]?.costo_preventivo) || 0
    if (cc > cp && cp > 0) {
        recs.push({
            prioridad: 'media', titulo: 'Gasto correctivo supera al preventivo',
            detalle: `Correctivos: S/ ${cc.toFixed(2)} vs Preventivos: S/ ${cp.toFixed(2)}. Fortalecer plan preventivo.`,
            source: 'station', estaciones: []
        })
    }

    if (recs.length === 0) {
        recs.push({ prioridad: 'baja', titulo: 'Operación dentro de parámetros', detalle: 'No se detectaron anomalías en las estaciones hídricas.', source: 'station', estaciones: [] })
    }

    res.json(recs)
})

stationsRouter.get('/intelligence/station-rankings', async (req, res) => {
    const { desde, hasta } = req.query
    const params: any[] = []
    let whereClause = 'ws.activo = 1'
    if (desde && hasta) {
        whereClause += ' AND sml.fecha BETWEEN ? AND ?'
        params.push(desde, hasta)
    }

    // Worst stations by cost
    const worst = await dbAll(`
        SELECT ws.nombre, ws.tipo, COUNT(sml.id) as total_mttos,
            COALESCE(SUM(CASE WHEN sml.tipo = 'correctivo' THEN sml.costo ELSE 0 END), 0) as costo_correctivo,
            COALESCE(SUM(CASE WHEN sml.tipo = 'emergencia' THEN 1 ELSE 0 END), 0) as emergencias
        FROM water_stations ws
        LEFT JOIN station_maintenance_log sml ON ws.id = sml.station_id AND sml.fecha BETWEEN ? AND ?
        WHERE ws.activo = 1
        GROUP BY ws.id
        ORDER BY costo_correctivo DESC
        LIMIT 5
    `, desde || '2000-01-01', hasta || '2100-12-31')

    // Best stations (lowest cost)
    const best = await dbAll(`
        SELECT ws.nombre, ws.tipo, COUNT(sml.id) as total_mttos,
            COALESCE(SUM(CASE WHEN sml.tipo = 'preventivo' THEN 1 ELSE 0 END), 0) as preventivos,
            COALESCE(SUM(sml.costo), 0) as costo_total
        FROM water_stations ws
        LEFT JOIN station_maintenance_log sml ON ws.id = sml.station_id AND sml.fecha BETWEEN ? AND ?
        WHERE ws.activo = 1
        GROUP BY ws.id
        ORDER BY costo_total ASC
        LIMIT 5
    `, desde || '2000-01-01', hasta || '2100-12-31')

    res.json({ worst, best })
})
