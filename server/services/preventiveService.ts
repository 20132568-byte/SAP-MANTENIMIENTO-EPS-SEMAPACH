import { dbAll, dbGet, dbRun } from '../db.js'

export async function listPreventiveEvents(filters: { asset_id?: string; categoria?: string }) {
    let sql = `
        SELECT pe.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo
        FROM preventive_events pe LEFT JOIN assets a ON pe.asset_id = a.id WHERE 1=1
    `
    const params: any[] = []
    if (filters.asset_id) { sql += ' AND pe.asset_id = ?'; params.push(Number(filters.asset_id)) }
    if (filters.categoria) { sql += ' AND a.categoria = ?'; params.push(filters.categoria) }
    sql += ' ORDER BY pe.fecha_mantenimiento DESC'
    return dbAll(sql, ...params)
}

export async function createPreventiveEvent(data: any) {
    const siguienteObjetivo = (data.lectura_al_momento || 0) + (data.intervalo || 0)
    const result = await dbRun(`
        INSERT INTO preventive_events (asset_id, tipo_preventivo, fecha_mantenimiento,
            lectura_al_momento, intervalo, unidad_control, siguiente_objetivo, estado, costo, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        data.asset_id, data.tipo_preventivo || '', data.fecha_mantenimiento,
        data.lectura_al_momento || 0, data.intervalo || 0, data.unidad_control || 'km',
        siguienteObjetivo, data.estado || 'Ejecutado', data.costo, data.observaciones || ''
    )
    return dbGet('SELECT * FROM preventive_events WHERE id = ?', result.lastInsertRowid)
}

export async function updatePreventiveEvent(id: number, data: any) {
    const siguienteObjetivo = (data.lectura_al_momento || 0) + (data.intervalo || 0)
    await dbRun(`
        UPDATE preventive_events SET asset_id = ?, tipo_preventivo = ?, fecha_mantenimiento = ?,
            lectura_al_momento = ?, intervalo = ?, unidad_control = ?, siguiente_objetivo = ?,
            estado = ?, costo = ?, observaciones = ?
        WHERE id = ?`,
        data.asset_id, data.tipo_preventivo || '', data.fecha_mantenimiento,
        data.lectura_al_momento || 0, data.intervalo || 0, data.unidad_control || 'km',
        siguienteObjetivo, data.estado || 'Ejecutado', data.costo, data.observaciones || '', id
    )
}

export async function getPreventiveConfig() {
    return dbAll('SELECT * FROM preventive_config ORDER BY tipo_unidad, tipo_preventivo')
}

export async function createPreventiveConfig(data: any) {
    const result = await dbRun(`
        INSERT INTO preventive_config (asset_id, tipo_unidad, tipo_preventivo, intervalo,
            unidad_control, criterio_alerta_temprana, criterio_alerta_critica)
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        data.asset_id, data.tipo_unidad, data.tipo_preventivo, data.intervalo,
        data.unidad_control || 'km', data.criterio_alerta_temprana || 90, data.criterio_alerta_critica || 95
    )
    return dbGet('SELECT * FROM preventive_config WHERE id = ?', result.lastInsertRowid)
}

export async function updatePreventiveConfig(id: number, data: any) {
    await dbRun(`
        UPDATE preventive_config SET asset_id = ?, tipo_unidad = ?, tipo_preventivo = ?,
            intervalo = ?, unidad_control = ?, criterio_alerta_temprana = ?, criterio_alerta_critica = ?
        WHERE id = ?`,
        data.asset_id, data.tipo_unidad, data.tipo_preventivo, data.intervalo,
        data.unidad_control || 'km', data.criterio_alerta_temprana || 90, data.criterio_alerta_critica || 95, id
    )
}

export async function deletePreventiveConfig(id: number) {
    await dbRun('DELETE FROM preventive_config WHERE id = ?', id)
}

export async function getPreventiveBacklog(filters: { asset_id?: string }) {
    let sql = `
        SELECT a.id as asset_id, a.codigo_patrimonial as asset_codigo, a.tipo_unidad,
            a.km_actual, a.horometro_actual,
            pc.id as config_id, pc.tipo_preventivo, pc.intervalo, pc.unidad_control,
            pc.criterio_alerta_temprana, pc.criterio_alerta_critica,
            (SELECT MAX(pe.lectura_al_momento) FROM preventive_events pe WHERE pe.asset_id = a.id AND pe.tipo_preventivo = pc.tipo_preventivo) as ultima_lectura,
            (SELECT MAX(pe.fecha_mantenimiento) FROM preventive_events pe WHERE pe.asset_id = a.id AND pe.tipo_preventivo = pc.tipo_preventivo) as ultimo_mantenimiento
        FROM assets a
        JOIN preventive_config pc ON (pc.asset_id = a.id OR (pc.asset_id IS NULL AND pc.tipo_unidad = a.tipo_unidad))
        WHERE a.activo = 1
    `
    const params: any[] = []
    if (filters.asset_id) { sql += ' AND a.id = ?'; params.push(Number(filters.asset_id)) }
    sql += ' ORDER BY a.codigo_patrimonial, pc.tipo_preventivo'
    return dbAll(sql, ...params)
}
