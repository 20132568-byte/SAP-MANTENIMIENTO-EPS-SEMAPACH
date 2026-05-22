import { dbAll, dbGet, dbRun } from '../db.js'

export interface AssetInput {
    codigo_patrimonial: string
    tipo_unidad: string
    categoria?: string
    station_id?: number | null
    fuente?: string
    placa_principal?: string
    placa_secundaria?: string
    anio_fabricacion?: number | null
    estado?: string
    criticidad?: string
    forma_control?: string
    km_actual?: number
    horometro_actual?: number
    marca?: string
    modelo?: string
    serie?: string
    potencia_hp?: number
    potencia_kw?: number
    voltaje?: string
    tension?: string
    especificaciones_tecnicas?: string
    observaciones?: string
    calidad_dato_inicial?: string
    horas_programadas_estandar?: number
}

export async function listAssets(filters: {
    tipo_unidad?: string
    estado?: string
    criticidad?: string
    buscar?: string
    categoria?: string
    incluir_inactivos?: string
}) {
    let sql = 'SELECT * FROM assets WHERE 1=1'
    const params: any[] = []

    if (!filters.incluir_inactivos) { sql += ' AND activo = 1' }
    if (filters.categoria) { sql += ' AND categoria = ?'; params.push(filters.categoria) }
    if (filters.tipo_unidad) { sql += ' AND tipo_unidad = ?'; params.push(filters.tipo_unidad) }
    if (filters.estado) { sql += ' AND estado = ?'; params.push(filters.estado) }
    if (filters.criticidad) { sql += ' AND criticidad = ?'; params.push(filters.criticidad) }
    if (filters.buscar) {
        sql += ' AND (codigo_patrimonial LIKE ? OR placa_principal LIKE ? OR tipo_unidad LIKE ? OR marca LIKE ? OR modelo LIKE ?)'
        const term = `%${filters.buscar}%`
        params.push(term, term, term, term, term)
    }
    sql += ' ORDER BY codigo_patrimonial ASC'
    return dbAll(sql, ...params)
}

export async function getAsset(id: number) {
    return dbGet('SELECT * FROM assets WHERE id = ?', id)
}

export async function createAsset(data: AssetInput) {
    const result = await dbRun(`
        INSERT INTO assets (codigo_patrimonial, tipo_unidad, categoria, station_id, fuente, placa_principal, placa_secundaria,
            anio_fabricacion, estado, criticidad, forma_control, km_actual, horometro_actual,
            marca, modelo, serie, potencia_hp, potencia_kw, voltaje, tension, especificaciones_tecnicas,
            observaciones, calidad_dato_inicial, horas_programadas_estandar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        data.codigo_patrimonial, data.tipo_unidad, data.categoria || 'fleet', data.station_id || null,
        data.fuente || '', data.placa_principal || '', data.placa_secundaria || '',
        data.anio_fabricacion, data.estado || 'Operativo', data.criticidad || 'Media',
        data.forma_control || 'Kilometraje', data.km_actual || 0, data.horometro_actual || 0,
        data.marca || '', data.modelo || '', data.serie || '', data.potencia_hp || 0,
        data.potencia_kw || 0, data.voltaje || '', data.tension || '', data.especificaciones_tecnicas || '',
        data.observaciones || '', data.calidad_dato_inicial || 'no disponible', data.horas_programadas_estandar || 8
    )
    return getAsset(result.lastInsertRowid)
}

export async function updateAsset(id: number, data: AssetInput) {
    await dbRun(`
        UPDATE assets SET codigo_patrimonial = ?, tipo_unidad = ?, categoria = ?, station_id = ?,
            fuente = ?, placa_principal = ?, placa_secundaria = ?, anio_fabricacion = ?,
            estado = ?, criticidad = ?, forma_control = ?, km_actual = ?, horometro_actual = ?,
            marca = ?, modelo = ?, serie = ?, potencia_hp = ?, potencia_kw = ?, voltaje = ?,
            tension = ?, especificaciones_tecnicas = ?, observaciones = ?,
            calidad_dato_inicial = ?, horas_programadas_estandar = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        data.codigo_patrimonial, data.tipo_unidad, data.categoria, data.station_id || null,
        data.fuente || '', data.placa_principal || '', data.placa_secundaria || '',
        data.anio_fabricacion, data.estado, data.criticidad, data.forma_control,
        data.km_actual, data.horometro_actual, data.marca || '', data.modelo || '',
        data.serie || '', data.potencia_hp || 0, data.potencia_kw || 0, data.voltaje || '',
        data.tension || '', data.especificaciones_tecnicas || '', data.observaciones || '',
        data.calidad_dato_inicial || 'no disponible', data.horas_programadas_estandar || 8, id
    )
    return getAsset(id)
}

export async function deactivateAsset(id: number) {
    await dbRun("UPDATE assets SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
}
