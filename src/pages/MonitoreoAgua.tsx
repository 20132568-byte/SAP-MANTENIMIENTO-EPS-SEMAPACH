import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { n2 } from '../utils/format'
import KpiCard from '../components/KpiCard'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const distritos = ['Alto Larán', 'Chincha Alta', 'Chincha Baja', 'Grocio Prado', 'Pueblo Nuevo', 'Sunampe', 'Tambo de Mora']
const zonas = ['Alta', 'Media', 'Baja']

function colorPresion(v: number) {
  if (v >= 10) return '#22C55E'
  if (v >= 5) return '#EAB308'
  return '#EF4444'
}

function colorContinuidad(v: number) {
  if (v >= 12) return '#22C55E'
  if (v >= 8) return '#EAB308'
  return '#EF4444'
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString()
}

function getMonthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key: string) {
  const [y, m] = key.split('-')
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${months[parseInt(m) - 1]} ${y}`
}

export default function MonitoreoAgua() {
  const [readings, setReadings] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'lecturas' | 'estadisticas'>('lecturas')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ distrito: '', zona: '', presion: '', continuidad: '' })
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const inicioAnio = '2026-01-01'
  const finAnio = '2026-12-31'

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ inicio: inicioAnio, fin: finAnio })
    Promise.all([
      fetch(`${API_BASE}/water/readings?${params}`).then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json() }),
      fetch(`${API_BASE}/water/stats?inicio=${inicioAnio}&fin=${finAnio}`).then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json() }),
    ]).then(([r, s]) => {
      if (!Array.isArray(r)) throw new Error('Formato de lecturas inválido')
      setReadings(r)
      setStats(s)
      setLoading(false)
    }).catch((e) => {
      setError(e.message)
      setLoading(false)
    })
  }, [])

  const monthsAvailable = useMemo(() => {
    const keys = new Set<string>()
    readings.forEach((r) => keys.add(getMonthKey(r.fecha)))
    return Array.from(keys).sort()
  }, [readings])

  useEffect(() => {
    if (!selectedMonth && monthsAvailable.length > 0) {
      setSelectedMonth(monthsAvailable[monthsAvailable.length - 1])
    }
  }, [monthsAvailable, selectedMonth])

  const filteredReadings = useMemo(() => {
    if (!selectedMonth) return readings
    return readings.filter((r) => getMonthKey(r.fecha) === selectedMonth)
  }, [readings, selectedMonth])

  const filteredStats = useMemo(() => {
    if (!selectedMonth || !stats?.porDistrito) return stats
    const prefix = selectedMonth
    const data = readings.filter((r) => getMonthKey(r.fecha) === prefix)
    const grouped: Record<string, any> = {}
    data.forEach((r) => {
      if (!grouped[r.distrito]) {
        grouped[r.distrito] = { distrito: r.distrito, sum_presion: 0, sum_continuidad: 0, max_presion: -Infinity, min_presion: Infinity, count: 0 }
      }
      const g = grouped[r.distrito]
      g.sum_presion += Number(r.presion) || 0
      g.sum_continuidad += Number(r.continuidad) || 0
      g.max_presion = Math.max(g.max_presion, Number(r.presion) || 0)
      g.min_presion = Math.min(g.min_presion, Number(r.presion) || Infinity)
      g.count++
    })
    const porDistrito = Object.values(grouped).map((g: any) => ({
      distrito: g.distrito,
      avg_presion: Number((g.sum_presion / g.count).toFixed(2)),
      avg_continuidad: Number((g.sum_continuidad / g.count).toFixed(2)),
      max_presion: Number(g.max_presion.toFixed(2)),
      min_presion: Number((g.min_presion === Infinity ? 0 : g.min_presion).toFixed(2)),
    }))
    return { porDistrito }
  }, [readings, stats, selectedMonth])



  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const refreshReadings = async () => {
    const params = new URLSearchParams({ inicio: inicioAnio, fin: finAnio })
    const res = await fetch(`${API_BASE}/water/readings?${params}`)
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    if (Array.isArray(data)) setReadings(data)
  }

  const handleAdd = async () => {
    try {
      const res = await fetch(`${API_BASE}/water/readings/bulk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings: [{ ...form, fecha }] }),
      })
      if (!res.ok) throw new Error(await res.text())
      setToast('Lectura agregada')
      setShowForm(false)
      setForm({ distrito: '', zona: '', presion: '', continuidad: '' })
      await refreshReadings()
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleBulkImport = async () => {
    if (!bulkData.trim()) return
    setImporting(true)
    try {
      const lines = bulkData.trim().split('\n')
      const headers = lines[0].split('\t')
      const readings = lines.slice(1).map((line) => {
        const vals = line.split('\t')
        const obj: any = {}
        headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim() })
        return obj
      })
      const res = await fetch(`${API_BASE}/water/readings/bulk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings }),
      })
      if (!res.ok) throw new Error(await res.text())
      setToast(`${readings.length} lecturas importadas`)
      setBulkData(''); setBulkMode(false)
      await refreshReadings()
    } catch (e: any) { setToast(e.message) }
    setImporting(false)
    setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-[var(--text-muted)]">Error al cargar datos</p>
        <p className="text-xs text-[var(--accent)]">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Monitoreo de Agua</h1>
          <p className="text-sm text-[var(--text-secondary)]">Control hídrico — presión y continuidad por distrito</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setBulkMode(false); setShowForm(true) }}
            className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
            Nueva Lectura
          </button>
          <button onClick={() => setBulkMode(true)}
            className="px-4 py-1.5 border border-[var(--border)] text-sm font-medium rounded-lg hover:bg-[var(--bg-hover)] transition-all text-[var(--text-secondary)]">
            Importar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
        {(['lecturas', 'estadisticas'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
              tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {t === 'lecturas' ? 'Lecturas' : 'Estadísticas'}
          </button>
        ))}
      </div>

      {/* Month Filter */}
      {monthsAvailable.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-medium">Mes:</span>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
            {monthsAvailable.map((m) => (
              <option key={m} value={m}>{getMonthLabel(m)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lecturas Tab */}
      {tab === 'lecturas' && (
        <>
          {filteredReadings.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-12">No hay lecturas en este mes</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-left p-3">Distrito</th>
                    <th className="text-left p-3">Zona</th>
                    <th className="text-left p-3">Presión (kg)</th>
                    <th className="text-left p-3">Continuidad (hrs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredReadings.map((r: any) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-3 text-[var(--text-primary)]">{formatFecha(r.fecha)}</td>
                      <td className="p-3 text-[var(--text-primary)] font-medium">{r.distrito}</td>
                      <td className="p-3 text-[var(--text-primary)]">{r.zona}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{n2(r.presion)}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{n2(r.continuidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Estadísticas Tab */}
      {tab === 'estadisticas' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const data = filteredStats?.porDistrito
              if (!data?.length) return null
              const avgPresion = (data.reduce((s: number, d: any) => s + d.avg_presion, 0) / data.length).toFixed(2)
              const avgContinuidad = (data.reduce((s: number, d: any) => s + d.avg_continuidad, 0) / data.length).toFixed(2)
              const maxPresion = Math.max(...data.map((d: any) => d.max_presion)).toFixed(2)
              const minPresion = Math.min(...data.map((d: any) => d.min_presion)).toFixed(2)
              return (
                <>
                  <KpiCard title="Presión Promedio" value={avgPresion} unit="kg" icon="speed" colorClass="text-sky-600 dark:text-sky-400" bgClass="bg-sky-50 dark:bg-sky-900/30" />
                  <KpiCard title="Continuidad Promedio" value={avgContinuidad} unit="hrs" icon="water_drop" colorClass="text-cyan-600 dark:text-cyan-400" bgClass="bg-cyan-50 dark:bg-cyan-900/30" />
                  <KpiCard title="Max Presión" value={maxPresion} unit="kg" icon="trending_up" colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-900/30" />
                  <KpiCard title="Min Presión" value={minPresion} unit="kg" icon="trending_down" colorClass="text-red-600 dark:text-red-400" bgClass="bg-red-50 dark:bg-red-900/30" />
                </>
              )
            })()}
            {(!filteredStats?.porDistrito?.length) && (
              <p className="text-center text-[var(--text-muted)] py-12 col-span-full">Sin estadísticas para este mes</p>
            )}
          </div>

          {/* Charts */}
          {filteredStats?.porDistrito?.length > 0 && (
            <>
              {/* Pressure by District */}
              <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-xl">bar_chart</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Presión y Continuidad por Distrito</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">{selectedMonth}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={filteredStats.porDistrito} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="distrito" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(v: number) => [v.toFixed(2), 'Presión (kg)']} />
                    <Bar dataKey="avg_presion" name="Presión (kg)" radius={[4, 4, 0, 0]}>
                      {filteredStats.porDistrito.map((d: any, idx: number) => (
                        <Cell key={idx} fill={colorPresion(d.avg_presion)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Continuity by District */}
              <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-xl">bar_chart</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Continuidad por Distrito</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">{selectedMonth}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={filteredStats.porDistrito} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="distrito" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(v: number) => [v.toFixed(2), 'Continuidad (hrs)']} />
                    <Bar dataKey="avg_continuidad" name="Continuidad (hrs)" radius={[4, 4, 0, 0]}>
                      {filteredStats.porDistrito.map((d: any, idx: number) => (
                        <Cell key={idx} fill={colorContinuidad(d.avg_continuidad)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </>
          )}
        </div>
      )}

      {/* New Reading Form Modal */}
      {showForm && !bulkMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Nueva Lectura</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Distrito</label>
                <select value={form.distrito} onChange={(e) => set('distrito', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="">Seleccionar</option>
                  {distritos.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Zona</label>
                <select value={form.zona} onChange={(e) => set('zona', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="">Seleccionar</option>
                  {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Presión (kg)</label>
                <input type="number" step="0.01" value={form.presion} onChange={(e) => set('presion', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Continuidad (hrs)</label>
                <input type="number" step="0.5" value={form.continuidad} onChange={(e) => set('continuidad', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleAdd} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setBulkMode(false)}>
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Importar Lecturas</h3>
              <button onClick={() => setBulkMode(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Pega datos separados por tabulador. Primera fila = encabezados.</p>
              <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} rows={8}
                placeholder={'fecha\tdistrito\tzona\tpresion\tcontinuidad\n2026-02-01\tChincha Alta\tAlta\t14.5\t17.5'}
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 font-mono" />
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setBulkMode(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleBulkImport} disabled={importing}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-sm text-[var(--text-primary)] animate-in">{toast}</div>
      )}
    </div>
  )
}
