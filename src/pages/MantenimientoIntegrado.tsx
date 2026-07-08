import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import KpiCard from '../components/KpiCard'
import { formatDateDMY } from '../utils/date'

export default function MantenimientoIntegrado() {
  const { assetType } = useAssetType()
  const [events, setEvents] = useState<any[]>([])
  const [failures, setFailures] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'preventivo' | 'correctivo'>('all')

  useEffect(() => {
    api.getAssets({ categoria: assetType }).then(setAssets)
  }, [assetType])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getPreventiveEvents({ categoria: assetType }),
      api.getFailures({ categoria: assetType }),
    ]).then(([evt, fal]) => {
      setEvents(evt); setFailures(fal); setLoading(false)
    })
  }, [assetType])

  const assetNames = Object.fromEntries(assets.map((a: any) => [a.id, a.placa_principal || a.codigo_patrimonial]))

  const unified = [
    ...events.map((e) => ({
      id: `prev-${e.id}`, date: e.fecha, asset_id: e.asset_id,
      asset_codigo: assetNames[e.asset_id] || e.asset_codigo || '—',
      type: 'Preventivo' as const, desc: e.descripcion || e.tipo_mtto,
      estado: e.estado, costo: e.costo_real, duracion: e.duracion_horas,
    })),
    ...failures.map((f) => ({
      id: `fail-${f.id}`, date: f.fecha, asset_id: f.asset_id,
      asset_codigo: assetNames[f.asset_id] || f.asset_codigo || '—',
      type: 'Correctivo' as const, desc: f.descripcion || f.clasificacion_falla,
      estado: f.severidad || f.tipo_evento, costo: f.costo_reparacion,
      duracion: f.duracion_horas,
    })),
  ]
    .filter((item) => filter === 'all' || item.type.toLowerCase() === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalCost = unified.reduce((s, i) => s + (Number(i.costo) || 0), 0)
  const totalHours = unified.reduce((s, i) => s + (Number(i.duracion) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Órdenes de Trabajo</h1>
        <p className="text-sm text-[var(--text-secondary)]">Historial integrado de mantenimiento</p>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard title="Total Órdenes" value={String(unified.length)} icon="assignment" colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-900/30" />
        <KpiCard title="Costo Total" value={`S/${totalCost.toFixed(2)}`} icon="payments" colorClass="text-green-600 dark:text-green-400" bgClass="bg-green-50 dark:bg-green-900/30" />
        <KpiCard title="Horas Totales" value={`${totalHours.toFixed(1)}h`} icon="schedule" colorClass="text-purple-600 dark:text-purple-400" bgClass="bg-purple-50 dark:bg-purple-900/30" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
        {(['all', 'preventivo', 'correctivo'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
              filter === f ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {f === 'all' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {unified.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">No hay órdenes registradas</p>
      ) : (
        <div className="space-y-2">
          {unified.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-all">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item.type === 'Preventivo' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
              }`}>
                <span className="material-symbols-outlined text-lg">
                  {item.type === 'Preventivo' ? 'build' : 'warning'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{item.asset_codigo}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    item.type === 'Preventivo' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
                  }`}>{item.type}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] truncate">{item.desc || 'Sin descripción'}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
                  <span>{formatDateDMY(item.date)}</span>
                  {item.duracion && <span>{item.duracion}h</span>}
                  {item.costo && <span>S/{Number(item.costo).toFixed(2)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
