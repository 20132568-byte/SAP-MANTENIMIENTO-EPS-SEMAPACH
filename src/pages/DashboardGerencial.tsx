import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import KpiCard from '../components/KpiCard'


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

function dateToWeek(dateStr: string) {
  if (!dateStr) return getCurrentWeek();
  const [y, m, day] = dateStr.split('-');
  const d = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(day)));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

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
  return { desde: st.toISOString().split('T')[0], hasta: en.toISOString().split('T')[0] }
}

export default function DashboardGerencial() {
  const { assetType } = useAssetType()
  const [kpi, setKpi] = useState<any>(null)
  const [assetKpis, setAssetKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState(getCurrentWeek())
  const [sector, setSector] = useState('General')
  const [kpiTab, setKpiTab] = useState<'mttr' | 'mtbf' | 'disp' | 'salud' | 'costo' | 'fallas'>('salud')
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)

  const { desde, hasta } = getWeekBounds(week)
  const showFleet = assetType === 'fleet'

  useEffect(() => {
    setLoading(true)
    setKpi(null)
    setAssetKpis([])

    Promise.all([
      api.getKPIGlobal(desde, hasta, showFleet ? sector : undefined, assetType),
      api.getKPIPorActivo(desde, hasta, showFleet ? sector : undefined, assetType),
    ])
      .then(([k, a]) => {
        setKpi(k)
        setAssetKpis(Array.isArray(a) ? a.map((kpi: any) => ({ ...kpi, asset_display: kpi.asset_placa || kpi.asset_codigo })) : [])
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Dashboard Gerencial</h1>
          <p className="text-sm text-[var(--text-secondary)]">Indicadores clave — Semana {week}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={getWeekBounds(week).desde}
              onChange={(e) => setWeek(dateToWeek(e.target.value))}
              className="px-3 py-1.5 w-[140px] text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 text-center font-mono cursor-pointer"
            />
          </div>
          {showFleet && (
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="General">General</option>
              <option value="Norte">Norte</option>
              <option value="Sur">Sur</option>
              <option value="Centro">Centro</option>
            </select>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="MTTR" value={kpi?.mttr_global != null ? kpi.mttr_global.toFixed(1) : '—'} unit="hrs" icon="timer" colorClass="text-orange-600 dark:text-orange-400" bgClass="bg-orange-50 dark:bg-orange-900/30" />
        <KpiCard title="MTBF" value={kpi?.mtbf_global != null ? kpi.mtbf_global.toFixed(1) : '—'} unit="hrs" icon="autorenew" colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-900/30" />
        <KpiCard title="Disponibilidad" value={kpi?.disponibilidad_global != null ? kpi.disponibilidad_global.toFixed(1) : '—'} unit="%" icon="check_circle" colorClass="text-green-600 dark:text-green-400" bgClass="bg-green-50 dark:bg-green-900/30" />
        <KpiCard title="Confiabilidad" value={kpi?.disponibilidad_confiabilidad != null ? kpi.disponibilidad_confiabilidad.toFixed(1) : '—'} unit="%" icon="verified" colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" />
        <KpiCard title="Total Fallas" value={kpi?.total_fallas != null ? kpi.total_fallas : '—'} icon="warning" colorClass="text-red-600 dark:text-red-400" bgClass="bg-red-50 dark:bg-red-900/30" />
        <KpiCard title="Horas Perdidas" value={kpi?.horas_perdidas != null ? kpi.horas_perdidas.toFixed(1) : '—'} unit="hrs" icon="schedule" colorClass="text-yellow-600 dark:text-yellow-400" bgClass="bg-yellow-50 dark:bg-yellow-900/30" />
        <KpiCard title="Costo Correctivo" value={kpi?.costo_correctivo != null ? `S/${Number(kpi.costo_correctivo).toLocaleString()}` : '—'} icon="payments" colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-50 dark:bg-rose-900/30" />
        <KpiCard title="Costo Preventivo" value={kpi?.costo_preventivo != null ? `S/${Number(kpi.costo_preventivo).toLocaleString()}` : '—'} icon="construction" colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-900/30" />
      </div>

      {/* Resumen */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Costo Total" value={`S/${Number(kpi.costo_total || 0).toLocaleString()}`} icon="account_balance" colorClass="text-cyan-600 dark:text-cyan-400" bgClass="bg-cyan-50 dark:bg-cyan-900/30" />
          <KpiCard title="Flota Operativa" value={kpi.flota_operativa_pct != null ? `${kpi.flota_operativa_pct.toFixed(1)}%` : '—'} icon="directions_car" colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50 dark:bg-violet-900/30" />
          <KpiCard title="Prev. Ejecutados" value={kpi.preventivos_ejecutados ?? 0} icon="task_alt" colorClass="text-teal-600 dark:text-teal-400" bgClass="bg-teal-50 dark:bg-teal-900/30" />
          <KpiCard title="Prev. Vencidos" value={kpi.preventivos_vencidos ?? 0} icon="pending_actions" colorClass="text-slate-600 dark:text-slate-400" bgClass="bg-slate-50 dark:bg-slate-900/30" />
        </div>
      )}

      {/* Detalle por activo */}
      {selectedAssetId && (() => {
        const a = assetKpis.find((k: any) => k.asset_id === selectedAssetId)
        if (!a) return null
        return (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{a.asset_placa || a.asset_codigo}</h2>
              <button onClick={() => setSelectedAssetId(null)} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { l: 'Salud', v: a.salud, u: '', c: a.salud >= 70 ? '#16a34a' : a.salud >= 40 ? '#d97706' : '#dc2626' },
                { l: 'Disponibilidad', v: a.disponibilidad, u: '%', c: a.disponibilidad >= 90 ? '#16a34a' : a.disponibilidad >= 70 ? '#d97706' : '#dc2626' },
                { l: 'MTBF', v: a.mtbf, u: 'h', c: '#2563eb' },
                { l: 'MTTR', v: a.mttr, u: 'h', c: a.mttr <= 5 ? '#16a34a' : a.mttr <= 15 ? '#d97706' : '#dc2626' },
                { l: 'Fallas', v: a.total_fallas, u: '', c: '#2563eb' },
                { l: 'Costo', v: a.costo_total, u: 'S/', c: '#0891b2' },
              ].map((m) => (
                <div key={m.l} className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{m.l}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)] mt-1">
                    {m.u === 'S/' ? `${m.u}${(m.v ?? 0).toFixed(0)}` : m.v != null ? `${m.v.toFixed(1)}${m.u}` : '—'}
                  </p>
                  <div className="mt-2 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min((m.l === 'MTTR' ? (1 - Math.min((m.v ?? 0) / 30, 1)) : (m.v ?? 0) / 100) * 100, 100)}%`,
                      backgroundColor: m.c
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Horas Perdidas</p>
              <p className="text-base font-semibold text-[var(--text-primary)]">{a.horas_perdidas != null ? `${a.horas_perdidas.toFixed(1)}h` : '—'}</p>
            </div>
          </div>
        )
      })()}

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
            <ResponsiveContainer width="100%" height={240}>
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
            <ResponsiveContainer width="100%" height={240}>
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
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Disponibilidad</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Porcentaje de disponibilidad</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={assetKpis.slice(0, 10)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="asset_display" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="disponibilidad" radius={[3, 3, 0, 0]}>
                  {assetKpis.slice(0, 10).map((_: any, i: number) => (
                    <Cell key={i} fill={assetKpis[i]?.disponibilidad >= 90 ? 'var(--color-success)' : assetKpis[i]?.disponibilidad >= 70 ? 'var(--color-warning)' : 'var(--color-error)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <span className="material-symbols-outlined text-xl">monitoring</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Salud</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Estado general de activos</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={assetKpis.slice(0, 10)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
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

      {/* KPI por Activo — barras horizontales con tabs */}
      {assetKpis.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-1 p-0.5 bg-[var(--bg-tertiary)] rounded-lg">
              {([{ k: 'salud', l: 'Salud' }, { k: 'disp', l: 'Disponibilidad' }, { k: 'mtbf', l: 'MTBF' }, { k: 'mttr', l: 'MTTR' }, { k: 'costo', l: 'Costo' }, { k: 'fallas', l: 'Fallas' }] as const).map((tab) => (
                <button key={tab.k} onClick={() => setKpiTab(tab.k)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    kpiTab === tab.k ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>
                  {tab.l}
                </button>
              ))}
            </div>
            <select
              value={selectedAssetId ?? ''}
              onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : null)}
              className="px-2 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 max-w-[140px]"
            >
              <option value="">Todos</option>
              {assetKpis.map((a: any) => (
                <option key={a.asset_id} value={a.asset_id}>{a.asset_placa || a.asset_codigo}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-1.5">
            {(() => {
              const sorted = [...assetKpis].sort((a, b) => {
                const get = (k: any) => { switch (kpiTab) {
                  case 'mttr': return k.mttr ?? 0
                  case 'mtbf': return -(k.mtbf ?? 0)
                  case 'disp': return -(k.disponibilidad ?? 0)
                  case 'costo': return -(k.costo_total ?? 0)
                  case 'fallas': return -(k.total_fallas ?? 0)
                  default: return -(k.salud ?? 0)
                }}
                return get(a) > get(b) ? 1 : -1
              })
              const maxVal = Math.max(...sorted.map((k) => { switch (kpiTab) {
                case 'mttr': return k.mttr ?? 0
                case 'mtbf': return k.mtbf ?? 0
                case 'disp': return k.disponibilidad ?? 0
                case 'costo': return k.costo_total ?? 0
                case 'fallas': return k.total_fallas ?? 0
                default: return k.salud ?? 0
              }}), 1)
              return sorted.map((k) => {
                let val: number, unit: string, pct: number
                switch (kpiTab) {
                  case 'mttr': val = k.mttr ?? 0; unit = 'h'; pct = (val / maxVal) * 100; break
                  case 'mtbf': val = k.mtbf ?? 0; unit = 'h'; pct = (val / maxVal) * 100; break
                  case 'disp': val = k.disponibilidad ?? 0; unit = '%'; pct = val; break
                  case 'costo': val = k.costo_total ?? 0; unit = ''; pct = (val / maxVal) * 100; break
                  case 'fallas': val = k.total_fallas ?? 0; unit = ''; pct = (val / maxVal) * 100; break
                  default: val = k.salud ?? 0; unit = ''; pct = val; break
                }
                const barColor = kpiTab === 'salud' || kpiTab === 'disp'
                  ? val >= 70 ? '#16a34a' : val >= 40 ? '#d97706' : '#dc2626'
                  : kpiTab === 'mttr'
                    ? val <= 5 ? '#16a34a' : val <= 15 ? '#d97706' : '#dc2626'
                    : kpiTab === 'mtbf' ? '#2563eb' : '#0891b2'
                const isSelected = k.asset_id === selectedAssetId
                return (
                  <div key={k.asset_id}
                    onClick={() => setSelectedAssetId(isSelected ? null : k.asset_id)}
                    className={`flex items-center gap-3 px-1 py-0.5 rounded cursor-pointer transition-all ${
                      isSelected ? 'bg-[var(--accent-bg)] ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--bg-hover)]'
                    }`}>
                    <span className="text-xs font-semibold text-[var(--text-primary)] w-16 sm:w-24 truncate shrink-0" title={k.asset_placa || k.asset_codigo}>
                      {k.asset_placa || k.asset_codigo}
                    </span>
                    <div className="flex-1 h-5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] w-16 text-right shrink-0 font-mono">
                      {kpiTab === 'costo' ? `S/${val.toFixed(0)}` : kpiTab === 'fallas' ? val : `${val.toFixed(1)}${unit}`}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {!showFleet && assetKpis.length === 0 && (
        <p className="text-center text-[var(--text-muted)] py-12">No hay datos disponibles para el período seleccionado.</p>
      )}
    </div>
  )
}
