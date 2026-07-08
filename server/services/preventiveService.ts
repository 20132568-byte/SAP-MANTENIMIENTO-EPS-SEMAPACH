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

export async function deletePreventiveEvent(id: number) {
    await dbRun('DELETE FROM preventive_events WHERE id = ?', id)
}

export async function deletePreventiveConfig(id: number) {
    await dbRun('DELETE FROM preventive_config WHERE id = ?', id)
}

export async function getPreventiveBacklog(filters: { asset_id?: string; categoria?: string }) {
    let sql = `
        WITH avg_daily AS (
            SELECT asset_id,
                AVG(COALESCE(km_recorridos, 0)) as avg_km,
                AVG(COALESCE(horometro_final - horometro_inicial, 0)) as avg_hrs
            FROM daily_records
            WHERE fecha >= CURRENT_DATE - INTERVAL '60 days'
              AND (km_recorridos > 0 OR horometro_final > horometro_inicial)
            GROUP BY asset_id
        )
        SELECT
            a.id as asset_id,
            a.codigo_patrimonial as asset_codigo,
            a.placa_principal as asset_placa,
            a.tipo_unidad as asset_tipo,
            pc.id as config_id,
            pc.tipo_preventivo,
            pc.intervalo,
            pc.unidad_control,
            pc.criterio_alerta_temprana,
            pc.criterio_alerta_critica,
            COALESCE(pe.ultima_lectura, 0) as ultima_lectura,
            pe.ultimo_mantenimiento,
            a.km_actual,
            a.horometro_actual,
            CASE
                WHEN pc.unidad_control = 'fecha' THEN
                    (COALESCE(pe.ultimo_mantenimiento, a.fecha_alta)::date + pc.intervalo * INTERVAL '1 day')::date
                WHEN pc.unidad_control = 'km'
                    AND a.km_actual >= COALESCE(pe.ultima_lectura, 0) + pc.intervalo THEN
                    CASE WHEN pe.ultima_lectura IS NOT NULL THEN
                        (CURRENT_DATE - ((a.km_actual - (COALESCE(pe.ultima_lectura, 0) + pc.intervalo)) / GREATEST(COALESCE(ad.avg_km, 50), 1) * INTERVAL '1 day'))::date
                    ELSE
                        (a.fecha_alta::date + (pc.intervalo / GREATEST(COALESCE(ad.avg_km, 50), 1) * INTERVAL '1 day'))::date
                    END
                WHEN pc.unidad_control = 'horometro'
                    AND a.horometro_actual >= COALESCE(pe.ultima_lectura, 0) + pc.intervalo THEN
                    CASE WHEN pe.ultima_lectura IS NOT NULL THEN
                        (CURRENT_DATE - ((a.horometro_actual - (COALESCE(pe.ultima_lectura, 0) + pc.intervalo)) / GREATEST(COALESCE(ad.avg_hrs, 8), 1) * INTERVAL '1 day'))::date
                    ELSE
                        (a.fecha_alta::date + (pc.intervalo / GREATEST(COALESCE(ad.avg_hrs, 8), 1) * INTERVAL '1 day'))::date
                    END
                ELSE NULL
            END as fecha_vencimiento,
            CASE
                WHEN pc.unidad_control = 'fecha' THEN
                    (CURRENT_DATE - (COALESCE(pe.ultimo_mantenimiento, a.fecha_alta)::date + pc.intervalo * INTERVAL '1 day')::date)::integer
                WHEN pc.unidad_control = 'km'
                    AND a.km_actual >= COALESCE(pe.ultima_lectura, 0) + pc.intervalo THEN
                    CASE WHEN pe.ultima_lectura IS NOT NULL THEN
                        ((a.km_actual - (COALESCE(pe.ultima_lectura, 0) + pc.intervalo)) / GREATEST(COALESCE(ad.avg_km, 50), 1))::integer
                    ELSE
                        (CURRENT_DATE - (a.fecha_alta::date + (pc.intervalo / GREATEST(COALESCE(ad.avg_km, 50), 1) * INTERVAL '1 day'))::date)::integer
                    END
                WHEN pc.unidad_control = 'horometro'
                    AND a.horometro_actual >= COALESCE(pe.ultima_lectura, 0) + pc.intervalo THEN
                    CASE WHEN pe.ultima_lectura IS NOT NULL THEN
                        ((a.horometro_actual - (COALESCE(pe.ultima_lectura, 0) + pc.intervalo)) / GREATEST(COALESCE(ad.avg_hrs, 8), 1))::integer
                    ELSE
                        (CURRENT_DATE - (a.fecha_alta::date + (pc.intervalo / GREATEST(COALESCE(ad.avg_hrs, 8), 1) * INTERVAL '1 day'))::date)::integer
                    END
                ELSE NULL
            END as dias_vencidos
        FROM preventive_config pc
        JOIN assets a ON (pc.asset_id = a.id OR (pc.asset_id IS NULL AND pc.tipo_unidad = a.tipo_unidad))
        LEFT JOIN (
            SELECT asset_id, tipo_preventivo,
                MAX(lectura_al_momento) as ultima_lectura,
                MAX(fecha_mantenimiento) as ultimo_mantenimiento
            FROM preventive_events
            GROUP BY asset_id, tipo_preventivo
        ) pe ON pe.asset_id = a.id AND pe.tipo_preventivo = pc.tipo_preventivo
        LEFT JOIN avg_daily ad ON ad.asset_id = a.id
        WHERE a.activo = 1
          AND (
            (pc.unidad_control = 'fecha'
                AND (COALESCE(pe.ultimo_mantenimiento, a.fecha_alta)::date + pc.intervalo * INTERVAL '1 day')::date <= CURRENT_DATE)
            OR (pc.unidad_control = 'km'
                AND a.km_actual >= COALESCE(pe.ultima_lectura, 0) + pc.intervalo
                AND (pe.ultima_lectura IS NOT NULL
                    OR (a.fecha_alta::date + (pc.intervalo / GREATEST(COALESCE(ad.avg_km, 50), 1) * INTERVAL '1 day'))::date <= CURRENT_DATE))
            OR (pc.unidad_control = 'horometro'
                AND a.horometro_actual >= COALESCE(pe.ultima_lectura, 0) + pc.intervalo
                AND (pe.ultima_lectura IS NOT NULL
                    OR (a.fecha_alta::date + (pc.intervalo / GREATEST(COALESCE(ad.avg_hrs, 8), 1) * INTERVAL '1 day'))::date <= CURRENT_DATE))
          )
    `
    const params: any[] = []
    if (filters.asset_id) { sql += ' AND a.id = ?'; params.push(Number(filters.asset_id)) }
    if (filters.categoria) { sql += ' AND a.categoria = ?'; params.push(filters.categoria) }
    sql += ' ORDER BY dias_vencidos DESC'
    return dbAll(sql, ...params)
}
