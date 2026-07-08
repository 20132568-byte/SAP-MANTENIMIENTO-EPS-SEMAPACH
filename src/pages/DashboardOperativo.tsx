import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import KpiCard from '../components/KpiCard'

function getWeekBounds(week: string) {
  const [y, w] = week.split('-W')
  if (!y || !w) return { desde: '', hasta: '' }
  const year = parseInt(y, 10)
  const d = new Date(year, 0, 4)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + (parseInt(w, 10) - 1) * 7)
  const st = new Date(d)
  const en = new Date(d)
  en.setDate(en.getDate() + 6)
  return {
    desde: st.toISOString().split('T')[0],
    hasta: en.toISOString().split('T')[0],
  }
}

function parseWeek(week: string) {
  const [y, w] = week.split('-W')
  return { year: parseInt(y, 10), week: parseInt(w, 10) }
}

function getCurrentWeek() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

export default function DashboardOperativo() {
  const { assetType } = useAssetType()
  const [kpi, setKpi] = useState<any>(null)
  const [assetKpis, setAssetKpis] = useState<any[]>([])
  const [backlog, setBacklog] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState(getCurrentWeek())
  const [weekDraft, setWeekDraft] = useState(getCurrentWeek())
  const [sector, setSector] = useState('General')
  const [selectedStation, setSelectedStation] = useState<any>(null)
  const [stationEquipment, setStationEquipment] = useState<any[]>([])
  const confirmWeek = () => setWeek(weekDraft)
  const shiftDraft = (delta: number) => setWeekDraft(prev => {
    const { year, week: w } = parseWeek(prev)
    let d = new Date(year, 0, 4)
    d.setDate(d.getDate() - ((d.getDay() || 7) - 1) + (w - 1) * 7 + delta * 7)
    const y = d.getFullYear()
    const start = new Date(y, 0, 4)
    const wn = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + (start.getDay() || 7) - 1 + 1) / 7)
    return `${y}-W${Math.min(wn, 53).toString().padStart(2, '0')}`
  })

  const { desde, hasta } = getWeekBounds(week)
  const isFleet = assetType === 'fleet'
  const isStation = assetType === 'stations'

  useEffect(() => {
    if (selectedStation) {
      api.getStationEquipment(selectedStation.id).then(setStationEquipment).catch(() => {})
    } else {
      setStationEquipment([])
    }
  }, [selectedStation])

  useEffect(() => {
    setLoading(true)
    setKpi(null)
    setAssetKpis([])
    setBacklog([])
    setAssets([])
    setStations([])
    setSelectedStation(null)

    const promises: Promise<any>[] = []

    if (isFleet) {
      promises.push(api.getKPIGlobal(desde, hasta, sector, 'fleet'))
      promises.push(api.getKPIPorActivo(desde, hasta, sector, 'fleet'))
      promises.push(api.getPreventiveBacklog({ categoria: 'fleet' }))
      promises.push(api.getAssets({ categoria: 'fleet' }))
    } else if (isStation) {
      promises.push(api.getKPIGlobal(desde, hasta, undefined, 'stations'))
      promises.push(api.getKPIPorActivo(desde, hasta, undefined, 'stations'))
      promises.push(api.getPreventiveBacklog({ categoria: 'stations' }))
      promises.push(api.getAssets({ categoria: 'stations' }))
      promises.push(api.getStations())
    }

    Promise.all(promises)
      .then((results) => {
        let idx = 0
        if (isFleet || isStation) {
          const kpiData = results[idx++]
          const rawAssetKpis = results[idx++]
          const rawBacklog = results[idx++]
          const fetchedAssets = results[idx++]
          const fetchedStations = isStation ? results[idx++] : []

          const validIds = new Set(fetchedAssets.map((a: any) => a.id))
          const validCodigos = new Set(fetchedAssets.map((a: any) => a.codigo_patrimonial))

          setKpi(kpiData)
          setAssetKpis(
            Array.isArray(rawAssetKpis)
              ? rawAssetKpis.filter((k: any) => validIds.has(k.asset_id) || validCodigos.has(k.asset_codigo))
                .map((k: any) => ({ ...k, asset_display: k.asset_placa || k.asset_codigo }))
              : []
          )
          setBacklog(
            Array.isArray(rawBacklog)
              ? rawBacklog.filter((b: any) => validIds.has(b.asset_id) || validCodigos.has(b.asset_codigo))
              : []
          )
          setAssets(fetchedAssets)
          if (isStation) setStations(fetchedStations)
        }
      })
      .finally(() => setLoading(false))
  }, [assetType, week, sector])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Monitor Operativo</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {assetType === 'fleet' ? 'Flota Vehicular' : 'Estaciones Hídricas'} — Semana {week}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button onClick={() => shiftDraft(-1)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all cursor-pointer" title="Semana anterior">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <input
              type="week"
              value={weekDraft}
              onChange={(e) => setWeekDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmWeek() }}
              className="px-3 py-1.5 w-[160px] text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 text-center font-mono cursor-pointer"
            />
            <button onClick={() => shiftDraft(1)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all cursor-pointer" title="Semana siguiente">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
            <button onClick={confirmWeek} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:opacity-90 transition-all cursor-pointer">
              Ir
            </button>
          </div>
          {isFleet && (
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="General">General</option>
              <option value="Norte">Norte</option>
              <option value="Sur">Sur</option>
              <option value="Centro">Centro</option>
              <option value="Este">Este</option>
              <option value="Oeste">Oeste</option>
            </select>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="MTTR" value={kpi?.mttr_global != null ? kpi.mttr_global.toFixed(1) : '—'} unit="hrs" icon="timer" colorClass="text-orange-600 dark:text-orange-400" bgClass="bg-orange-50 dark:bg-orange-900/30" />
        <KpiCard title="MTBF" value={kpi?.mtbf_global != null ? kpi.mtbf_global.toFixed(1) : '—'} unit="hrs" icon="autorenew" colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-900/30" />
        <KpiCard title="Disponibilidad" value={kpi?.disponibilidad_global != null ? kpi.disponibilidad_global.toFixed(1) : '—'} unit="%" icon="check_circle" colorClass="text-green-600 dark:text-green-400" bgClass="bg-green-50 dark:bg-green-900/30" />
        <KpiCard title="Confiabilidad" value={kpi?.disponibilidad_confiabilidad != null ? kpi.disponibilidad_confiabilidad.toFixed(1) : '—'} unit="%" icon="verified" colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" />
        <KpiCard title="Fallas" value={kpi?.total_fallas != null ? kpi.total_fallas : '—'} icon="warning" colorClass="text-red-600 dark:text-red-400" bgClass="bg-red-50 dark:bg-red-900/30" />
        <KpiCard title="Horas Perdidas" value={kpi?.horas_perdidas != null ? kpi.horas_perdidas.toFixed(1) : '—'} unit="hrs" icon="schedule" colorClass="text-yellow-600 dark:text-yellow-400" bgClass="bg-yellow-50 dark:bg-yellow-900/30" />
        <KpiCard title="Costo Correctivo" value={kpi?.costo_correctivo != null ? `S/${Number(kpi.costo_correctivo).toLocaleString()}` : '—'} icon="payments" colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-50 dark:bg-rose-900/30" />
        <KpiCard title="Costo Preventivo" value={kpi?.costo_preventivo != null ? `S/${Number(kpi.costo_preventivo).toLocaleString()}` : '—'} icon="construction" colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-900/30" />
      </div>

      {/* Charts */}
      {assetKpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined text-xl">timer</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">MTTR</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Tiempo medio de reparación</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assetKpis.slice(0, 10)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="asset_display" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="mttr" fill="var(--color-error)" radius={[3, 3, 0, 0]} minPointSize={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-xl">autorenew</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">MTBF</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Tiempo medio entre fallas</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assetKpis.slice(0, 10)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="asset_display" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="mtbf" fill="var(--color-success)" radius={[3, 3, 0, 0]} minPointSize={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {kpi && (
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <span className="material-symbols-outlined text-xl">pie_chart</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Distribución de costos</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">Correctivo vs Preventivo</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[
                    { name: 'Correctivo', value: Number(kpi.costo_correctivo) || 0 },
                    { name: 'Preventivo', value: Number(kpi.costo_preventivo) || 0 },
                  ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                    <Cell fill="var(--color-error)" />
                    <Cell fill="var(--color-success)" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    cursor={{ fill: 'var(--bg-hover)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <span className="material-symbols-outlined text-xl">monitoring</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Salud de activos</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Estado general de activos</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assetKpis.slice(0, 10).map((k: any) => ({ ...k, salud: k.salud ?? 0 }))} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="asset_display" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="salud" radius={[3, 3, 0, 0]}>
                  {assetKpis.slice(0, 10).map((_: any, i: number) => (
                    <Cell key={i} fill={assetKpis[i]?.salud >= 70 ? 'var(--color-success)' : assetKpis[i]?.salud >= 40 ? 'var(--color-warning)' : 'var(--color-error)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Station mode: Stations list */}
      {isStation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stations.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelectedStation(selectedStation?.id === s.id ? null : s)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedStation?.id === s.id
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.nombre || s.codigo}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.ubicacion || s.zona || ''}</p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                  s.estado === 'Operativa' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
                }`}>
                  {s.estado}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Station Equipment Detail */}
      {selectedStation && stationEquipment.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Equipos — {selectedStation.nombre || selectedStation.codigo}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Marca</th>
                  <th className="text-left p-3">Modelo</th>
                  <th className="text-left p-3">Potencia</th>
                  <th className="text-left p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {stationEquipment.map((eq: any) => (
                  <tr key={eq.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="p-3 text-[var(--text-primary)] font-medium">{eq.codigo}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{eq.tipo_equipo}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{eq.marca}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{eq.modelo}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{eq.potencia_hp ? `${eq.potencia_hp} HP` : '—'}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        eq.estado === 'Operativo' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
                      }`}>
                        {eq.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asset KPIs Table */}
      {assetKpis.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">KPI por Activo</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="text-left p-3">Activo</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">MTTR</th>
                  <th className="text-left p-3">MTBF</th>
                  <th className="text-left p-3">Disp.</th>
                  <th className="text-left p-3">Fallas</th>
                  <th className="text-left p-3">Hrs Perd.</th>
                  <th className="text-left p-3">Costo</th>
                  <th className="text-left p-3">Salud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assetKpis.map((k: any) => (
                  <tr key={k.asset_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="p-3 text-[var(--text-primary)] font-medium">{k.asset_placa || k.asset_codigo}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.asset_tipo}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.mttr != null ? `${k.mttr.toFixed(1)}h` : '—'}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.mtbf != null ? `${k.mtbf.toFixed(1)}h` : '—'}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.disponibilidad != null ? `${k.disponibilidad.toFixed(1)}%` : '—'}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.total_fallas ?? 0}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.horas_perdidas != null ? `${k.horas_perdidas.toFixed(1)}h` : '—'}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{k.costo_total != null ? `S/${k.costo_total.toFixed(2)}` : '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (k.salud ?? 0) >= 70 ? 'bg-[var(--color-success)]' : (k.salud ?? 0) >= 40 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'
                            }`}
                            style={{ width: `${k.salud || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[var(--text-muted)]">{k.salud ?? '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backlog Preventivo */}
      {backlog.length > 0 && (() => {
        const fechas = backlog.map((b: any) => b.fecha_vencimiento).filter(Boolean).sort()
        const fmt = (d: string) => { const f = new Date(d); return `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}/${f.getFullYear()}` }
        const desde = fechas[0] ? fmt(fechas[0]) : '—'
        const hasta = fechas[fechas.length - 1] ? fmt(fechas[fechas.length - 1]) : '—'
        const criticos = backlog.filter((b: any) => b.dias_vencidos > 30).length
        return (
          <div className="p-4 rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-lg text-[var(--color-error)]">warning</span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Backlog preventivo: del {desde} al {hasta} sin realizarse
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {backlog.length} mantenimientos vencidos{criticos > 0 ? ` (${criticos} críticos)` : ''}
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {!isFleet && !isStation && (
        <p className="text-center text-[var(--text-muted)] py-12">Selecciona un tipo de activo para ver datos</p>
      )}
    </div>
  )
}
