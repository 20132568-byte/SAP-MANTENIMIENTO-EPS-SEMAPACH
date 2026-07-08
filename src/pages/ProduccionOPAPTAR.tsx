import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend, LineChart, Line, ReferenceLine, LabelList
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// ─── Colores por defecto para las fuentes ────────────────────────────────────
const COLORES_DEF: Record<string, string> = {
  pz10_m3: '#0284c7',
  pz11_m3: '#0369a1',
  pz13_m3: '#075985',
  pzmed_m3: '#0c4a6e',
  gfmin_m3: '#0d9488',
  ptap1_m3: '#0ea5e9',
  gfnar_m3: '#14b8a6',
  pzchb_m3: '#38bdf8',
  pzcm_m3: '#7dd3fc',
  pztm_m3: '#bae6fd',
  ebaphija_m3: '#1d4ed8',
  ebapalar_m3: '#2563eb',
  ebappnue_m3: '#3b82f6',
}

const FUENTES_META = [
  { key: 'pz10_m3',     caudal: 'pz10_caudal',     horas: 'pz10_horas',     label: 'PZ 10' },
  { key: 'pz11_m3',     caudal: 'pz11_caudal',     horas: 'pz11_horas',     label: 'PZ 11' },
  { key: 'pz13_m3',     caudal: 'pz13_caudal',     horas: 'pz13_horas',     label: 'PZ 13' },
  { key: 'pzmed_m3',    caudal: 'pzmed_caudal',    horas: 'pzmed_horas',    label: 'PZ Medrano' },
  { key: 'gfmin_m3',    caudal: 'gfmin_caudal',    horas: 'gfmin_horas',    label: 'GF Minaqueros' },
  { key: 'ptap1_m3',    caudal: 'ptap1_caudal',    horas: 'ptap1_horas',    label: 'PTAP Portachuelos' },
  { key: 'gfnar_m3',    caudal: 'gfnar_caudal',    horas: 'gfnar_horas',    label: 'GF Naranjal' },
  { key: 'pzchb_m3',    caudal: 'pzchb_caudal',    horas: 'pzchb_horas',    label: 'PZ Chincha Baja' },
  { key: 'pzcm_m3',     caudal: 'pzcm_caudal',     horas: 'pzcm_horas',     label: 'PZ Calle Mora' },
  { key: 'pztm_m3',     caudal: 'pztm_caudal',     horas: 'pztm_horas',     label: 'PZ Tambo' },
  { key: 'ebaphija_m3', caudal: 'ebaphija_caudal', horas: 'ebaphija_horas', label: 'CBAP Hijaya' },
  { key: 'ebapalar_m3', caudal: 'ebapalar_caudal', horas: 'ebapalar_horas', label: 'CBAP Alto Larán' },
  { key: 'ebappnue_m3', caudal: 'ebappnue_caudal', horas: 'ebappnue_horas', label: 'CBAP Pueblo Nuevo' },
]

const GRUPOS = [
  { label: 'Pozos', keys: ['pz10_m3','pz11_m3','pz13_m3','pzmed_m3','pzchb_m3','pzcm_m3','pztm_m3'], color: '#0ea5e9' },
  { label: 'PTAP / GF', keys: ['gfmin_m3','ptap1_m3','gfnar_m3'], color: '#10b981' },
  { label: 'CBAP / EBAP', keys: ['ebaphija_m3','ebapalar_m3','ebappnue_m3'], color: '#8b5cf6' },
]

function n(v: any): number { const x = Number(v); return isNaN(x) ? 0 : x }
function fmt(v: number, dec = 0): string {
  if (!v) return '0'
  return v.toLocaleString('es-PE', { maximumFractionDigits: dec })
}

const TT: any = {
  contentStyle: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.15)',
  },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 700 },
  itemStyle: { color: 'var(--text-secondary)' },
}

// ─── Card contenedor de gráfico ────────────────────────────────────────────
function Card({ title, subtitle, icon, bg, ic, children }: {
  title: string; subtitle?: string; icon: string
  bg: string; ic: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${ic}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="text-[10px] text-[var(--text-muted)] font-medium">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({ title, value, unit, icon, colorClass, bgClass }: {
  title: string; value: string | number; unit?: string; icon: string; colorClass: string; bgClass: string
}) {
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

// ─── Navega un día hacia adelante o atrás ─────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Selector de fecha con dropdowns DD/MM/AAAA ───────────────────────────
function DateInputDMY({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split('-')
  const y = parts[0] || '2026'
  const m = parts[1] || '04'
  const d = parts[2] || '28'

  const meses = [
    { v: '01', label: 'Enero' },
    { v: '02', label: 'Febrero' },
    { v: '03', label: 'Marzo' },
    { v: '04', label: 'Abril' },
    { v: '05', label: 'Mayo' },
    { v: '06', label: 'Junio' },
    { v: '07', label: 'Julio' },
    { v: '08', label: 'Agosto' },
    { v: '09', label: 'Setiembre' },
    { v: '10', label: 'Octubre' },
    { v: '11', label: 'Noviembre' },
    { v: '12', label: 'Diciembre' }
  ]

  const diasEnMes = new Date(Number(y), Number(m), 0).getDate()
  const dias = Array.from({ length: diasEnMes }, (_, i) => String(i + 1).padStart(2, '0'))

  const handleDayChange = (newDay: string) => onChange(`${y}-${m}-${newDay}`)
  const handleMonthChange = (newMonth: string) => {
    const maxDias = new Date(Number(y), Number(newMonth), 0).getDate()
    const ajustado = Number(d) > maxDias ? String(maxDias).padStart(2, '0') : d
    onChange(`${y}-${newMonth}-${ajustado}`)
  }
  const handleYearChange = (newYear: string) => onChange(`${newYear}-${m}-${d}`)

  return (
    <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-sm">
      <select
        value={d}
        onChange={e => handleDayChange(e.target.value)}
        className="bg-transparent text-sm font-bold text-[var(--text-primary)] focus:outline-none px-2 py-1.5 cursor-pointer rounded-lg hover:bg-[var(--bg-hover)]"
      >
        {dias.map(day => <option key={day} value={day} className="bg-[var(--bg-card)]">{day}</option>)}
      </select>

      <span className="text-[var(--text-muted)] font-medium">/</span>

      <select
        value={m}
        onChange={e => handleMonthChange(e.target.value)}
        className="bg-transparent text-sm font-bold text-[var(--text-primary)] focus:outline-none px-2 py-1.5 cursor-pointer rounded-lg hover:bg-[var(--bg-hover)]"
      >
        {meses.map(mes => <option key={mes.v} value={mes.v} className="bg-[var(--bg-card)]">{mes.label}</option>)}
      </select>

      <span className="text-[var(--text-muted)] font-medium">/</span>

      <select
        value={y}
        onChange={e => handleYearChange(e.target.value)}
        className="bg-transparent text-sm font-bold text-[var(--text-primary)] focus:outline-none px-2 py-1.5 cursor-pointer rounded-lg hover:bg-[var(--bg-hover)]"
      >
        {['2025', '2026', '2027'].map(year => <option key={year} value={year} className="bg-[var(--bg-card)]">{year}</option>)}
      </select>
    </div>
  )
}

export default function ProduccionOPAPTAR() {
  const hoy = new Date().toISOString().slice(0, 10)
  const [activeTab, setActiveTab] = useState<'diario' | 'mensual'>('diario')

  // 🎨 Estado de colores dinámicos (Persistido en localStorage)
  const [colores, setColores] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('opaptar_colores_fuentes')
    if (saved) {
      try {
        return { ...COLORES_DEF, ...JSON.parse(saved) }
      } catch (e) {
        return COLORES_DEF
      }
    }
    return COLORES_DEF
  })

  const [showColorPanel, setShowColorPanel] = useState(false)

  const cambiarColor = (key: string, newColor: string) => {
    const act = { ...colores, [key]: newColor }
    setColores(act)
    localStorage.setItem('opaptar_colores_fuentes', JSON.stringify(act))
  }

  const restaurarColoresDefecto = () => {
    setColores(COLORES_DEF)
    localStorage.removeItem('opaptar_colores_fuentes')
  }

  // Mapeamos metadatos dinámicos con el color del estado actual
  const fuentesConfig = useMemo(() => {
    return FUENTES_META.map(f => ({
      ...f,
      color: colores[f.key] || COLORES_DEF[f.key]
    }))
  }, [colores])

  // Estados para Vista Diaria
  const [fechaDiaria, setFechaDiaria] = useState('2026-04-28')
  const [bdDia, setBdDia] = useState<any>(null)
  const [surtidorDia, setSurtidorDia] = useState<any[]>([])
  const [loadingDia, setLoadingDia] = useState(true)
  const [noDataDia, setNoDataDia] = useState(false)

  // Estados para Vista Mensual
  const [mesSeleccionado, setMesSeleccionado] = useState('2026-04')
  const [bdMesRows, setBdMesRows] = useState<any[]>([])
  const [surtidorMesRows, setSurtidorMesRows] = useState<any[]>([])
  const [loadingMes, setLoadingMes] = useState(true)

  // Estados de importación de Excel
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Cargar datos diarios individuales
  const cargarDia = useCallback(async (f: string) => {
    setLoadingDia(true)
    setNoDataDia(false)
    setBdDia(null)
    setSurtidorDia([])

    try {
      const [bd, surt] = await Promise.all([
        fetch(`${API_BASE}/produccion/bd?desde=${f}&hasta=${f}&limit=1`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/produccion/surtidor?desde=${f}&hasta=${f}&limit=500`).then(r => r.json()).catch(() => []),
      ])

      const row = Array.isArray(bd) ? bd[0] : null
      if (!row) setNoDataDia(true)
      setBdDia(row || null)
      setSurtidorDia(Array.isArray(surt) ? surt : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDia(false)
    }
  }, [])

  // Cargar datos mensuales agregados
  const rangoMes = useMemo(() => {
    const [y, m] = mesSeleccionado.split('-').map(Number)
    const ultimoDia = new Date(y, m, 0).getDate()
    return {
      inicio: `${mesSeleccionado}-01`,
      fin: `${mesSeleccionado}-${String(ultimoDia).padStart(2, '0')}`
    }
  }, [mesSeleccionado])

  const cargarMes = useCallback(async () => {
    setLoadingMes(true)
    try {
      const [bd, surt] = await Promise.all([
        fetch(`${API_BASE}/produccion/bd?desde=${rangoMes.inicio}&hasta=${rangoMes.fin}&limit=100`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/produccion/surtidor?desde=${rangoMes.inicio}&hasta=${rangoMes.fin}&limit=2000`).then(r => r.json()).catch(() => []),
      ])
      setBdMesRows(Array.isArray(bd) ? bd : [])
      setSurtidorMesRows(Array.isArray(surt) ? surt : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMes(false)
    }
  }, [rangoMes])

  // Desencadenantes de carga
  useEffect(() => {
    if (activeTab === 'diario') {
      cargarDia(fechaDiaria)
    } else {
      cargarMes()
    }
  }, [activeTab, fechaDiaria, mesSeleccionado, cargarDia, cargarMes])

  // Handler de importación de Excel
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    showToast("Procesando libro de Excel...")

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/produccion/import`, {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al importar')

      showToast(result.message || '¡Importación de Excel exitosa!')
      if (activeTab === 'diario') await cargarDia(fechaDiaria)
      else await cargarMes()
    } catch (err: any) {
      showToast(`Error al importar: ${err.message}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── PROCESAMIENTO VISTA DIARIA ─────────────────────────────────────────────
  const barM3Dia = useMemo(() => {
    if (!bdDia) return []
    return fuentesConfig
      .map(f => ({ name: f.label, m3: n(bdDia[f.key]), color: f.color }))
      .filter(d => d.m3 > 0)
      .sort((a, b) => b.m3 - a.m3)
  }, [bdDia, fuentesConfig])

  const barCaudalDia = useMemo(() => {
    if (!bdDia) return []
    return fuentesConfig
      .map(f => ({ name: f.label, caudal: n(bdDia[f.caudal]), color: f.color }))
      .filter(d => d.caudal > 0)
      .sort((a, b) => b.caudal - a.caudal)
  }, [bdDia, fuentesConfig])

  const barHorasDia = useMemo(() => {
    if (!bdDia) return []
    return fuentesConfig
      .map(f => ({ name: f.label, horas: n(bdDia[f.horas]), color: f.color }))
      .filter(d => d.horas > 0)
      .sort((a, b) => b.horas - a.horas)
  }, [bdDia, fuentesConfig])

  const pieDataDia = useMemo(() => barM3Dia.map(d => ({ name: d.name, value: d.m3, color: d.color })), [barM3Dia])
  const totalM3Dia = useMemo(() => barM3Dia.reduce((s, d) => s + d.m3, 0), [barM3Dia])

  const surtVehiculoDia = useMemo(() => {
    const m: Record<string, { placa: string; tipo: string; galones: number; viajes: number }> = {}
    surtidorDia.forEach(r => {
      const k = r.placa || 'SIN PLACA'
      if (!m[k]) m[k] = { placa: k, tipo: r.tvehiculo || '—', galones: 0, viajes: 0 }
      m[k].galones += n(r.volumen_gln)
      m[k].viajes++
    })
    return Object.values(m).sort((a, b) => b.galones - a.galones)
  }, [surtidorDia])

  const totalGalonesDia = useMemo(() => surtVehiculoDia.reduce((s, v) => s + v.galones, 0), [surtVehiculoDia])
  const liderDia = barM3Dia.slice(0, 1)[0]

  const fechaLabelDia = new Date(fechaDiaria + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── PROCESAMIENTO VISTA MENSUAL ────────────────────────────────────────────
  const datosDiariosMes = useMemo(() => {
    return bdMesRows
      .filter(r => r.fecha)
      .map(r => {
        const total = fuentesConfig.reduce((s, f) => s + n(r[f.key]), 0)
        const gpos: Record<string, number> = {}
        GRUPOS.forEach(g => {
          gpos[g.label] = g.keys.reduce((s, k) => s + n(r[k]), 0)
        })
        const dStr = r.fecha?.slice ? r.fecha.slice(8, 10) : String(r.fecha).slice(8,10)
        return {
          diaNum: parseInt(dStr, 10),
          diaLabel: `Día ${parseInt(dStr, 10)}`,
          fecha: r.fecha?.slice ? r.fecha.slice(0, 10) : r.fecha,
          total,
          ...fuentesConfig.reduce((o, f) => ({ ...o, [f.key]: n(r[f.key]) }), {}),
          ...gpos,
        }
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [bdMesRows, fuentesConfig])

  const surtidorDiarioMes = useMemo(() => {
    const m: Record<number, { galones: number; viajes: number }> = {}
    surtidorMesRows.forEach(r => {
      const fecha = r.fecha?.slice ? r.fecha.slice(0, 10) : String(r.fecha || '').slice(0, 10)
      if (!fecha || fecha.length < 10) return
      const dNum = parseInt(fecha.slice(8, 10), 10)
      if (!m[dNum]) m[dNum] = { galones: 0, viajes: 0 }
      m[dNum].galones += n(r.volumen_gln)
      m[dNum].viajes++
    })
    return Object.keys(m).map(Number).sort((a,b)=>a-b).map(dNum => ({
      diaNum: dNum,
      diaLabel: `Día ${dNum}`,
      galones: m[dNum].galones,
      viajes: m[dNum].viajes
    }))
  }, [surtidorMesRows])

  const pieDataMes = useMemo(() => {
    return GRUPOS.map(g => ({
      name: g.label,
      value: Math.round(bdMesRows.reduce((s, r) => s + g.keys.reduce((ss, k) => ss + n(r[k]), 0), 0)),
      color: g.color,
    }))
  }, [bdMesRows])

  const kpisMes = useMemo(() => {
    const totalPeriodo = datosDiariosMes.reduce((s, r) => s + r.total, 0)
    const promDiario = datosDiariosMes.length ? totalPeriodo / datosDiariosMes.length : 0
    const maxDia = datosDiariosMes.length ? Math.max(...datosDiariosMes.map(r => r.total)) : 0
    const maxDiaRow = datosDiariosMes.find(r => r.total === maxDia)
    const maxDiaLabel = maxDiaRow ? `Día ${maxDiaRow.diaNum}` : '—'
    const totalGalones = surtidorMesRows.reduce((s, r) => s + n(r.volumen_gln), 0)
    return { totalPeriodo, promDiario, maxDia, maxDiaLabel, totalGalones }
  }, [datosDiariosMes, surtidorMesRows])

  const promProduccionMes = useMemo(() => {
    if (!datosDiariosMes.length) return 0
    return datosDiariosMes.reduce((s, r) => s + r.total, 0) / datosDiariosMes.length
  }, [datosDiariosMes])

  const nombreMes = useMemo(() => {
    const [, m] = mesSeleccionado.split('-')
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return nombres[parseInt(m, 10) - 1] || ''
  }, [mesSeleccionado])

  return (
    <div className="space-y-6 relative text-[var(--text-primary)]">
      {/* Toast Notificación */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2.5 max-w-sm">
          <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
            <span className="material-symbols-outlined text-sm">notifications</span>
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{toast}</span>
        </div>
      )}

      {/* Inputs de archivos ocultos */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />

      {/* ── Cabecera e Importación ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Producción OPAPTAR</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {activeTab === 'diario' 
              ? `Control diario individual · ${fechaLabelDia}`
              : `Dashboard mensual agregado · ${nombreMes} de 2026`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Mes o Día */}
          {activeTab === 'diario' ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFechaDiaria(f => addDays(f, -1))}
                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-hover)] transition-all text-[var(--text-secondary)]"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              <DateInputDMY value={fechaDiaria} onChange={setFechaDiaria} />

              <button
                onClick={() => setFechaDiaria(f => addDays(f, 1))}
                disabled={fechaDiaria >= hoy}
                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-hover)] transition-all text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>

              <button
                onClick={() => setFechaDiaria(hoy)}
                className="px-3.5 py-2 text-xs font-semibold bg-[var(--accent)] text-[var(--text-inverse)] rounded-xl hover:opacity-90 transition-all"
              >
                Hoy
              </button>
            </div>
          ) : (
            <select
              value={mesSeleccionado}
              onChange={e => setMesSeleccionado(e.target.value)}
              className="px-4 py-2.5 text-sm font-bold bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 cursor-pointer"
            >
              <option value="2026-01">Enero 2026</option>
              <option value="2026-02">Febrero 2026</option>
              <option value="2026-03">Marzo 2026</option>
              <option value="2026-04">Abril 2026</option>
              <option value="2026-05">Mayo 2026</option>
              <option value="2026-06">Junio 2026</option>
              <option value="2026-07">Julio 2026</option>
              <option value="2026-08">Agosto 2026</option>
              <option value="2026-09">Septiembre 2026</option>
              <option value="2026-10">Octubre 2026</option>
              <option value="2026-11">Noviembre 2026</option>
              <option value="2026-12">Diciembre 2026</option>
            </select>
          )}

          {/* 🎨 Ajuste de Colores Popover */}
          <div className="relative">
            <button
              onClick={() => setShowColorPanel(!showColorPanel)}
              className={`flex items-center justify-center w-9.5 h-9.5 rounded-xl border border-[var(--border)] transition-all hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] ${showColorPanel ? 'bg-[var(--bg-hover)] border-[var(--accent)] text-[var(--accent)]' : ''}`}
              title="Ajustar colores de estaciones"
            >
              <span className="material-symbols-outlined text-lg">palette</span>
            </button>

            {showColorPanel && (
              <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl z-40 p-4 max-h-96 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-xs font-bold">Colores de Estaciones</span>
                  <button onClick={restaurarColoresDefecto} className="text-[10px] font-bold text-[var(--accent)] hover:underline">
                    Restablecer
                  </button>
                </div>
                <div className="space-y-2">
                  {fuentesConfig.map(f => (
                    <div key={f.key} className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-secondary)] truncate">{f.label}</span>
                      <input
                        type="color"
                        value={f.color}
                        onChange={e => cambiarColor(f.key, e.target.value)}
                        className="w-7 h-5 border border-[var(--border)] rounded cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón único de Importación */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            {importing ? 'Importando...' : 'Importar Excel'}
          </button>
        </div>
      </div>

      {/* ── TABS PRINCIPALES ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
        <button
          onClick={() => setActiveTab('diario')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'diario'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Visión Diaria
        </button>
        <button
          onClick={() => setActiveTab('mensual')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'mensual'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Visión Mensual
        </button>
      </div>

      {/* ── CONTENIDO TAB: DIARIO ────────────────────────────────────────────── */}
      {activeTab === 'diario' && (
        <>
          {loadingDia && (
            <div className="flex items-center justify-center h-64 gap-3">
              <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">Cargando datos del día...</p>
            </div>
          )}

          {!loadingDia && noDataDia && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-[var(--text-muted)]">event_busy</span>
              <p className="text-base font-semibold text-[var(--text-primary)]">Sin registros para este día</p>
              <p className="text-sm text-[var(--text-muted)]">Navega a otra fecha con las flechas o dropdowns</p>
            </div>
          )}

          {!loadingDia && bdDia && (
            <div className="space-y-6 animate-fade-in">
              {/* KPIs del día */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Producción Total" value={fmt(totalM3Dia)} unit="m³/día" icon="water_drop" colorClass="text-sky-600 dark:text-sky-400" bgClass="bg-sky-50 dark:bg-sky-900/30" />
                <KpiCard title="Fuente Principal" value={liderDia?.name || '—'} unit={liderDia ? fmt(liderDia.m3) + ' m³' : undefined} icon="star" colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" />
                <KpiCard title="Fuentes Activas" value={String(barM3Dia.length)} unit="de 13" icon="science" colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50 dark:bg-violet-900/30" />
                <KpiCard title="Surtidor" value={fmt(totalGalonesDia)} unit="gln" icon="local_shipping" colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-900/30" />
              </div>

              {/* Fila principal: barras m³ + pie */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Producción por Fuente */}
                <div className="lg:col-span-2">
                  <Card title="Producción por Fuente" subtitle="m³ producidos en este día · ordenado de mayor a menor"
                    icon="water_drop" bg="bg-sky-50 dark:bg-sky-900/30" ic="text-sky-500 dark:text-sky-400">
                    {barM3Dia.length === 0
                      ? <p className="text-sm text-[var(--text-muted)] text-center py-12">Sin producción registrada</p>
                      : (
                        <ResponsiveContainer width="100%" height={Math.max(280, barM3Dia.length * 42)}>
                          <BarChart data={barM3Dia} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} tickCount={5} />
                            <YAxis dataKey="name" type="category" width={148} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '-0.01em' }} axisLine={false} tickLine={false} />
                            <Tooltip {...TT} formatter={(v: number) => [fmt(v) + ' m³', 'Producción']} />
                            <Bar dataKey="m3" radius={[0, 6, 6, 0]} barSize={26}>
                              <LabelList dataKey="m3" position="right" formatter={(v: number) => fmt(v) + ' m³'} style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                              {barM3Dia.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                  </Card>
                </div>

                {/* Pie Distribución */}
                <Card title="Distribución" subtitle="% de producción por fuente" icon="donut_large" bg="bg-violet-50 dark:bg-violet-900/30" ic="text-violet-500 dark:text-violet-400">
                  {pieDataDia.length === 0
                    ? <p className="text-sm text-[var(--text-muted)] text-center py-12">Sin datos</p>
                    : (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={pieDataDia} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                              {pieDataDia.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                            </Pie>
                            <Tooltip {...TT} formatter={(v: number) => [fmt(v) + ' m³ (' + (totalM3Dia ? ((v / totalM3Dia) * 100).toFixed(1) : 0) + '%)', '']} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                          {pieDataDia.map(d => (
                            <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                <span className="text-[var(--text-secondary)] truncate font-medium">{d.name}</span>
                              </div>
                              <span className="font-bold text-[var(--text-primary)] flex-shrink-0">
                                {totalM3Dia ? ((d.value / totalM3Dia) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                </Card>
              </div>

              {/* Fila: Caudal + Horas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Caudal */}
                <Card title="Caudal por Fuente" subtitle="L/s (promedio del día)" icon="speed" bg="bg-emerald-50 dark:bg-emerald-900/30" ic="text-emerald-500 dark:text-emerald-400">
                  {barCaudalDia.length === 0
                    ? <p className="text-sm text-[var(--text-muted)] text-center py-12">Sin datos de caudal</p>
                    : (
                      <ResponsiveContainer width="100%" height={Math.max(260, barCaudalDia.length * 42)}>
                        <BarChart data={barCaudalDia} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, 1)} tickCount={5} />
                          <YAxis dataKey="name" type="category" width={148} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <Tooltip {...TT} formatter={(v: number) => [fmt(v, 2) + ' L/s', 'Caudal']} />
                          <Bar dataKey="caudal" radius={[0, 6, 6, 0]} barSize={26}>
                            <LabelList dataKey="caudal" position="right" formatter={(v: number) => fmt(v, 1) + ' L/s'} style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                            {barCaudalDia.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </Card>

                {/* Horas */}
                <Card title="Horas Activo por Fuente" subtitle="Horas de operación registradas en el día" icon="schedule" bg="bg-violet-50 dark:bg-violet-900/30" ic="text-violet-500 dark:text-violet-400">
                  {barHorasDia.length === 0
                    ? <p className="text-sm text-[var(--text-muted)] text-center py-12">Sin datos de horas</p>
                    : (
                      <ResponsiveContainer width="100%" height={Math.max(260, barHorasDia.length * 42)}>
                        <BarChart data={barHorasDia} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, 1) + ' h'} tickCount={5} />
                          <YAxis dataKey="name" type="category" width={148} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <Tooltip {...TT} formatter={(v: number) => [fmt(v, 2) + ' h', 'Horas activo']} />
                          <Bar dataKey="horas" radius={[0, 6, 6, 0]} barSize={26}>
                            <LabelList dataKey="horas" position="right" formatter={(v: number) => fmt(v, 1) + ' h'} style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                            {barHorasDia.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </Card>
              </div>

              {/* Surtidor del día */}
              {surtVehiculoDia.length > 0 && (
                <Card title="Surtidor — Despachos del Día" subtitle="Volumen en galones por vehículo" icon="local_shipping" bg="bg-rose-50 dark:bg-rose-900/30" ic="text-rose-500 dark:text-rose-400">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tabla de despachos */}
                    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[var(--bg-tertiary)]">
                            <th className="text-left p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Placa</th>
                            <th className="text-left p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tipo</th>
                            <th className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Viajes</th>
                            <th className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Galones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {surtVehiculoDia.map((v, i) => (
                            <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors">
                              <td className="p-2.5 font-bold text-[var(--text-primary)]">{v.placa}</td>
                              <td className="p-2.5 text-[var(--text-secondary)]">{v.tipo}</td>
                              <td className="p-2.5 text-right text-[var(--text-secondary)]">{v.viajes}</td>
                              <td className="p-2.5 text-right font-bold text-[#f59e0b]">{fmt(v.galones)}</td>
                            </tr>
                          ))}
                          <tr className="bg-[var(--bg-tertiary)]">
                            <td colSpan={3} className="p-2.5 font-bold text-[var(--text-primary)] text-right">TOTAL</td>
                            <td className="p-2.5 text-right font-bold text-[#f59e0b]">{fmt(totalGalonesDia)} gln</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Barras surtidor */}
                    <ResponsiveContainer width="100%" height={Math.max(200, surtVehiculoDia.length * 48)}>
                      <BarChart data={surtVehiculoDia} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} tickCount={4} />
                        <YAxis dataKey="placa" type="category" width={90} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip {...TT} formatter={(v: number) => [fmt(v) + ' gln', 'Galones']} />
                        <Bar dataKey="galones" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={30}>
                          <LabelList dataKey="galones" position="right" formatter={(v: number) => fmt(v) + ' gln'} style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Tabla resumen del día */}
              <Card title="Resumen del Día — Todas las Fuentes" subtitle="Caudal · Horas activo · Producción m³" icon="table_rows" bg="bg-indigo-50 dark:bg-indigo-900/30" ic="text-indigo-500 dark:text-indigo-400">
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-tertiary)]">
                        <th className="text-left p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Fuente</th>
                        <th className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Caudal (L/s)</th>
                        <th className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Horas activo</th>
                        <th className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Producción m³</th>
                        <th className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">% del día</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {fuentesConfig.map((f, i) => {
                        const m3 = n(bdDia[f.key])
                        const caud = n(bdDia[f.caudal])
                        const hrs = n(bdDia[f.horas])
                        const pct = totalM3Dia > 0 ? (m3 / totalM3Dia) * 100 : 0
                        return (
                          <tr key={i} className={`hover:bg-[var(--bg-hover)] transition-colors ${m3 === 0 ? 'opacity-40' : ''}`}>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                                <span className="font-semibold text-[var(--text-primary)]">{f.label}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-right text-[var(--text-secondary)]">{caud > 0 ? fmt(caud, 2) : '—'}</td>
                            <td className="p-2.5 text-right text-[var(--text-secondary)]">{hrs > 0 ? fmt(hrs, 2) : '—'}</td>
                            <td className="p-2.5 text-right font-bold text-[var(--text-primary)]">{m3 > 0 ? fmt(m3) : '—'}</td>
                            <td className="p-2.5 text-right">
                              {pct > 0 && (
                                <div className="flex items-center justify-end gap-2 text-xs">
                                  <div className="w-16 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: pct + '%', background: f.color }} />
                                  </div>
                                  <span className="text-[var(--text-secondary)] w-8 text-right font-medium">{pct.toFixed(0)}%</span>
                                </div>
                              )}
                              {pct === 0 && <span className="text-[var(--text-muted)]">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-[var(--bg-tertiary)]">
                        <td className="p-2.5 font-bold text-[var(--text-primary)]" colSpan={3}>TOTAL DEL DÍA</td>
                        <td className="p-2.5 text-right font-bold text-[var(--accent)]">{fmt(totalM3Dia)} m³</td>
                        <td className="p-2.5 text-right font-bold text-[var(--accent)]">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── CONTENIDO TAB: MENSUAL ───────────────────────────────────────────── */}
      {activeTab === 'mensual' && (
        <>
          {loadingMes && (
            <div className="flex items-center justify-center h-64 gap-3">
              <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">Cargando datos del mes...</p>
            </div>
          )}

          {!loadingMes && datosDiariosMes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-[var(--text-muted)]">event_busy</span>
              <p className="text-base font-semibold text-[var(--text-primary)]">Sin registros para el mes seleccionado</p>
              <p className="text-sm text-[var(--text-muted)]">Asegúrate de haber importado la hoja de datos BD del Excel</p>
            </div>
          )}

          {!loadingMes && datosDiariosMes.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              {/* KPIs mensuales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Producción Mensual" value={fmt(kpisMes.totalPeriodo)} unit="m³" icon="water_drop" colorClass="text-sky-600 dark:text-sky-400" bgClass="bg-sky-50 dark:bg-sky-900/30" />
                <KpiCard title="Promedio Diario" value={fmt(kpisMes.promDiario)} unit="m³/día" icon="show_chart" colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/30" />
                <KpiCard title={`Pico Máximo (${kpisMes.maxDiaLabel})`} value={fmt(kpisMes.maxDia)} unit="m³" icon="trending_up" colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50 dark:bg-violet-900/30" />
                <KpiCard title="Despacho Surtidor" value={fmt(kpisMes.totalGalones)} unit="gln" icon="local_shipping" colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-900/30" />
              </div>

              {/* Producción diaria del mes */}
              <Card title="Producción Diaria de Agua (m³/día)" subtitle="Evolución diaria a lo largo del mes · Línea punteada = promedio mensual" icon="show_chart" bg="bg-sky-50 dark:bg-sky-900/30" ic="text-sky-600 dark:text-sky-400">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={datosDiariosMes} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="diaNum" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                    <Tooltip {...TT} formatter={(v: number) => [fmt(v) + ' m³', 'Producción']} labelFormatter={d => `Día ${d}`} />
                    <ReferenceLine y={promProduccionMes} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `Prom: ${fmt(promProduccionMes)} m³`, fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                    <Area type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#totalGrad)" dot={{ r: 3, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Barras apiladas diarias + Pie mensual */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card title="Composición Diaria por Tipo de Fuente" subtitle="Pozos · PTAP / GF · CBAP / EBAP — m³ diarios" icon="stacked_bar_chart" bg="bg-emerald-50 dark:bg-emerald-900/30" ic="text-emerald-600 dark:text-emerald-400">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={datosDiariosMes} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="diaNum" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                        <Tooltip {...TT} formatter={(v: number, name: string) => [fmt(v) + ' m³', name]} labelFormatter={d => `Día ${d}`} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        {GRUPOS.map(g => (
                          <Bar key={g.label} dataKey={g.label} stackId="a" fill={g.color} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <Card title="Distribución del Mes" subtitle="Porcentaje por grupo de captación" icon="donut_large" bg="bg-violet-50 dark:bg-violet-900/30" ic="text-violet-600 dark:text-violet-400">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieDataMes} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieDataMes.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                      </Pie>
                      <Tooltip {...TT} formatter={(v: number) => [fmt(v) + ' m³ (' + (kpisMes.totalPeriodo ? ((v / kpisMes.totalPeriodo) * 100).toFixed(1) : 0) + '%)', '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {pieDataMes.map(d => (
                      <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-[var(--text-secondary)] font-medium">{d.name}</span>
                        </div>
                        <span className="font-bold text-[var(--text-primary)]">
                          {kpisMes.totalPeriodo ? ((d.value / kpisMes.totalPeriodo) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Surtidor mensual */}
              {surtidorDiarioMes.length > 0 && (
                <Card title="Despacho Mensual de Surtidor (cisternas)" subtitle="Volumen en galones despachados + viajes diarios" icon="local_shipping" bg="bg-amber-50 dark:bg-amber-900/30" ic="text-amber-600 dark:text-amber-400">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={surtidorDiarioMes} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="diaNum" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip {...TT} formatter={(v: number, name: string) => [name === 'galones' ? fmt(v) + ' gln' : v + ' viajes', name]} labelFormatter={d => `Día ${d}`} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Line yAxisId="left" type="monotone" dataKey="galones" name="galones" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
                      <Line yAxisId="right" type="monotone" dataKey="viajes" name="viajes" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Tabla detallada del mes */}
              <Card title="Detalle Diario del Mes" subtitle="Producción de agua por fuente en metros cúbicos" icon="table_rows" bg="bg-indigo-50 dark:bg-indigo-900/30" ic="text-indigo-600 dark:text-indigo-400">
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--bg-tertiary)]">
                        <th className="text-left p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Día</th>
                        {FUENTES_META.filter(f => bdMesRows.some(r => n(r[f.key]) > 0)).map(f => (
                          <th key={f.key} className="text-right p-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                        <th className="text-right p-2.5 font-semibold text-[var(--accent)] uppercase tracking-wider whitespace-nowrap">TOTAL m³</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {datosDiariosMes.slice().reverse().map((r, i) => (
                        <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors">
                          <td className="p-2.5 font-bold text-[var(--text-primary)]">{r.diaLabel}</td>
                          {FUENTES_META.filter(f => bdMesRows.some(row => n(row[f.key]) > 0)).map(f => {
                            const val = (r as any)[f.key];
                            return (
                              <td key={f.key} className="p-2.5 text-right text-[var(--text-secondary)]">
                                {val > 0 ? fmt(val) : <span className="text-[var(--text-muted)]">—</span>}
                              </td>
                            )
                          })}
                          <td className="p-2.5 text-right font-bold text-[var(--accent)]">{fmt(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
