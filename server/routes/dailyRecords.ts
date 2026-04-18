import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const dailyRecordsRouter = Router()

dailyRecordsRouter.get('/', async (req, res) => {
  const { fecha, asset_id, desde, hasta, categoria } = req.query
  let sql = `
    SELECT dr.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo,
           o.nombre as operador_nombre
    FROM daily_records dr
    LEFT JOIN assets a ON dr.asset_id = a.id
    LEFT JOIN operators o ON dr.operador_id = o.id
    WHERE 1=1
  `
  const params: any[] = []
  if (fecha) { sql += ' AND dr.fecha = ?'; params.push(fecha) }
  if (asset_id) { sql += ' AND dr.asset_id = ?'; params.push(Number(asset_id)) }
  if (categoria) { sql += ' AND a.categoria = ?'; params.push(categoria) }
  if (desde) { sql += ' AND dr.fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND dr.fecha <= ?'; params.push(hasta) }
  sql += ' ORDER BY dr.fecha DESC, a.codigo_patrimonial ASC'
  res.json(await dbAll(sql, ...params))
})

dailyRecordsRouter.post('/', async (req, res) => {
  const r = req.body
  const kmRecorridos = (r.km_inicial != null && r.km_final != null) ? r.km_final - r.km_inicial : null

  const result = await dbRun(`
    INSERT INTO daily_records (fecha, asset_id, operador_id, horas_programadas, horas_reales, horas_parada,
      hora_inicio_parada, hora_fin_parada,
      km_inicial, km_final, km_recorridos, horometro_inicial, horometro_final,
      estado_dia, observaciones, hora_inicio_jornada, hora_fin_jornada, jornada_completa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    r.fecha, r.asset_id, r.operador_id, r.horas_programadas ?? 8, r.horas_reales ?? 0,
    r.horas_parada ?? 0, r.hora_inicio_parada || '', r.hora_fin_parada || '',
    r.km_inicial, r.km_final, kmRecorridos,
    r.horometro_inicial, r.horometro_final,
    r.estado_dia || 'Operativo', r.observaciones || '',
    r.hora_inicio_jornada || '', r.hora_fin_jornada || '', r.jornada_completa ?? 0
  )

  // Actualizar lecturas del activo solo si hay datos finales
  if (r.km_final != null) {
    await dbRun("UPDATE assets SET km_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", r.km_final, r.asset_id)
  }
  if (r.horometro_final != null) {
    await dbRun("UPDATE assets SET horometro_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", r.horometro_final, r.asset_id)
  }

  const created = await dbGet(`
    SELECT dr.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo
    FROM daily_records dr LEFT JOIN assets a ON dr.asset_id = a.id WHERE dr.id = ?`,
    result.lastInsertRowid
  )
  res.status(201).json(created)
})

dailyRecordsRouter.put('/:id', async (req, res) => {
  const r = req.body
  const kmRecorridos = (r.km_inicial != null && r.km_final != null) ? r.km_final - r.km_inicial : null
  await dbRun(`
    UPDATE daily_records SET fecha = ?, asset_id = ?, operador_id = ?,
      horas_programadas = ?, horas_reales = ?, horas_parada = ?,
      hora_inicio_parada = ?, hora_fin_parada = ?,
      km_inicial = ?, km_final = ?,
      km_recorridos = ?, horometro_inicial = ?, horometro_final = ?,
      estado_dia = ?, observaciones = ?,
      hora_inicio_jornada = ?, hora_fin_jornada = ?, jornada_completa = ?
    WHERE id = ?`,
    r.fecha, r.asset_id, r.operador_id, r.horas_programadas, r.horas_reales,
    r.horas_parada ?? 0, r.hora_inicio_parada || '', r.hora_fin_parada || '',
    r.km_inicial, r.km_final, kmRecorridos, r.horometro_inicial, r.horometro_final,
    r.estado_dia, r.observaciones || '',
    r.hora_inicio_jornada || '', r.hora_fin_jornada || '', r.jornada_completa ?? 0,
    Number(req.params.id)
  )

  // Actualizar lecturas del activo al cerrar jornada
  if (r.km_final != null) {
    await dbRun("UPDATE assets SET km_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", r.km_final, r.asset_id)
  }
  if (r.horometro_final != null) {
    await dbRun("UPDATE assets SET horometro_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", r.horometro_final, r.asset_id)
  }

  res.json({ ok: true })
})

dailyRecordsRouter.delete('/:id', async (req, res) => {
  await dbRun('DELETE FROM daily_records WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
})
