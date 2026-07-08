import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { formatDateDMY } from '../utils/date'

type ReportType = 'fallas' | 'preventivos' | 'diario' | 'kpi'

export default function Reportes() {
  const { assetType } = useAssetType()
  const [type, setType] = useState<ReportType>('fallas')
  const [desde, setDesde] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadReport = () => {
    setLoading(true)
    let promise: Promise<any[]>
    switch (type) {
      case 'fallas':
        promise = api.getFailures({ categoria: assetType, desde, hasta })
        break
      case 'preventivos':
        promise = api.getPreventiveEvents({ categoria: assetType, desde, hasta })
        break
      case 'diario':
        promise = api.getDailyRecords({ categoria: assetType, desde, hasta })
        break
      case 'kpi':
        promise = api.getKPIPorActivo(desde, hasta, undefined, assetType).then((k) => k || [])
        break
      default:
        promise = Promise.resolve([])
    }
    promise.then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { loadReport() }, [type, assetType, desde, hasta])

  const exportCSV = () => {
    if (data.length === 0) return
    const cols = Object.keys(data[0]).filter((c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at')
    const header = cols.join(',')
    const rows = data.map((row) => cols.map((c) => {
      const v = row[c]
      if (v === null || v === undefined) return ''
      const s = String(v)
      return s.includes(',') ? `"${s}"` : s
    }).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `reporte-${type}-${desde}-${hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToast('CSV exportado')
    setTimeout(() => setToast(null), 2500)
  }

  const cols: Record<ReportType, string[]> = {
    fallas: ['fecha', 'asset_codigo', 'tipo_evento', 'clasificacion_falla', 'severidad', 'duracion_horas', 'costo_reparacion'],
    preventivos: ['fecha', 'asset_codigo', 'tipo_mtto', 'estado', 'duracion_horas', 'costo_real'],
    diario: ['fecha', 'asset_codigo', 'operador_nombre', 'horas_programadas', 'horas_reales', 'km_recorridos', 'estado_dia'],
    kpi: ['asset_codigo', 'disponibilidad', 'mtbf', 'mttr', 'total_fallas', 'salud', 'riesgo', 'costo_total'],
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Reportes</h1>
          <p className="text-sm text-[var(--text-secondary)]">Exportación de datos operativos</p>
        </div>
        <button onClick={exportCSV} disabled={data.length === 0}
          className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40">
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Reporte</label>
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] mt-1">
            {(['fallas', 'preventivos', 'diario', 'kpi'] as ReportType[]).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                  type === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}>
                {t === 'diario' ? 'Diario' : t === 'kpi' ? 'KPI' : t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Desde</label>
          <input type="date" name="desde" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="mt-1 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 font-mono" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Hasta</label>
          <input type="date" name="hasta" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="mt-1 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 font-mono" />
        </div>
        <div className="text-xs text-[var(--text-muted)] pb-1">{data.length} registros</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">Sin datos para este reporte</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {cols[type].map((c) => (
                  <th key={c} className="text-left p-3">{c.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.map((row: any, i: number) => (
                <tr key={row.id || i} className="hover:bg-[var(--bg-hover)] transition-colors">
                  {cols[type].map((c) => {
                    const v = row[c]
                    let display = v ?? '—'
                    if ((c === 'fecha' || c === 'fecha_mantenimiento') && v) display = formatDateDMY(v)
                    if ((c === 'costo_reparacion' || c === 'costo_real' || c === 'costo_total') && v) display = `S/${Number(v).toFixed(2)}`
                    if ((c === 'disponibilidad' || c === 'salud') && v != null) display = `${Number(v).toFixed(1)}%`
                    if ((c === 'mtbf' || c === 'mttr' || c === 'duracion_horas') && v != null) display = `${Number(v).toFixed(1)}h`
                    return <td key={c} className="p-3 text-[var(--text-secondary)]">{display}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-sm text-[var(--text-primary)] animate-in">{toast}</div>
      )}
    </div>
  )
}
