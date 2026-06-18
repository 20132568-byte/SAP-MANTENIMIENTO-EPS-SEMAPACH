import { dbAll, dbGet, dbRun } from '../db.js'

export interface FailureInput {
    fecha: string
    asset_id: number
    operador_id?: number | null
    hora_inicio?: string
    hora_fin?: string
    duracion_horas?: number
    tipo_evento?: string
    clasificacion_falla?: string
    sistema_afectado?: string
    severidad?: string
    descripcion?: string
    causa_probable?: string
    accion_correctiva?: string
    inmovilizo_unidad?: boolean | number
    es_correctiva_no_programada?: boolean | number
    costo_reparacion?: number | null
    observaciones?: string
}

function calcDuracion(horaInicio: string, horaFin: string, duracionDefault: number): number {
    if (horaInicio && horaFin) {
        const [h1, m1] = horaInicio.split(':').map(Number)
        const [h2, m2] = horaFin.split(':').map(Number)
        let d = (h2 + m2 / 60) - (h1 + m1 / 60)
        if (d < 0) d += 24
        return d
    }
    return duracionDefault || 0
}

export async function listFailures(filters: {
    asset_id?: string
    desde?: string
    hasta?: string
    solo_correctivas?: string
    categoria?: string
}) {
    let sql = `
        SELECT f.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo,
               o.nombre as operador_nombre
        FROM failures f
        LEFT JOIN assets a ON f.asset_id = a.id
        LEFT JOIN operators o ON f.operador_id = o.id
        WHERE 1=1
    `
    const params: any[] = []
    if (filters.asset_id) { sql += ' AND f.asset_id = ?'; params.push(Number(filters.asset_id)) }
    if (filters.categoria) { sql += ' AND a.categoria = ?'; params.push(filters.categoria) }
    if (filters.desde) { sql += ' AND f.fecha >= ?'; params.push(filters.desde) }
    if (filters.hasta) { sql += ' AND f.fecha <= ?'; params.push(filters.hasta) }
    if (filters.solo_correctivas === '1') { sql += ' AND f.es_correctiva_no_programada = 1' }
    sql += ' ORDER BY f.fecha DESC, f.hora_inicio DESC'
    return dbAll(sql, ...params)
}

export async function createFailure(data: FailureInput) {
    const duracion = calcDuracion(data.hora_inicio || '', data.hora_fin || '', data.duracion_horas || 0)
    const result = await dbRun(`
        INSERT INTO failures (fecha, asset_id, operador_id, hora_inicio, hora_fin,
            duracion_horas, tipo_evento, clasificacion_falla, sistema_afectado, severidad,
            descripcion, causa_probable, accion_correctiva, inmovilizo_unidad,
            es_correctiva_no_programada, costo_reparacion, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        data.fecha, data.asset_id, data.operador_id, data.hora_inicio || '', data.hora_fin || '',
        duracion, data.tipo_evento || '', data.clasificacion_falla || '', data.sistema_afectado || '',
        data.severidad || '', data.descripcion || '', data.causa_probable || '', data.accion_correctiva || '',
        data.inmovilizo_unidad ? 1 : 0, data.es_correctiva_no_programada ? 1 : 0,
        data.costo_reparacion, data.observaciones || ''
    )
    return dbGet(`
        SELECT f.*, a.codigo_patrimonial as asset_codigo FROM failures f
        LEFT JOIN assets a ON f.asset_id = a.id WHERE f.id = ?`, result.lastInsertRowid)
}

export async function updateFailure(id: number, data: FailureInput) {
    const duracion = calcDuracion(data.hora_inicio || '', data.hora_fin || '', data.duracion_horas || 0)
    await dbRun(`
        UPDATE failures SET fecha = ?, asset_id = ?, operador_id = ?, hora_inicio = ?,
            hora_fin = ?, duracion_horas = ?, tipo_evento = ?, clasificacion_falla = ?,
            sistema_afectado = ?, severidad = ?, descripcion = ?, causa_probable = ?,
            accion_correctiva = ?, inmovilizo_unidad = ?, es_correctiva_no_programada = ?,
            costo_reparacion = ?, observaciones = ?
        WHERE id = ?`,
        data.fecha, data.asset_id, data.operador_id, data.hora_inicio, data.hora_fin,
        duracion, data.tipo_evento, data.clasificacion_falla, data.sistema_afectado,
        data.severidad, data.descripcion, data.causa_probable, data.accion_correctiva,
        data.inmovilizo_unidad ? 1 : 0, data.es_correctiva_no_programada ? 1 : 0,
        data.costo_reparacion, data.observaciones || '', id
    )
}

export async function deleteFailure(id: number) {
    await dbRun('DELETE FROM failures WHERE id = ?', id)
}
