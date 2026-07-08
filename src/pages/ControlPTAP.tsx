import { useState, useEffect, useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatDateDMY } from '../utils/date'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function KpiCard({ title, value, unit, icon, colorClass, bgClass }: { title: string; value: string; unit?: string; icon: string; colorClass: string; bgClass: string }) {
  return (
    <div className="rounded-2xl p-6 border border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-300 bg-[var(--bg-card)] relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-10 transition-opacity ${colorClass}`}>
        <span className="material-symbols-outlined text-6xl">{icon}</span>
      </div>
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgClass} ${colorClass}`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
          {unit && <span className="text-xs font-medium text-[var(--text-muted)]">{unit}</span>}
        </div>
      </div>
    </div>
  )
}

export default function ControlPTAP() {
  const [dashboard, setDashboard] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dashboard' | 'diario'>('dashboard')
  const [mes, setMes] = useState('2026-06')
  const [diaDiario, setDiaDiario] = useState('2026-06-21')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ hora: '', caudal_entrada: '', caudal_salida: '', dosis_coagulante: '', turbiedad_entrada: '', turbiedad_salida: '', ph_entrada: '', ph_salida: '', cloro_residual: '', observaciones: '' })
  const [bulkData, setBulkData] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; inserted: number; skipped: number; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rangoMes = useMemo(() => {
    const [y, m] = mes.split('-').map(Number)
    const ultimo = new Date(y, m, 0).getDate()
    return { inicio: `${mes}-01`, fin: `${mes}-${String(ultimo).padStart(2, '0')}` }
  }, [mes])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/water/ptap/range?inicio=${rangoMes.inicio}&fin=${rangoMes.fin}`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/water/ptap/daily?fecha=${diaDiario}`).then((r) => r.json()).catch(() => []),
    ]).then(([data, d]) => {
      if (Array.isArray(data)) setDashboard(data)
      if (Array.isArray(d)) setDaily(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [rangoMes, diaDiario])

  const caudalDiario = useMemo(() => {
    const grouped: Record<string, { sum: number; count: number }> = {}
    dashboard.forEach((r: any) => {
      const day = r.fecha?.slice(0, 10)
      if (!day) return
      if (!grouped[day]) grouped[day] = { sum: 0, count: 0 }
      grouped[day].sum += Number(r.caudal) || 0
      grouped[day].count++
    })
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([day, g]) => ({
      day: (([y, m, dPart]) => `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m,10)-1]} ${dPart}`)(day.split('-')),
      caudal: Number((g.sum / g.count).toFixed(2)),
    }))
  }, [dashboard])

  const turbiedadDiario = useMemo(() => {
    const grouped: Record<string, { sumIng: number; sumSal: number; count: number }> = {}
    dashboard.forEach((r: any) => {
      const day = r.fecha?.slice(0, 10)
      if (!day) return
      if (!grouped[day]) grouped[day] = { sumIng: 0, sumSal: 0, count: 0 }
      grouped[day].sumIng += Number(r.ingreso_turbiedad) || 0
      grouped[day].sumSal += Number(r.tratada_turbiedad) || 0
      grouped[day].count++
    })
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([day, g]) => ({
      day: (([y, m, dPart]) => `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m,10)-1]} ${dPart}`)(day.split('-')),
      ingreso: Number((g.sumIng / g.count).toFixed(2)),
      salida: Number((g.sumSal / g.count).toFixed(2)),
    }))
  }, [dashboard])

  const statsResumen = useMemo(() => {
    if (!dashboard.length) return []
    const turbIng = dashboard.map((r: any) => Number(r.ingreso_turbiedad) || 0)
    const turbSal = dashboard.map((r: any) => Number(r.tratada_turbiedad) || 0)
    const caudales = dashboard.map((r: any) => Number(r.caudal) || 0)
    const cloros = dashboard.map((r: any) => Number(r.tratada_cloro) || 0)
    const phIng = dashboard.map((r: any) => Number(r.ingreso_ph) || 0)
    const phSal = dashboard.map((r: any) => Number(r.tratada_ph) || 0)
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
    const efic = turbIng.length > 0 ? ((1 - avg(turbSal) / avg(turbIng)) * 100) : 0
    return [
      { parametro: 'Caudal Promedio', valor: avg(caudales).toFixed(2), unidad: 'L/s', icon: 'water_drop', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' },
      { parametro: 'Turbiedad Ingreso', valor: avg(turbIng).toFixed(2), unidad: 'NTU', icon: 'cloud', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
      { parametro: 'Turbiedad Salida', valor: avg(turbSal).toFixed(2), unidad: 'NTU', icon: 'water', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
      { parametro: 'pH Promedio', valor: avg(phSal).toFixed(2), unidad: 'pH', icon: 'science', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
      { parametro: 'Cloro Residual', valor: avg(cloros).toFixed(2), unidad: 'mg/L', icon: 'cleaning_services', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
      { parametro: 'Eficiencia Remoción', valor: efic.toFixed(1), unidad: '%', icon: 'trending_up', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
    ]
  }, [dashboard])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const reloadData = async () => {
    const [data, d] = await Promise.all([
      fetch(`${API_BASE}/water/ptap/range?inicio=${rangoMes.inicio}&fin=${rangoMes.fin}`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/water/ptap/daily?fecha=${diaDiario}`).then((r) => r.json()).catch(() => []),
    ])
    if (Array.isArray(data)) setDashboard(data)
    if (Array.isArray(d)) setDaily(d)
  }

  const handleAdd = async () => {
    try {
      await fetch(`${API_BASE}/water/ptap`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fecha: `${mes}-${new Date().getDate().toString().padStart(2, '0')}` }),
      })
      setToast('Lectura agregada')
      setShowForm(false)
      setForm({ hora: '', caudal_entrada: '', caudal_salida: '', dosis_coagulante: '', turbiedad_entrada: '', turbiedad_salida: '', ph_entrada: '', ph_salida: '', cloro_residual: '', observaciones: '' })
      await reloadData()
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
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 300_000)
      try {
        const res = await fetch(`${API_BASE}/water/ptap/bulk`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readings }),
          signal: controller.signal,
        })
        clearTimeout(t)
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Error al importar')
        const skipped = result.total - result.inserted
        setImportResult({ total: result.total, inserted: result.inserted, skipped })
        setBulkData(''); setBulkMode(false)
      } catch (fetchErr: any) {
        clearTimeout(t)
        if (fetchErr.name === 'AbortError') throw new Error('La importación tardó demasiado, intente con menos datos')
        throw fetchErr
      }
      await reloadData()
    } catch (e: any) { setImportResult({ total: 0, inserted: 0, skipped: 0, error: e.message }) }
    finally { setImporting(false) }
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 300_000)
      try {
        const res = await fetch(`${API_BASE}/water/ptap/upload`, {
          method: 'POST', body: formData, signal: controller.signal,
        })
        clearTimeout(t)
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Error al importar')
        const skipped = result.total - result.inserted
        setImportResult({ total: result.total, inserted: result.inserted, skipped })
      } catch (fetchErr: any) {
        clearTimeout(t)
        if (fetchErr.name === 'AbortError') throw new Error('La importación tardó demasiado, intente con menos datos')
        throw fetchErr
      }
      await reloadData()
    } catch (err: any) { setImportResult({ total: 0, inserted: 0, skipped: 0, error: err.message }) }
    finally { setImporting(false) }
    if (fileInputRef.current) fileInputRef.current.value = ''
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
          <h1 className="text-lg font-bold text-[var(--text-primary)]">PTAP Portachuelo</h1>
          <p className="text-sm text-[var(--text-secondary)]">Planta de Tratamiento de Agua Potable</p>
        </div>
          <div className="flex items-center gap-2">
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
            <button onClick={() => { setBulkMode(false); setShowForm(true) }}
            className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
            Nueva Lectura
          </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="px-4 py-1.5 border border-[var(--border)] text-sm font-medium rounded-lg hover:bg-[var(--bg-hover)] transition-all text-[var(--text-secondary)] disabled:opacity-50">
            {importing ? 'Importando...' : 'Importar Excel'}
          </button>
            <button onClick={() => setBulkMode(true)}
            className="px-4 py-1.5 border border-[var(--border)] text-sm font-medium rounded-lg hover:bg-[var(--bg-hover)] transition-all text-[var(--text-secondary)]">
            Pegar datos
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
        {(['dashboard', 'diario'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
              tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {t === 'dashboard' ? 'Dashboard' : 'Registro Diario'}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <>
          {statsResumen.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statsResumen.map((item: any, i: number) => (
                <KpiCard key={i} title={item.parametro} value={item.valor} unit={item.unidad} icon={item.icon} colorClass={item.color} bgClass={item.bg} />
              ))}
            </div>
          )}

           {caudalDiario.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-12">Sin datos en este rango</p>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <span className="material-symbols-outlined text-xl">water_drop</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Caudal Promedio Diario</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">L/s</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={347}>
                  <AreaChart data={caudalDiario} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caudalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 700, angle: -45, textAnchor: 'end' } as any} axisLine={false} tickLine={false} interval="preserveStartEnd" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(v: number) => [v.toFixed(2), 'Caudal (L/s)']} />
                    <Area type="monotone" dataKey="caudal" name="Caudal (L/s)" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#caudalGrad)" dot={{ r: 3, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          )}

          {turbiedadDiario.length === 0 ? null : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <span className="material-symbols-outlined text-xl">water</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Turbiedad Promedio Diario</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">NTU</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={347}>
                  <AreaChart data={turbiedadDiario} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="turbIngGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="turbSalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 700, angle: -45, textAnchor: 'end' } as any} axisLine={false} tickLine={false} interval="preserveStartEnd" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }} />
                    <Area type="monotone" dataKey="ingreso" name="Turb. Ingreso" stroke="#f59e0b" strokeWidth={2.5} fill="url(#turbIngGrad)" dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="salida" name="Turb. Salida" stroke="#10b981" strokeWidth={2.5} fill="url(#turbSalGrad)" dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Daily Tab */}
      {tab === 'diario' && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[var(--text-muted)] font-medium">Día:</span>
            <input type="date" value={diaDiario} onChange={(e) => setDiaDiario(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
          </div>
          {daily.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-12">Sin lecturas para {formatDateDMY(diaDiario)}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="text-left p-3">Hora</th>
                    <th className="text-left p-3">Caudal Ent.</th>
                    <th className="text-left p-3">Caudal Sal.</th>
                    <th className="text-left p-3">Turbiedad Ent.</th>
                    <th className="text-left p-3">Turbiedad Sal.</th>
                    <th className="text-left p-3">pH Ent.</th>
                    <th className="text-left p-3">pH Sal.</th>
                    <th className="text-left p-3">Cloro Res.</th>
                    <th className="text-left p-3">Dosis Coag.</th>
                    <th className="text-left p-3">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {daily.map((r: any) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-3 text-[var(--text-primary)] font-medium">{r.hora || '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.caudal_entrada ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.caudal_salida ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.turbiedad_entrada ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.turbiedad_salida ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.ph_entrada ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.ph_salida ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.cloro_residual ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{r.dosis_coagulante ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)] max-w-[120px] truncate">{r.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* New Reading Form */}
      {showForm && !bulkMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Nueva Lectura PTAP</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Hora</label>
                <input type="time" value={form.hora} onChange={(e) => set('hora', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Caudal Entrada</label>
                  <input type="number" step="0.01" value={form.caudal_entrada} onChange={(e) => set('caudal_entrada', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Caudal Salida</label>
                  <input type="number" step="0.01" value={form.caudal_salida} onChange={(e) => set('caudal_salida', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Turbiedad Entrada</label>
                  <input type="number" step="0.01" value={form.turbiedad_entrada} onChange={(e) => set('turbiedad_entrada', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Turbiedad Salida</label>
                  <input type="number" step="0.01" value={form.turbiedad_salida} onChange={(e) => set('turbiedad_salida', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">pH Entrada</label>
                  <input type="number" step="0.1" value={form.ph_entrada} onChange={(e) => set('ph_entrada', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">pH Salida</label>
                  <input type="number" step="0.1" value={form.ph_salida} onChange={(e) => set('ph_salida', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Cloro Residual</label>
                  <input type="number" step="0.01" value={form.cloro_residual} onChange={(e) => set('cloro_residual', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Dosis Coagulante</label>
                  <input type="number" step="0.01" value={form.dosis_coagulante} onChange={(e) => set('dosis_coagulante', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Observaciones</label>
                <textarea value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} rows={2}
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
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Importar Lecturas PTAP</h3>
              <button onClick={() => setBulkMode(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Pega datos separados por tabulador. Primera fila = encabezados.</p>
              <textarea value={bulkData} onChange={(e) => setBulkData(e.target.value)} rows={8}
                placeholder={'fecha\thora\tcaudal_entrada\tcaudal_salida\tturbiedad_entrada\tturbiedad_salida\n2026-01-15\t08:00\t120.0\t115.0\t5.2\t0.8'}
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

      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)]" onClick={() => setImportResult(null)}>
          <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              {importResult.error ? (
                <>
                  <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">error</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Error al importar</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{importResult.error}</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Importación exitosa</h3>
                  <div className="space-y-1 text-sm text-[var(--text-secondary)] mb-4">
                    <p className="flex justify-between"><span>Total registros:</span><span className="font-semibold text-[var(--text-primary)]">{importResult.total}</span></p>
                    <p className="flex justify-between"><span>Insertados:</span><span className="font-semibold text-green-600 dark:text-green-400">{importResult.inserted}</span></p>
                    {importResult.skipped > 0 && (
                      <p className="flex justify-between"><span>Duplicados omitidos:</span><span className="font-semibold text-amber-600 dark:text-amber-400">{importResult.skipped}</span></p>
                    )}
                  </div>
                </>
              )}
              <button onClick={() => setImportResult(null)}
                className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}