import { Router } from 'express'
import { dbAll, dbGet } from '../database.js'

export const kpiRouter = Router()

kpiRouter.get('/global', async (req, res) => {
  const { desde, hasta, sector, categoria } = req.query
  if (!desde || !hasta) return res.status(400).json({ error: 'Se requiere desde y hasta' })

  const sectorQuery = sector && sector !== 'General' ? 'AND a.tipo_unidad = ?' : ''
  const catQuery = categoria ? 'AND a.categoria = ?' : ''
  const params: string[] = [String(desde), String(hasta)]
  if (sector && sector !== 'General') params.push(String(sector))
  if (categoria) params.push(String(categoria))

  const paramsAssets: string[] = []
  if (categoria) paramsAssets.push(String(categoria))
  if (sector && sector !== 'General') paramsAssets.push(String(sector))

  const [horasData, fallasData, preventivoCost, todasFallas, flotaTotal, vencidos] = await Promise.all([
    dbGet(`
      SELECT COALESCE(SUM(d.horas_reales), 0) as horas_reales,
             COALESCE(SUM(d.horas_programadas), 0) as horas_programadas
      FROM daily_records d
      JOIN assets a ON d.asset_id = a.id
      WHERE d.fecha BETWEEN ? AND ? ${sectorQuery} ${catQuery}`,
      ...params
    ),
    dbGet(`
      SELECT COUNT(*) as total_fallas,
             COALESCE(SUM(f.duracion_horas), 0) as horas_reparacion,
             COALESCE(SUM(f.costo_reparacion), 0) as costo_correctivo
      FROM failures f
      JOIN assets a ON f.asset_id = a.id
      WHERE f.fecha BETWEEN ? AND ? AND f.es_correctiva_no_programada = 1 ${sectorQuery} ${catQuery}`,
      ...params
    ),
    dbGet(`
      SELECT COALESCE(SUM(p.costo), 0) as costo_preventivo, COUNT(*) as preventivos_ejecutados
      FROM preventive_events p
      JOIN assets a ON p.asset_id = a.id
      WHERE p.fecha_mantenimiento BETWEEN ? AND ? ${sectorQuery} ${catQuery}`,
      ...params
    ),
    dbGet(`
      SELECT COUNT(*) as total 
      FROM failures f
      JOIN assets a ON f.asset_id = a.id
      WHERE f.fecha BETWEEN ? AND ? ${sectorQuery} ${catQuery}`,
      ...params
    ),
    dbGet(`
      SELECT COUNT(*) as total 
      FROM assets a 
      WHERE a.activo = 1 ${categoria ? 'AND a.categoria = ?' : ''} ${sector && sector !== 'General' ? 'AND a.tipo_unidad = ?' : ''}`,
      ...paramsAssets
    ),
    dbGet(`
      SELECT COUNT(*) as total FROM preventive_config pc
      JOIN assets a ON (pc.asset_id = a.id OR (pc.asset_id IS NULL AND pc.tipo_unidad = a.tipo_unidad))
      WHERE a.activo = 1 AND pc.unidad_control = 'fecha'
        AND COALESCE((
          SELECT MAX(pe.fecha_mantenimiento) FROM preventive_events pe
          WHERE pe.asset_id = a.id AND pe.tipo_preventivo = pc.tipo_preventivo
        ), a.fecha_alta) + pc.intervalo * INTERVAL '1 day' < CURRENT_DATE
        ${categoria ? 'AND a.categoria = ?' : ''} ${sector && sector !== 'General' ? 'AND a.tipo_unidad = ?' : ''}`,
      ...(categoria ? [categoria] : []), ...(sector && sector !== 'General' ? [sector] : [])
    )
  ]) as any[]

  /* Nuevo cálculo de Disponibilidad basado en CAPACIDAD (8h, 12h, 16h) */
  const diasPeriodo = Math.max(1, (new Date(String(hasta)).getTime() - new Date(String(desde)).getTime()) / (1000 * 60 * 60 * 24) + 1);
  
  const capacidadTotal = await dbGet(`
    SELECT SUM(horas_programadas_estandar * ?) as potencial
    FROM assets WHERE activo = 1 ${categoria ? 'AND categoria = ?' : ''} ${sector && sector !== 'General' ? 'AND tipo_unidad = ?' : ''}`,
    diasPeriodo, ...paramsAssets
  ) as any;

  const horasReparacion = Number(fallasData.horas_reparacion) || 0
  const totalFallas = Number(fallasData.total_fallas) || 0
  const horasProgramadas = Number(horasData.horas_programadas) || 0

  const mttr = totalFallas > 0 ? Math.round((horasReparacion / totalFallas) * 100) / 100 : 0

  // MTBF refinado: (Horas Programadas - Horas Reparación) / Total Fallas
  const tiempoOperativo = Math.max(0, horasProgramadas - horasReparacion)
  const mtbf = totalFallas > 0 ? Math.round((tiempoOperativo / totalFallas) * 100) / 100 : Math.round(tiempoOperativo * 100) / 100
  
  const horasPotenciales = Number(capacidadTotal.potencial) || 0;
  const disponibilidad = horasPotenciales > 0
    ? Math.round(((horasPotenciales - horasReparacion) / horasPotenciales) * 10000) / 100 : 100;
    
  // Confiabilidad Real: R(24h) = e^(-24 / MTBF)
  const confiabilidad = mtbf > 0
    ? Math.round(Math.exp(-24 / mtbf) * 10000) / 100
    : (totalFallas > 0 ? 0 : 100)
  
  const flotaSaludable = await dbGet(`
    SELECT COUNT(*) as total FROM assets a 
    LEFT JOIN initial_diagnosis id ON a.id = id.asset_id
    WHERE a.activo = 1 
      AND a.estado = 'Operativo' 
      AND (id.estado_tecnico_inicial IS NULL OR id.estado_tecnico_inicial NOT IN ('Deteriorada', 'Crítica'))
      ${categoria ? 'AND a.categoria = ?' : ''} ${sector && sector !== 'General' ? 'AND a.tipo_unidad = ?' : ''}`,
    ...paramsAssets
  ) as any;

  const flotaOperativaPct = Number(flotaTotal.total) > 0
    ? Math.round((Number(flotaSaludable.total) / Number(flotaTotal.total)) * 10000) / 100 : 100;

  res.json({
    periodo: { desde, hasta, sector: sector || 'General' },
    mttr_global: mttr, mtbf_global: mtbf,
    disponibilidad_global: disponibilidad,
    disponibilidad_confiabilidad: confiabilidad,
    total_fallas: Number(todasFallas.total),
    fallas_correctivas: Number(fallasData.total_fallas),
    horas_perdidas: Math.round(Number(fallasData.horas_reparacion) * 100) / 100,
    horas_reales: Number(horasData.horas_reales),
    horas_programadas: Number(horasData.horas_programadas),
    costo_correctivo: Number(fallasData.costo_correctivo),
    costo_preventivo: Number(preventivoCost.costo_preventivo),
    costo_total: (Number(fallasData.costo_correctivo) || 0) + (Number(preventivoCost.costo_preventivo) || 0),
    flota_operativa_pct: flotaOperativaPct,
    flota_total: Number(flotaTotal.total),
    flota_operativa: Number(flotaSaludable.total),
    preventivos_ejecutados: Number(preventivoCost.preventivos_ejecutados),
    preventivos_vencidos: Number(vencidos.total)
  })
})

kpiRouter.get('/por-activo', async (req, res) => {
  const { desde, hasta, sector, categoria } = req.query
  if (!desde || !hasta) return res.status(400).json({ error: 'Se requiere desde y hasta' })

  const sectorQuery = sector && sector !== 'General' ? 'AND tipo_unidad = ?' : ''
  const catQuery = categoria ? 'AND categoria = ?' : ''
  const paramsAssets: string[] = []
  if (categoria) paramsAssets.push(String(categoria))
  if (sector && sector !== 'General') paramsAssets.push(String(sector))

  const assets = await dbAll(`SELECT * FROM assets WHERE activo = 1 ${catQuery} ${sectorQuery}`, ...paramsAssets)

  const result = await Promise.all((assets as any[]).map(async asset => {
    const [horas, fallas] = await Promise.all([
      dbGet(`
        SELECT COALESCE(SUM(horas_reales), 0) as reales, COALESCE(SUM(horas_programadas), 0) as programadas
        FROM daily_records WHERE asset_id = ? AND fecha BETWEEN ? AND ?`,
        asset.id, String(desde), String(hasta)
      ),
      dbGet(`
        SELECT COUNT(*) as total, COALESCE(SUM(duracion_horas), 0) as horas_rep,
               COALESCE(SUM(costo_reparacion), 0) as costo
        FROM failures WHERE asset_id = ? AND fecha BETWEEN ? AND ? AND es_correctiva_no_programada = 1`,
        asset.id, String(desde), String(hasta)
      )
    ]) as any[]

    const fallasCount = Number(fallas.total) || 0;
    const horasRep = Number(fallas.horas_rep) || 0;
    const horasProg = Number(horas.programadas) || 0;
    
    const mttr = fallasCount > 0 ? Math.round((horasRep / fallasCount) * 100) / 100 : 0;
    const tiempoOperativo = Math.max(0, horasProg - horasRep);
    const mtbf = fallasCount > 0 ? Math.round((tiempoOperativo / fallasCount) * 100) / 100 : Math.round(tiempoOperativo * 100) / 100;
    
    const diasPeriodo = Math.max(1, (new Date(String(hasta)).getTime() - new Date(String(desde)).getTime()) / (1000 * 60 * 60 * 24) + 1);
    const horasPotenciales = (Number(asset.horas_programadas_estandar) || 8) * diasPeriodo;
    
    const disp = horasPotenciales > 0
      ? Math.round(((horasPotenciales - horasRep) / horasPotenciales) * 10000) / 100 : 100;

    const severityPenalty = Math.min(fallasCount * 5, 30);
    const salud = Math.max(0, Math.round((disp - severityPenalty) * 100) / 100);

    const riesgo = salud >= 80 ? 'Bajo' : salud >= 50 ? 'Medio' : 'Alto';

    return {
      asset_id: asset.id, asset_codigo: asset.codigo_patrimonial, asset_placa: asset.placa_principal, asset_tipo: asset.tipo_unidad,
      mttr, mtbf, disponibilidad: disp, total_fallas: fallasCount,
      horas_perdidas: Math.round(horasRep * 100) / 100, costo_total: Number(fallas.costo) || 0,
      salud, riesgo
    }
  }))
  res.json(result)
})
