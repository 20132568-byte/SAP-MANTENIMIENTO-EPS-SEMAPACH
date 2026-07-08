import { useState, useEffect } from 'react'
import { api } from '../api/client'
import KpiCard from '../components/KpiCard'

export default function PlanMantenimiento2026() {
  const [activities, setActivities] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterEstacion, setFilterEstacion] = useState('')
  const [filterMes, setFilterMes] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getPlan2026Activities().then((act) => {
      setActivities(act)
      const completed = act.filter((a: any) => a.estado === 'Ejecutado' || a.estado === 'Completado').length
      const pending = act.length - completed
      setSummary({ total_actividades: act.length, ejecutadas: completed, pendientes: pending })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const estaciones = [...new Set(activities.map((a: any) => a.estacion || a.codigo_estacion).filter(Boolean))].sort()
  const meses = [...new Set(activities.map((a: any) => a.mes).filter(Boolean))].sort()

  const filtered = activities.filter((a) => {
    if (filterEstacion && a.estacion !== filterEstacion && a.codigo_estacion !== filterEstacion) return false
    if (filterMes && a.mes !== filterMes) return false
    return true
  })

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Ejecutado': case 'Completado': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
      case 'En Progreso': return 'text-[var(--color-info)] bg-[var(--color-info-bg)]'
      case 'Pendiente': case 'Programado': return 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]'
      case 'Vencido': return 'text-[var(--color-error)] bg-[var(--color-error-bg)]'
      default: return 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]'
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
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Plan de Mantenimiento 2026</h1>
        <p className="text-sm text-[var(--text-secondary)]">{activities.length} actividades programadas</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard title="Total" value={summary.total_actividades} icon="assignment" colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-900/30" />
          <KpiCard title="Ejecutadas" value={summary.ejecutadas} icon="task_alt" colorClass="text-green-600 dark:text-green-400" bgClass="bg-green-50 dark:bg-green-900/30" />
          <KpiCard title="Pendientes" value={summary.pendientes} icon="pending_actions" colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-900/30" />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select value={filterEstacion} onChange={(e) => setFilterEstacion(e.target.value)}
          className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
          <option value="">Todas las estaciones</option>
          {estaciones.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterMes} onChange={(e) => setFilterMes(e.target.value)}
          className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
          <option value="">Todos los meses</option>
          {meses.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-[var(--text-muted)] self-center">{filtered.length} actividades</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">Sin actividades</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Actividad</th>
                <th className="text-left p-3">Estación</th>
                <th className="text-left p-3">Mes</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Presupuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="p-3 text-[var(--text-primary)] font-medium">{a.codigo || '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)] max-w-[250px]">{a.descripcion || a.actividad || '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{a.estacion || a.codigo_estacion || '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{a.mes || '—'}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(a.estado)}`}>{a.estado || '—'}</span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">S/{Number(a.presupuesto_anual || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
