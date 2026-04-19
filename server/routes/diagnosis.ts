import { Router } from 'express'
import { dbAll, dbGet, dbRun } from '../database.js'

export const diagnosisRouter = Router()

diagnosisRouter.get('/', async (req, res) => {
  const { categoria } = req.query
  let sql = `
    SELECT d.*, a.codigo_patrimonial as asset_codigo, a.tipo_unidad as asset_tipo
    FROM initial_diagnosis d LEFT JOIN assets a ON d.asset_id = a.id WHERE 1=1
  `
  const params: any[] = []
  if (categoria) { sql += ' AND a.categoria = ?'; params.push(categoria) }
  sql += ' ORDER BY d.fecha_diagnostico DESC'
  
  res.json(await dbAll(sql, ...params))
})

diagnosisRouter.get('/:assetId', async (req, res) => {
  const row = await dbGet('SELECT * FROM initial_diagnosis WHERE asset_id = ?', Number(req.params.assetId))
  res.json(row || null)
})

diagnosisRouter.post('/', async (req, res) => {
  const d = req.body
  const existing = await dbGet('SELECT id FROM initial_diagnosis WHERE asset_id = ?', d.asset_id)
  if (existing) return res.status(409).json({ error: 'Ya existe diagnóstico para este activo.' })

  const result = await dbRun(`
    INSERT INTO initial_diagnosis (asset_id, km_actual, horometro_actual,
      fecha_ultimo_preventivo, lectura_ultimo_preventivo, estado_tecnico_inicial,
      observacion_tecnica, calidad_dato, recomendacion_manual, prioridad_manual)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    d.asset_id, d.km_actual || 0, d.horometro_actual || 0,
    d.fecha_ultimo_preventivo || '', d.lectura_ultimo_preventivo || 0,
    d.estado_tecnico_inicial || '', d.observacion_tecnica || '',
    d.calidad_dato || 'no disponible', d.recomendacion_manual || '', d.prioridad_manual || ''
  )
  await dbRun(`UPDATE assets SET km_actual = ?, horometro_actual = ?, calidad_dato_inicial = ?,
    updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    d.km_actual || 0, d.horometro_actual || 0, d.calidad_dato || 'no disponible', d.asset_id
  )
  res.status(201).json(await dbGet('SELECT * FROM initial_diagnosis WHERE id = ?', result.lastInsertRowid))
})

diagnosisRouter.put('/:assetId', async (req, res) => {
  const d = req.body
  await dbRun(`
    UPDATE initial_diagnosis SET km_actual = ?, horometro_actual = ?,
      fecha_ultimo_preventivo = ?, lectura_ultimo_preventivo = ?,
      estado_tecnico_inicial = ?, observacion_tecnica = ?, calidad_dato = ?,
      recomendacion_manual = ?, prioridad_manual = ?
    WHERE asset_id = ?`,
    d.km_actual, d.horometro_actual, d.fecha_ultimo_preventivo,
    d.lectura_ultimo_preventivo, d.estado_tecnico_inicial, d.observacion_tecnica,
    d.calidad_dato, d.recomendacion_manual, d.prioridad_manual, Number(req.params.assetId)
  )
  res.json({ ok: true })
})
