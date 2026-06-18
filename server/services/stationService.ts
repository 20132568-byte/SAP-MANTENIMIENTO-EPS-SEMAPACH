import { dbAll, dbGet, dbRun } from '../db.js'

export async function listStations(filters: Record<string, string | undefined>) {
    let sql = 'SELECT * FROM water_stations WHERE 1=1'
    const params: any[] = []
    if (!filters.incluir_inactivos) { sql += ' AND activo = 1' }
    if (filters.tipo) { sql += ' AND tipo = ?'; params.push(filters.tipo) }
    if (filters.zona) { sql += ' AND zona = ?'; params.push(filters.zona) }
    if (filters.distrito) { sql += ' AND distrito = ?'; params.push(filters.distrito) }
    if (filters.estado) { sql += ' AND estado = ?'; params.push(filters.estado) }
    if (filters.buscar) {
        sql += ' AND (codigo ILIKE ? OR nombre ILIKE ? OR zona ILIKE ? OR distrito ILIKE ?)'
        const term = `%${filters.buscar}%`
        params.push(term, term, term, term)
    }
    sql += ' ORDER BY nombre ASC'
    return dbAll(sql, ...params)
}

export async function getStation(id: number) {
    return dbGet('SELECT * FROM water_stations WHERE id = ?', id)
}

export async function createStation(data: any) {
    const result = await dbRun(`
        INSERT INTO water_stations (codigo, nombre, tipo, zona, distrito, direccion,
            coordenadas_lat, coordenadas_lng, estado, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        data.codigo, data.nombre, data.tipo || '', data.zona || '', data.distrito || '',
        data.direccion || '', data.coordenadas_lat || null, data.coordenadas_lng || null,
        data.estado || 'Operativa', data.observaciones || ''
    )
    return getStation(result.lastInsertRowid)
}

export async function updateStation(id: number, data: any) {
    await dbRun(`
        UPDATE water_stations SET codigo=?, nombre=?, tipo=?, zona=?, distrito=?, direccion=?,
            coordenadas_lat=?, coordenadas_lng=?, estado=?, observaciones=?, updated_at=CURRENT_TIMESTAMP
        WHERE id = ?`,
        data.codigo, data.nombre, data.tipo || '', data.zona || '', data.distrito || '',
        data.direccion || '', data.coordenadas_lat || null, data.coordenadas_lng || null,
        data.estado || 'Operativa', data.observaciones || '', id
    )
    return getStation(id)
}

export async function deactivateStation(id: number) {
    await dbRun("UPDATE water_stations SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
}

export async function getStationEquipment(stationId: number) {
    return dbAll('SELECT * FROM station_equipment WHERE station_id = ? AND activo = 1 ORDER BY codigo', stationId)
}

export async function getStationMaintenanceHistory(stationId: number) {
    return dbAll(`
        SELECT sml.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM station_maintenance_log sml
        LEFT JOIN station_equipment se ON sml.equipment_id = se.id
        WHERE sml.station_id = ?
        ORDER BY sml.fecha DESC`, stationId)
}

export async function addStationEquipment(stationId: number, data: any) {
    const result = await dbRun(`
        INSERT INTO station_equipment (station_id, codigo, tipo_equipo, marca, modelo, serie,
            potencia_hp, potencia_kw, voltaje, estado, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        stationId, data.codigo, data.tipo_equipo, data.marca || '', data.modelo || '',
        data.serie || '', data.potencia_hp || 0, data.potencia_kw || 0, data.voltaje || '',
        data.estado || 'Operativo', data.observaciones || ''
    )
    return dbGet('SELECT * FROM station_equipment WHERE id = ?', result.lastInsertRowid)
}

export async function updateStationEquipment(id: number, data: any) {
    await dbRun(`
        UPDATE station_equipment SET codigo=?, tipo_equipo=?, marca=?, modelo=?, serie=?,
            potencia_hp=?, potencia_kw=?, voltaje=?, estado=?, observaciones=?, updated_at=CURRENT_TIMESTAMP
        WHERE id = ?`,
        data.codigo, data.tipo_equipo, data.marca || '', data.modelo || '', data.serie || '',
        data.potencia_hp || 0, data.potencia_kw || 0, data.voltaje || '',
        data.estado || 'Operativo', data.observaciones || '', id
    )
}

export async function deactivateStationEquipment(id: number) {
    await dbRun("UPDATE station_equipment SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
}

export async function addStationMaintenance(stationId: number, data: any) {
    const result = await dbRun(`
        INSERT INTO station_maintenance_log (station_id, equipment_id, activity_code, fecha,
            tipo, descripcion, horas_trabajadas, costo, tecnico, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        stationId, data.equipment_id || null, data.activity_code || '',
        data.fecha, data.tipo || 'preventivo', data.descripcion || '',
        data.horas_trabajadas || 0, data.costo || 0, data.tecnico || '', data.observaciones || ''
    )
    return dbGet('SELECT * FROM station_maintenance_log WHERE id = ?', result.lastInsertRowid)
}

export async function deleteStationMaintenance(id: number) {
    await dbRun('DELETE FROM station_maintenance_log WHERE id = ?', id)
}

export async function addStationRecord(stationId: number, data: any) {
    const result = await dbRun(`
        INSERT INTO maintenance_records (station_id, equipment_id, activity_code,
            fecha_inicio, fecha_fin, tecnico_responsable, trabajo_realizado,
            materiales_usados, horas_empleadas, costo_total, conformidad, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        stationId, data.equipment_id || null, data.activity_code || '',
        data.fecha_inicio, data.fecha_fin, data.tecnico_responsable || '',
        data.trabajo_realizado || '', data.materiales_usados || '',
        data.horas_empleadas || 0, data.costo_total || 0,
        data.conformidad || '', data.observaciones || ''
    )
    return dbGet('SELECT * FROM maintenance_records WHERE id = ?', result.lastInsertRowid)
}

export async function getStationMaintenance(stationId: number, _params?: Record<string, string>) {
    return dbAll(`
        SELECT sml.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM station_maintenance_log sml
        LEFT JOIN station_equipment se ON sml.equipment_id = se.id
        WHERE sml.station_id = ?
        ORDER BY sml.fecha DESC`, stationId)
}

export async function getStationRecords(stationId: number) {
    return dbAll(`
        SELECT mr.*, se.codigo as equipo_codigo, se.tipo_equipo
        FROM maintenance_records mr
        LEFT JOIN station_equipment se ON mr.equipment_id = se.id
        WHERE mr.station_id = ?
        ORDER BY mr.fecha_inicio DESC`, stationId)
}
