import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const failuresRouter = Router()

failuresRouter.get('/', async (req, res) => {
  const { asset_id, desde, hasta, solo_correctivas, categoria } = req.query
  let sql = `
    SELECT f.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo,
           o.nombre as operador_nombre
    FROM failures f
    LEFT JOIN assets a ON f.asset_id = a.id
    LEFT JOIN operators o ON f.operador_id = o.id
    WHERE 1=1
  `
  const params: any[] = []
  if (asset_id) { sql += ' AND f.asset_id = ?'; params.push(Number(asset_id)) }
  if (categoria) { sql += ' AND a.categoria = ?'; params.push(categoria) }
  if (desde) { sql += ' AND f.fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND f.fecha <= ?'; params.push(hasta) }
  if (solo_correctivas === '1') { sql += ' AND f.es_correctiva_no_programada = 1' }
  sql += ' ORDER BY f.fecha DESC, f.hora_inicio DESC'
  res.json(await dbAll(sql, ...params))
})

failuresRouter.post('/', async (req, res) => {
  const f = req.body
  let duracion = f.duracion_horas || 0
  if (f.hora_inicio && f.hora_fin) {
    const [h1, m1] = f.hora_inicio.split(':').map(Number)
    const [h2, m2] = f.hora_fin.split(':').map(Number)
    duracion = (h2 + m2 / 60) - (h1 + m1 / 60)
    if (duracion < 0) duracion += 24
  }

  const result = await dbRun(`
    INSERT INTO failures (fecha, asset_id, operador_id, hora_inicio, hora_fin,
      duracion_horas, tipo_evento, clasificacion_falla, sistema_afectado, severidad,
      descripcion, causa_probable, accion_correctiva, inmovilizo_unidad,
      es_correctiva_no_programada, costo_reparacion, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    f.fecha, f.asset_id, f.operador_id, f.hora_inicio || '', f.hora_fin || '',
    duracion, f.tipo_evento || '', f.clasificacion_falla || '', f.sistema_afectado || '',
    f.severidad || '', f.descripcion || '', f.causa_probable || '', f.accion_correctiva || '',
    f.inmovilizo_unidad ? 1 : 0, f.es_correctiva_no_programada ? 1 : 0,
    f.costo_reparacion, f.observaciones || ''
  )
  const created = await dbGet(`
    SELECT f.*, a.codigo_patrimonial as asset_codigo FROM failures f
    LEFT JOIN assets a ON f.asset_id = a.id WHERE f.id = ?`,
    result.lastInsertRowid
  )
  res.status(201).json(created)
})

failuresRouter.put('/:id', async (req, res) => {
  const f = req.body
  let duracion = f.duracion_horas || 0
  if (f.hora_inicio && f.hora_fin) {
    const [h1, m1] = f.hora_inicio.split(':').map(Number)
    const [h2, m2] = f.hora_fin.split(':').map(Number)
    duracion = (h2 + m2 / 60) - (h1 + m1 / 60)
    if (duracion < 0) duracion += 24
  }
  await dbRun(`
    UPDATE failures SET fecha = ?, asset_id = ?, operador_id = ?, hora_inicio = ?,
      hora_fin = ?, duracion_horas = ?, tipo_evento = ?, clasificacion_falla = ?,
      sistema_afectado = ?, severidad = ?, descripcion = ?, causa_probable = ?,
      accion_correctiva = ?, inmovilizo_unidad = ?, es_correctiva_no_programada = ?,
      costo_reparacion = ?, observaciones = ?
    WHERE id = ?`,
    f.fecha, f.asset_id, f.operador_id, f.hora_inicio, f.hora_fin,
    duracion, f.tipo_evento, f.clasificacion_falla, f.sistema_afectado,
    f.severidad, f.descripcion, f.causa_probable, f.accion_correctiva,
    f.inmovilizo_unidad ? 1 : 0, f.es_correctiva_no_programada ? 1 : 0,
    f.costo_reparacion, f.observaciones || '', Number(req.params.id)
  )
  res.json({ ok: true })
})

failuresRouter.delete('/:id', async (req, res) => {
  await dbRun('DELETE FROM failures WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
})
