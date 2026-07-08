import { dbAll, dbGet, dbRun } from '../db.js'

export interface DailyRecordInput {
    fecha: string
    asset_id: number
    operador_id?: number | null
    horas_programadas?: number
    horas_reales?: number
    horas_parada?: number
    hora_inicio_parada?: string
    hora_fin_parada?: string
    km_inicial?: number | null
    km_final?: number | null
    horometro_inicial?: number | null
    horometro_final?: number | null
    estado_dia?: string
    observaciones?: string
    hora_inicio_jornada?: string
    hora_fin_jornada?: string
    jornada_completa?: number
}

export async function listDailyRecords(filters: {
    fecha?: string
    asset_id?: string
    desde?: string
    hasta?: string
    categoria?: string
}) {
    let sql = `
        SELECT dr.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo,
               o.nombre as operador_nombre
        FROM daily_records dr
        LEFT JOIN assets a ON dr.asset_id = a.id
        LEFT JOIN operators o ON dr.operador_id = o.id
        WHERE 1=1
    `
    const params: any[] = []
    if (filters.fecha) { sql += ' AND dr.fecha = ?'; params.push(filters.fecha) }
    if (filters.asset_id) { sql += ' AND dr.asset_id = ?'; params.push(Number(filters.asset_id)) }
    if (filters.categoria) { sql += ' AND a.categoria = ?'; params.push(filters.categoria) }
    if (filters.desde) { sql += ' AND dr.fecha >= ?'; params.push(filters.desde) }
    if (filters.hasta) { sql += ' AND dr.fecha <= ?'; params.push(filters.hasta) }
    sql += ' ORDER BY dr.fecha DESC, a.codigo_patrimonial ASC'
    return dbAll(sql, ...params)
}

export async function createDailyRecord(data: DailyRecordInput) {
    const kmRecorridos = (data.km_inicial != null && data.km_final != null) ? data.km_final - data.km_inicial : null

    const result = await dbRun(`
        INSERT INTO daily_records (fecha, asset_id, operador_id, horas_programadas, horas_reales, horas_parada,
            hora_inicio_parada, hora_fin_parada,
            km_inicial, km_final, km_recorridos, horometro_inicial, horometro_final,
            estado_dia, observaciones, hora_inicio_jornada, hora_fin_jornada, jornada_completa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        data.fecha, data.asset_id, data.operador_id, data.horas_programadas ?? 8, data.horas_reales ?? 0,
        data.horas_parada ?? 0, data.hora_inicio_parada || '', data.hora_fin_parada || '',
        data.km_inicial, data.km_final, kmRecorridos,
        data.horometro_inicial, data.horometro_final,
        data.estado_dia || 'Operativo', data.observaciones || '',
        data.hora_inicio_jornada || '', data.hora_fin_jornada || '', data.jornada_completa ? 1 : 0
    )

    if (data.km_final != null) {
        await dbRun("UPDATE assets SET km_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", data.km_final, data.asset_id)
    }
    if (data.horometro_final != null) {
        await dbRun("UPDATE assets SET horometro_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", data.horometro_final, data.asset_id)
    }

    return dbGet(`
        SELECT dr.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo
        FROM daily_records dr LEFT JOIN assets a ON dr.asset_id = a.id WHERE dr.id = ?`,
        result.lastInsertRowid)
}

export async function updateDailyRecord(id: number, data: DailyRecordInput) {
    const kmRecorridos = (data.km_inicial != null && data.km_final != null) ? data.km_final - data.km_inicial : null
    await dbRun(`
        UPDATE daily_records SET fecha = ?, asset_id = ?, operador_id = ?,
            horas_programadas = ?, horas_reales = ?, horas_parada = ?,
            hora_inicio_parada = ?, hora_fin_parada = ?,
            km_inicial = ?, km_final = ?,
            km_recorridos = ?, horometro_inicial = ?, horometro_final = ?,
            estado_dia = ?, observaciones = ?,
            hora_inicio_jornada = ?, hora_fin_jornada = ?, jornada_completa = ?
        WHERE id = ?`,
        data.fecha, data.asset_id, data.operador_id, data.horas_programadas, data.horas_reales,
        data.horas_parada ?? 0, data.hora_inicio_parada || '', data.hora_fin_parada || '',
        data.km_inicial, data.km_final, kmRecorridos, data.horometro_inicial, data.horometro_final,
        data.estado_dia, data.observaciones || '',
        data.hora_inicio_jornada || '', data.hora_fin_jornada || '', data.jornada_completa ? 1 : 0, id
    )

    if (data.km_final != null) {
        await dbRun("UPDATE assets SET km_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", data.km_final, data.asset_id)
    }
    if (data.horometro_final != null) {
        await dbRun("UPDATE assets SET horometro_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", data.horometro_final, data.asset_id)
    }
}

export async function deleteDailyRecord(id: number) {
    await dbRun('DELETE FROM daily_records WHERE id = ?', id)
}
