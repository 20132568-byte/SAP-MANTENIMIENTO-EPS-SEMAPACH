import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import KpiCard from '../components/KpiCard'

export default function APMDesempenio() {
  const { assetType } = useAssetType()
  const [kpis, setKpis] = useState<any[]>([])
  const [kpiGlobal, setKpiGlobal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getKPIGlobal(monthStart, todayStr, undefined, assetType),
      api.getKPIPorActivo(monthStart, todayStr, undefined, assetType),
    ]).then(([global, porActivo]) => {
      setKpiGlobal(global)
      setKpis(Array.isArray(porActivo) ? porActivo.map((k: any) => ({ ...k, asset_display: k.asset_placa || k.asset_codigo })) : [])
      setLoading(false)
    })
  }, [assetType])

  const getHealthColor = (v: number | null) => {
    if (v === null) return 'text-[var(--text-muted)]'
    if (v >= 90) return 'text-[var(--color-success)]'
    if (v >= 70) return 'text-[var(--color-warning)]'
    return 'text-[var(--color-error)]'
  }

  const getBarWidth = (v: number | null) => {
    if (v === null) return 0
    return Math.min(v, 100)
  }

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case 'Bajo': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
      case 'Medio': return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      case 'Alto': return 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
    }
  }

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
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Salud del Activo</h1>
          <p className="text-sm text-[var(--text-secondary)]">APM — Asset Performance Management</p>
        </div>
      </div>

      {/* Global KPIs */}
      {kpiGlobal && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            title="Disponibilidad"
            value={kpiGlobal.disponibilidad_global != null ? `${kpiGlobal.disponibilidad_global.toFixed(1)}%` : '—'}
            icon="check_circle"
            colorClass="text-green-600 dark:text-green-400"
            bgClass="bg-green-50 dark:bg-green-900/30"
          />
          <KpiCard
            title="MTBF"
            value={kpiGlobal.mtbf_global != null ? `${kpiGlobal.mtbf_global.toFixed(1)}h` : '—'}
            icon="autorenew"
            colorClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-50 dark:bg-blue-900/30"
          />
          <KpiCard
            title="MTTR"
            value={kpiGlobal.mttr_global != null ? `${kpiGlobal.mttr_global.toFixed(1)}h` : '—'}
            icon="timer"
            colorClass="text-orange-600 dark:text-orange-400"
            bgClass="bg-orange-50 dark:bg-orange-900/30"
          />
          <KpiCard
            title="Flota Operativa"
            value={kpiGlobal.flota_operativa_pct != null ? `${kpiGlobal.flota_operativa_pct.toFixed(1)}%` : '—'}
            icon="directions_car"
            colorClass="text-purple-600 dark:text-purple-400"
            bgClass="bg-purple-50 dark:bg-purple-900/30"
          />
        </div>
      )}

      {/* Cost summary */}
      {kpiGlobal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            title="Costo Correctivo"
            value={`S/${Number(kpiGlobal.costo_correctivo || 0).toFixed(2)}`}
            icon="payments"
            colorClass="text-red-600 dark:text-red-400"
            bgClass="bg-red-50 dark:bg-red-900/30"
          />
          <KpiCard
            title="Costo Preventivo"
            value={`S/${Number(kpiGlobal.costo_preventivo || 0).toFixed(2)}`}
            icon="construction"
            colorClass="text-amber-600 dark:text-amber-400"
            bgClass="bg-amber-50 dark:bg-amber-900/30"
          />
          <KpiCard
            title="Total Fallas"
            value={kpiGlobal.total_fallas ?? 0}
            icon="warning"
            colorClass="text-rose-600 dark:text-rose-400"
            bgClass="bg-rose-50 dark:bg-rose-900/30"
          />
        </div>
      )}

      {/* Charts */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined text-xl">monitoring</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Salud de activos</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Distribución de salud</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kpis.slice(0, 10)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="asset_display" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="salud" radius={[3, 3, 0, 0]}>
                  {kpis.slice(0, 10).map((_: any, i: number) => (
                    <Cell key={i} fill={kpis[i]?.salud >= 90 ? 'var(--color-success)' : kpis[i]?.salud >= 70 ? 'var(--color-warning)' : 'var(--color-error)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined text-xl">stacked_bar_chart</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Disponibilidad vs MTBF</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Comparativa de KPIs</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kpis.slice(0, 10)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="asset_display" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="disponibilidad" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="mtbf" fill="var(--color-info)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-asset table */}
      {kpis.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">Sin datos de rendimiento</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-3">Activo</th>
                <th className="text-left p-3">Salud</th>
                <th className="text-left p-3">Disponibilidad</th>
                <th className="text-left p-3">MTBF</th>
                <th className="text-left p-3">MTTR</th>
                <th className="text-left p-3">Fallas</th>
                <th className="text-left p-3">Riesgo</th>
                <th className="text-left p-3">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {kpis.map((k) => (
                <tr key={k.asset_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="p-3 text-[var(--text-primary)] font-medium">{k.asset_placa || k.asset_codigo}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          k.salud >= 90 ? 'bg-[var(--color-success)]' : k.salud >= 70 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'
                        }`} style={{ width: `${getBarWidth(k.salud)}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${getHealthColor(k.salud)}`}>{k.salud ?? '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-[var(--text-primary)] font-mono">{k.disponibilidad != null ? `${k.disponibilidad.toFixed(1)}%` : '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{k.mtbf != null ? `${k.mtbf.toFixed(1)}h` : '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{k.mttr != null ? `${k.mttr.toFixed(1)}h` : '—'}</td>
                  <td className="p-3"><span className="text-[var(--text-primary)] font-medium">{k.total_fallas ?? 0}</span></td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getRiskColor(k.riesgo)}`}>{k.riesgo || '—'}</span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{k.costo_total ? `S/${Number(k.costo_total).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setSelectedAsset(null)}>
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{selectedAsset.asset_codigo}</h3>
              <button onClick={() => setSelectedAsset(null)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Salud del Activo</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${selectedAsset.salud >= 90 ? 'bg-[var(--color-success)]' : selectedAsset.salud >= 70 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'}`}
                      style={{ width: `${getBarWidth(selectedAsset.salud)}%` }} />
                  </div>
                  <span className={`text-lg font-bold ${getHealthColor(selectedAsset.salud)}`}>{selectedAsset.salud ?? '—'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-[var(--text-muted)]">Disponibilidad</p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{selectedAsset.disponibilidad != null ? `${selectedAsset.disponibilidad.toFixed(1)}%` : '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-[var(--text-muted)]">MTBF</p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{selectedAsset.mtbf != null ? `${selectedAsset.mtbf.toFixed(1)}h` : '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-[var(--text-muted)]">MTTR</p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{selectedAsset.mttr != null ? `${selectedAsset.mttr.toFixed(1)}h` : '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-[var(--text-muted)]">Total Fallas</p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">{selectedAsset.total_fallas ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
