import { useState, useEffect, useRef } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { api } from '../api/client'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Scatter, ScatterChart, RadialBarChart, RadialBar,
    Treemap, Sankey
} from 'recharts'

const COLORS_POZOS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#0ea5e9', '#d946ef', '#22c55e']
const GRADIENTS = {
    cyan: 'url(#gradCyan)',
    emerald: 'url(#gradEmerald)',
    amber: 'url(#gradAmber)',
    rose: 'url(#gradRose)',
    violet: 'url(#gradViolet)',
    blue: 'url(#gradBlue)',
}

const FUENTES_MAP: Record<string, string> = {
    PZ10: 'Pozo 10', PZ11: 'Pozo 11', PZ13: 'Pozo 13',
    'PZ MED': 'Pozo Medrano', 'GF MIN': 'GF Minas',
    PTAP1: 'PTAP Portachuelo', 'GF NAR': 'GF Naranjal',
    'PZ CHB': 'Pozo Chincha Baja', 'PZ CM': 'Pozo C. M.',
    'PZ TM': 'Pozo Tambo Mora',
    'EBAP HIJA': 'EBAP Hijaya', 'EBAP ALAR': 'EBAP Alto Larán',
    'EBAP PNUE': 'EBAP Pueblo Nuevo',
}

const format2Dec = (val: any) => {
    if (val === undefined || val === null || val === '') return '0.00'
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return num.toFixed(2)
}

const format2DecLocale = (val: any) => {
    if (val === undefined || val === null || val === '') return '0.00'
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProduccionOPAPTAR() {
    const location = useLocation()
    const isOperacion = location.pathname.includes('/operacion')
    const isSurtidor = location.pathname.includes('/surtidor')
    const isRSanjuan = location.pathname.includes('/rsanjuan')
    const isDashboard = location.pathname.includes('/dashboard')

    if (location.pathname === '/produccion-opaptar' || location.pathname === '/produccion-opaptar/') {
        return <Navigate to="/produccion-opaptar/operacion" replace />
    }

    const [bdData, setBdData] = useState<any[]>([])
    const [surtidorData, setSurtidorData] = useState<any[]>([])
    const [rioData, setRioData] = useState<any[]>([])
    const [dashData, setDashData] = useState<any>(null)
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [mes, setMes] = useState(String(new Date().getMonth() + 1))
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [showEntry, setShowEntry] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [multiMes, setMultiMes] = useState<string[]>([])
const [comparativaData, setComparativaData] = useState<any[]>([])
const [metasData, setMetasData] = useState<any[]>([])
const [alertasRio, setAlertasRio] = useState<any>(null)
const [frecuenciaSurtidor, setFrecuenciaSurtidor] = useState<any[]>([])
const [evolucionSurtidor, setEvolucionSurtidor] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

    const loadBD = async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = {}
            if (mes) params.mes = mes
            const data = await api.getProduccionBD(params)
            setBdData(data)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const loadSurtidor = async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = { limit: '500' }
            if (fecha) { params.desde = fecha; params.hasta = fecha }
            const data = await api.getProduccionSurtidor(params)
            setSurtidorData(data)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const loadRio = async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = { anio: '2026', limit: '1000' }
            const data = await api.getProduccionRSanjuan(params)
            setRioData(data)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const loadDashboard = async () => {
        setLoading(true)
        try {
            const data = await api.getProduccionDashboard()
            setDashData(data)
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { if (isOperacion) loadBD() }, [isOperacion, mes])
    useEffect(() => { if (isSurtidor) loadSurtidor() }, [isSurtidor, fecha])
    useEffect(() => { if (isRSanjuan) loadRio() }, [isRSanjuan])
    useEffect(() => { if (isDashboard) loadDashboard() }, [isDashboard])

    const loadComparativa = async (meses: string[]) => {
        if (!meses.length) return
        try {
            const data = await api.getProduccionComparativa(meses.join(','))
            setComparativaData(data)
        } catch (err) { console.error(err) }
    }

    const loadMetas = async () => {
        try {
            const data = await api.getProduccionMetas(2026, Number(mes))
            setMetasData(data)
        } catch (err) { console.error(err) }
    }

    const loadAlertasRio = async () => {
        try {
            const data = await api.getProduccionAlertas()
            setAlertasRio(data)
        } catch (err) { console.error(err) }
    }

    const loadFrecuenciaSurtidor = async () => {
        try {
            const data = await api.getProduccionSurtidorFrecuencia()
            setFrecuenciaSurtidor(data)
        } catch (err) { console.error(err) }
    }

    const loadEvolucionSurtidor = async () => {
        try {
            const data = await api.getProduccionSurtidorEvolucion()
            setEvolucionSurtidor(data)
        } catch (err) { console.error(err) }
    }

    useEffect(() => { if (isOperacion) loadMetas() }, [isOperacion, mes])
    useEffect(() => { if (isRSanjuan) loadAlertasRio() }, [isRSanjuan])
    useEffect(() => { if (isSurtidor) { loadFrecuenciaSurtidor(); loadEvolucionSurtidor() } }, [isSurtidor, fecha])

    const handleFileUpload = async (tipo: string) => {
        const file = selectedFile || fileInputRef.current?.files?.[0]
        if (!file) { notify('Selecciona un archivo Excel'); return }
        setUploading(true)
        try {
            const result = await api.uploadProduccionExcel(file, tipo)
            notify(`Importados ${result.imported || 0} registros de ${result.total || 0}`)
            if (tipo === 'bd') loadBD()
            else if (tipo === 'surtidor') loadSurtidor()
            else if (tipo === 'rsanjuan') loadRio()
            setSelectedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (err: any) {
            notify(err.message || 'Error al importar')
        } finally { setUploading(false) }
    }

    const getCaudalData = () => {
        if (!bdData.length) return []
        const fuentes = ['pz10', 'pz11', 'pz13', 'pzmed', 'gfmin', 'ptap1', 'gfnar', 'pzchb', 'pzcm', 'pztm', 'ebaphija', 'ebapalar', 'ebappnue']
        const labels: Record<string, string> = {
            pz10: 'PZ10', pz11: 'PZ11', pz13: 'PZ13', pzmed: 'PZ MED', gfmin: 'GF MIN',
            ptap1: 'PTAP1', gfnar: 'GF NAR', pzchb: 'PZ CHB', pzcm: 'PZ CM', pztm: 'PZ TM',
            ebaphija: 'EBAP HIJA', ebapalar: 'EBAP ALAR', ebappnue: 'EBAP PNUE'
        }
        return fuentes.map(f => {
            const vals = bdData.map(r => Number(r[`${f}_caudal`]) || 0).filter(v => v > 0)
            return {
                name: labels[f],
                promedio: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0,
                maximo: vals.length ? +Math.max(...vals).toFixed(2) : 0,
                minimo: vals.length ? +Math.min(...vals).toFixed(2) : 0,
                total: vals.length ? +vals.reduce((a, b) => a + b, 0).toFixed(2) : 0,
            }
        }).filter(d => d.promedio > 0)
    }

    const getM3Data = () => {
        if (!bdData.length) return []
        const fuentes = ['pz10', 'pz11', 'pz13', 'pzmed', 'gfmin', 'ptap1', 'gfnar', 'pzchb', 'pzcm', 'pztm', 'ebaphija', 'ebapalar', 'ebappnue']
        const labels: Record<string, string> = {
            pz10: 'PZ10', pz11: 'PZ11', pz13: 'PZ13', pzmed: 'PZ MED', gfmin: 'GF MIN',
            ptap1: 'PTAP1', gfnar: 'GF NAR', pzchb: 'PZ CHB', pzcm: 'PZ CM', pztm: 'PZ TM',
            ebaphija: 'EBAP HIJA', ebapalar: 'EBAP ALAR', ebappnue: 'EBAP PNUE'
        }
        return fuentes.map(f => ({
            name: labels[f],
            m3: bdData.reduce((a, r) => a + (Number(r[`${f}_m3`]) || 0), 0),
            horas: +(bdData.reduce((a, r) => a + (Number(r[`${f}_horas`]) || 0), 0)).toFixed(2),
        })).filter(d => d.m3 > 0)
    }

    const getProduccionDiaria = () => {
        if (!bdData.length) return []
        return bdData.slice(0, 31).map(r => ({
            dia: r.dia,
            pz10: Number(r.pz10_m3) || 0,
            pz11: Number(r.pz11_m3) || 0,
            ptap1: Number(r.ptap1_m3) || 0,
            total: (Number(r.pz10_m3) || 0) + (Number(r.pz11_m3) || 0) + (Number(r.pz13_m3) || 0) +
                   (Number(r.pzmed_m3) || 0) + (Number(r.gfmin_m3) || 0) + (Number(r.ptap1_m3) || 0) +
                   (Number(r.gfnar_m3) || 0) + (Number(r.pzchb_m3) || 0) + (Number(r.pzcm_m3) || 0) +
                   (Number(r.pztm_m3) || 0) + (Number(r.ebaphija_m3) || 0) + (Number(r.ebapalar_m3) || 0) +
                   (Number(r.ebappnue_m3) || 0)
        }))
    }

    const getSurtidorResumen = () => {
        if (!surtidorData.length) return { porVehiculo: [], porSurtidor: [] }
        const porVehiculoMap: Record<string, number> = {}
        const porSurtidorMap: Record<string, number> = {}
        surtidorData.forEach(r => {
            const placa = r.placa || 'N/A'
            const surt = r.surtidor || 'N/A'
            const vol = Number(r.volumen_gln) || 0
            porVehiculoMap[placa] = (porVehiculoMap[placa] || 0) + vol
            porSurtidorMap[surt] = (porSurtidorMap[surt] || 0) + vol
        })
        return {
            porVehiculo: Object.entries(porVehiculoMap).map(([name, valor]) => ({ name, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10),
            porSurtidor: Object.entries(porSurtidorMap).map(([name, valor]) => ({ name, valor })).sort((a, b) => b.valor - a.valor),
        }
    }

    const FUENTES_LIST = [
        { key: 'pz10', label: 'PZ10', color: '#06b6d4' }, { key: 'pz11', label: 'PZ11', color: '#10b981' },
        { key: 'pz13', label: 'PZ13', color: '#f59e0b' }, { key: 'pzmed', label: 'PZ MED', color: '#ef4444' },
        { key: 'gfmin', label: 'GF MIN', color: '#8b5cf6' }, { key: 'ptap1', label: 'PTAP1', color: '#ec4899' },
        { key: 'gfnar', label: 'GF NAR', color: '#14b8a6' }, { key: 'pzchb', label: 'PZ CHB', color: '#f97316' },
        { key: 'pzcm', label: 'PZ CM', color: '#6366f1' }, { key: 'pztm', label: 'PZ TM', color: '#84cc16' },
        { key: 'ebaphija', label: 'EBAP HIJA', color: '#0ea5e9' }, { key: 'ebapalar', label: 'EBAP ALAR', color: '#d946ef' },
        { key: 'ebappnue', label: 'EBAP PNUE', color: '#22c55e' },
    ]

    const getEvolucionDiariaFuentes = () => {
        if (!bdData.length) return []
        return bdData.slice(0, 31).map(r => {
            const entry: any = { dia: r.dia }
            FUENTES_LIST.forEach(f => { entry[f.label] = Number(r[`${f.key}_caudal`]) || 0 })
            return entry
        })
    }

    const getProduccionVsHoras = () => {
        if (!bdData.length) return []
        return FUENTES_LIST.map(f => {
            const totalM3 = bdData.reduce((a, r) => a + (Number(r[`${f.key}_m3`]) || 0), 0)
            const totalHoras = bdData.reduce((a, r) => a + (Number(r[`${f.key}_horas`]) || 0), 0)
            return {
                name: f.label,
                m3: totalM3,
                horas: +totalHoras.toFixed(2),
            }
        }).filter(d => d.m3 > 0 || d.horas > 0)
    }

    const getLecturasMedidores = () => {
        if (!bdData.length) return []
        const ultimo = bdData[bdData.length - 1]
        return FUENTES_LIST.map(f => ({
            name: f.label,
            inicio: Number(ultimo[`${f.key}_inicio`]) || 0,
            final: Number(ultimo[`${f.key}_final`]) || 0,
        })).filter(d => d.final > 0)
    }

    const getComparativaSources = () => {
        if (!comparativaData.length) return []
        const sourceLabels: Record<string, string> = {
            pz10: 'PZ10', pz11: 'PZ11', pz13: 'PZ13', pzmed: 'PZ MED',
            gfmin: 'GF MIN', ptap1: 'PTAP1', gfnar: 'GF NAR',
            pzchb: 'PZ CHB', pzcm: 'PZ CM', pztm: 'PZ TM',
            ebaphija: 'EBAP HIJA', ebapalar: 'EBAP ALAR', ebappnue: 'EBAP PNUE',
        }
        return Object.entries(sourceLabels).map(([key, label]) => ({
            name: label,
            ...Object.fromEntries(comparativaData.map((m: any) => [`mes${m.mes}`, Number(m[key]) || 0]))
        })).filter(d => Object.values(d).some(v => typeof v === 'number' && v > 0))
    }

    const getCumplimientoMetas = () => {
        if (!metasData.length || !bdData.length) return []
        const totals: Record<string, number> = {}
        bdData.forEach((r: any) => {
            FUENTES_LIST.forEach(f => {
                if (!totals[f.label]) totals[f.label] = 0
                totals[f.label] += Number(r[`${f.key}_m3`]) || 0
            })
        })
        return metasData.map(m => {
            const real = totals[m.fuente] || 0
            return {
                name: m.fuente,
                meta: Number(m.meta_m3) || 0,
                real,
                cumplimiento: m.meta_m3 > 0 ? +((real / Number(m.meta_m3)) * 100).toFixed(2) : 0,
            }
        }).filter(d => d.meta > 0)
    }

    const getEvolucionDiariaSurtidor = () => {
        if (!evolucionSurtidor.length) return []
        return evolucionSurtidor.map(r => ({
            fecha: r.fecha?.split('T')[0] || r.fecha,
            galones: Number(r.total_galones) || 0,
            vehiculos: Number(r.vehiculos) || 0,
            despachos: Number(r.despachos) || 0,
        }))
    }

    const getDistribucionHorariaRio = () => {
        if (!rioData.length) return []
        const hourly: Record<string, number[]> = {}
        rioData.forEach(r => {
            const h = r.hora ? r.hora.split(':')[0] : ''
            if (!h) return
            if (!hourly[h]) hourly[h] = []
            hourly[h].push(Number(r.caudal) || 0)
        })
        return Object.entries(hourly).sort(([a], [b]) => Number(a) - Number(b)).map(([hora, vals]) => ({
            hora: `${hora}:00`,
            caudal: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
            max: +Math.max(...vals).toFixed(2),
        }))
    }

    const getComparativaMensualRio = () => {
        if (!rioData.length) return []
        const monthly: Record<string, number[]> = {}
        rioData.forEach(r => {
            const m = String(r.mes || '').padStart(2, '0')
            if (!monthly[m]) monthly[m] = []
            monthly[m].push(Number(r.caudal) || 0)
        })
        return Object.entries(monthly).sort(([a], [b]) => Number(a) - Number(b)).map(([mes, vals]) => ({
            mes: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'][Number(mes) - 1] || mes,
            caudal: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
            max: +Math.max(...vals).toFixed(2),
            min: +Math.min(...vals).toFixed(2),
        }))
    }

    const getScoreConsolidado = () => {
        if (!dashData) return { score: 0, items: [] }
        const produccion = Number(dashData.bd?.produccion_total) || 0
        const galones = Number(dashData.surtidor?.total_galones) || 0
        const caudal = Number(dashData.rio?.caudal_promedio) || 0
        const pProduccion = Math.min(100, +(produccion / 1000).toFixed(2))
        const pSurtidor = Math.min(100, +(galones / 1000).toFixed(2))
        const pRio = Math.min(100, +(caudal * 10).toFixed(2))
        const score = Math.min(100, +(pProduccion * 0.4 + pSurtidor * 0.3 + pRio * 0.3).toFixed(2))
        return {
            score,
            items: [
                { label: 'Producción', value: pProduccion, max: 100, peso: '40%' },
                { label: 'Despacho', value: pSurtidor, max: 100, peso: '30%' },
                { label: 'Río San Juan', value: pRio, max: 100, peso: '30%' },
            ]
        }
    }

    const getFrecuenciaViajes = () => {
        if (!frecuenciaSurtidor.length) return []
        return frecuenciaSurtidor.slice(0, 10)
    }

    const getCloroVsVolumen = () => {
        if (!surtidorData.length) return []
        return surtidorData.map(r => ({
            volumen: Number(r.volumen_gln) || 0,
            cloro: Number(r.hipoclorito) || 0,
            placa: r.placa || 'N/A',
        })).filter(r => r.volumen > 0 && r.cloro > 0)
    }

    const getRioChartData = () => {
        if (!rioData.length) return []
        const daily: Record<string, number[]> = {}
        rioData.forEach(r => {
            const d = r.fecha ? r.fecha.split('T')[0] : ''
            if (!d) return
            if (!daily[d]) daily[d] = []
            daily[d].push(Number(r.caudal) || 0)
        })
        return Object.entries(daily).map(([fecha, vals]) => ({
            fecha,
            caudal: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
            max: +Math.max(...vals).toFixed(2),
            min: +Math.min(...vals).toFixed(2),
        })).slice(0, 60)
    }

    return (
        <div className="animate-fade-in-up space-y-6 min-h-screen text-slate-100 p-4 md:p-8">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-900/40">
                            <span className="material-symbols-outlined text-white text-2xl md:text-3xl">precision_manufacturing</span>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">Producción OPAPTAR</h2>
                            <p className="text-[10px] md:text-xs font-bold text-amber-400 uppercase tracking-widest mt-1">Oficina de Producción de Agua Potable y Tratamiento de Aguas Residuales</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedFile && (
                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl max-w-[200px] truncate">
                                Listo: {selectedFile.name}
                            </span>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".xlsx,.xls,.csv,.ods" 
                            className="hidden" 
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black uppercase tracking-widest px-5 py-3 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-700 transition-all flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">upload_file</span>
                            {selectedFile ? 'Cambiar Excel' : 'Subir Excel'}
                        </button>
                    </div>
                </div>
            </div>

            {/* TOAST */}
            {toast && (
                <div className="fixed bottom-12 right-12 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-5 animate-fade-in-up border-l-4 border-amber-500">
                    <span className="material-symbols-outlined text-amber-500">precision_manufacturing</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{toast}</span>
                </div>
            )}

            {/* ===== SUB-VISTA: OPERACIÓN (BD) ===== */}
            {isOperacion && (
                <div className="space-y-8">
                    {/* Filtros */}
                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Mes</span>
                            <select value={mes} onChange={e => setMes(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-black rounded-xl px-4 py-3">
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'][i]}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={() => { setShowEntry(!showEntry); if (!showEntry && !bdData.length) loadBD() }}
                            className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all ${showEntry ? 'bg-slate-700 text-slate-100' : 'bg-amber-600 text-white'}`}>
                            {showEntry ? 'Ver Gráficos' : 'Ingreso Manual'}
                        </button>
                        <button onClick={() => handleFileUpload('bd')} disabled={uploading}
                            className="text-[10px] font-black uppercase tracking-widest px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
                            {uploading ? 'Importando...' : 'Importar BD Excel'}
                        </button>
                    </div>

                    {!showEntry && (
                        <div className="space-y-8">
                            {/* KPI CARDS */}
                            {dashData?.bd && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Producción Total</span>
                                        <h3 className="text-2xl font-black text-white mt-1">{format2DecLocale(dashData.bd.produccion_total)}</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">m³ totales</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Pozos</span>
                                        <h3 className="text-2xl font-black text-white mt-1">5</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">unidades activas</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">EBAPs</span>
                                        <h3 className="text-2xl font-black text-white mt-1">3</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">estaciones activas</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">PTAP</span>
                                        <h3 className="text-2xl font-black text-white mt-1">1</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">planta activa</p>
                                    </div>
                                </div>
                            )}

                            {/* Gráfico: Producción Diaria (Área Acumulada) */}
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                    Producción Diaria — m³/día
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Volumen total de agua producido cada día en metros cúbicos (m³)</p>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={getProduccionDiaria()}>
                                            <defs>
                                                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="dia" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                            <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                            <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="url(#gradTotal)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Gráfico: Caudal Promedio por Fuente */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1">Caudal Promedio por Fuente (L/s)</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Litros de agua por segundo (L/s) que aporta cada pozo en promedio</p>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getCaudalData()} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" width={90} />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Bar dataKey="promedio" fill="#06b6d4" radius={[0, 6, 6, 0]} barSize={16} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1">Volumen Total por Fuente (m³)</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Aporte total del mes en metros cúbicos y porcentaje de contribución</p>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={getM3Data()} dataKey="m3" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60} paddingAngle={3}>
                                                    {getM3Data().map((_, idx) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Gráfico: Radar de Eficiencia */}
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1">Caudal Promedio vs Máximo por Fuente (L/s)</h3>
                                <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Comparación entre flujo habitual (promedio) y pico de capacidad (máximo)</p>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={getCaudalData()}>
                                            <PolarGrid stroke="#334155" />
                                            <PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="900" />
                                            <PolarRadiusAxis stroke="#334155" fontSize={8} />
                                            <Radar name="Caudal Prom (L/s)" dataKey="promedio" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} />
                                            <Radar name="Caudal Máx (L/s)" dataKey="maximo" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                                            <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900 }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Evolución Diaria por Fuente (Líneas) */}
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                    Evolución Diaria del Caudal por Fuente (L/s)
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Variación del caudal de cada pozo día a día durante el mes</p>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getEvolucionDiariaFuentes()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="dia" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                            <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                            {FUENTES_LIST.filter(f => getEvolucionDiariaFuentes().some(d => d[f.label] > 0)).map(f => (
                                                <Line key={f.key} type="monotone" dataKey={f.label} stroke={f.color} strokeWidth={2} dot={false} />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Producción vs Horas por Fuente */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1">Producción vs Horas Operadas</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Comparación de volumen producido (m³) frente a horas trabajadas</p>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={getProduccionVsHoras()} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" width={90} />
                                                <Tooltip cursor={false} formatter={(value, name) => [Number(value).toFixed(2), name === 'm3' ? 'm³ total' : 'Horas']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                <Bar dataKey="m3" fill="#06b6d4" radius={[0, 6, 6, 0]} barSize={12} name="m3" />
                                                <Bar dataKey="horas" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={12} name="horas" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-1">Lecturas de Medidores (Inicio vs Final)</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-wider">Diferencia entre las marcas iniciales y finales de los medidores</p>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getLecturasMedidores()} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" width={90} />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                <Bar dataKey="inicio" fill="#64748b" radius={[0, 4, 4, 0]} barSize={8} stackId="a" />
                                                <Bar dataKey="final" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={8} stackId="a" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Comparativa Mensual (multi-mes) */}
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                                        Comparativa Mensual de Producción (m³)
                                    </h3>
                                    <div className="flex gap-2">
                                        {['1', '2', '3', '4', '5', '6'].map(m => (
                                            <button key={m} onClick={() => {
                                                const updated = multiMes.includes(m) ? multiMes.filter(x => x !== m) : [...multiMes, m]
                                                setMultiMes(updated)
                                                if (updated.length) loadComparativa(updated)
                                            }}
                                                className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${multiMes.includes(m) ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                                                Mes {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {comparativaData.length > 0 && (
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getComparativaSources()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                {comparativaData.map((m: any, i: number) => (
                                                    <Bar key={m.mes} dataKey={`mes${m.mes}`} fill={COLORS_POZOS[i % COLORS_POZOS.length]} radius={[4, 4, 0, 0]} barSize={20} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            {/* Cumplimiento de Metas */}
                            {metasData.length > 0 && (
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        Cumplimiento de Metas — m³ (Programado vs Real)
                                    </h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getCumplimientoMetas()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                <Bar dataKey="meta" fill="#64748b" radius={[4, 4, 0, 0]} barSize={16} />
                                                <Bar dataKey="real" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mt-6">
                                        {getCumplimientoMetas().map(d => (
                                            <div key={d.name} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-center">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{d.name}</span>
                                                <h4 className={`text-lg font-black ${d.cumplimiento >= 80 ? 'text-emerald-400' : d.cumplimiento >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                    {d.cumplimiento}%
                                                </h4>
                                                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                    <div className={`h-full rounded-full ${d.cumplimiento >= 80 ? 'bg-emerald-500' : d.cumplimiento >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(100, d.cumplimiento)}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tabla BD */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
                                <div className="p-6 border-b border-slate-700 bg-slate-950/20">
                                    <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-widest">Registros BD ({bdData.length})</h3>
                                </div>
                                <div className="overflow-x-auto max-h-[500px]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-slate-900">
                                            <tr className="border-b border-slate-700">
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Día</th>
                                                <th className="p-3 text-[9px] font-black text-cyan-500 uppercase">PZ10 m³</th>
                                                <th className="p-3 text-[9px] font-black text-cyan-500 uppercase">PZ11 m³</th>
                                                <th className="p-3 text-[9px] font-black text-cyan-500 uppercase">PZ13 m³</th>
                                                <th className="p-3 text-[9px] font-black text-cyan-500 uppercase">PZ MED</th>
                                                <th className="p-3 text-[9px] font-black text-emerald-500 uppercase">PTAP1 m³</th>
                                                <th className="p-3 text-[9px] font-black text-amber-500 uppercase">EBAP HIJA</th>
                                                <th className="p-3 text-[9px] font-black text-amber-500 uppercase">EBAP ALAR</th>
                                                <th className="p-3 text-[9px] font-black text-amber-500 uppercase">EBAP PNUE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {bdData.slice(0, 31).map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-800/20">
                                                    <td className="p-3 font-black text-slate-100">{r.dia}/{r.mes}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.pz10_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.pz11_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.pz13_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.pzmed_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">{Number(r.ptap1_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.ebaphija_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.ebapalar_m3 || 0).toFixed(2)}</td>
                                                    <td className="p-3 font-mono font-bold">{Number(r.ebappnue_m3 || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {showEntry && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8">
                            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-6">Ingreso Manual de Datos</h3>
                            <p className="text-sm text-slate-400">Aquí puedes agregar registros manualmente (implementar formulario de ingreso).</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== SUB-VISTA: SURTIDOR ===== */}
            {isSurtidor && (
                <div className="space-y-8">
                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Fecha</span>
                            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-black rounded-xl px-4 py-3" />
                        </div>
                        <button onClick={() => handleFileUpload('surtidor')} disabled={uploading}
                            className="text-[10px] font-black uppercase tracking-widest px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
                            {uploading ? 'Importando...' : 'Importar Despacho Excel'}
                        </button>
                    </div>

                    {surtidorData.length > 0 && (
                        <>
                            {/* Gráficos Despacho de Agua */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Volumen por Vehículo (galones)</h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getSurtidorResumen().porVehiculo} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} width={70} />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Bar dataKey="valor" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14}>
                                                    {getSurtidorResumen().porVehiculo.map((_, idx) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Distribución por Punto de Despacho</h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={getSurtidorResumen().porSurtidor} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={130} innerRadius={50} paddingAngle={4}>
                                                    {getSurtidorResumen().porSurtidor.map((_, idx) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Evolución Diaria de Despachos */}
                            {evolucionSurtidor.length > 0 && (
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        Evolución Diaria de Despachos
                                    </h3>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={getEvolucionDiariaSurtidor()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="fecha" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontWeight="900" tickFormatter={v => v?.split('-').slice(1).join('/') || ''} />
                                                <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                <Bar yAxisId="left" dataKey="despachos" fill="#334155" radius={[4, 4, 0, 0]} barSize={12} name="Despachos" />
                                                <Line yAxisId="right" type="monotone" dataKey="galones" stroke="#10b981" strokeWidth={3} dot={false} name="Galones" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Cloro vs Volumen (Scatter) */}
                            {getCloroVsVolumen().length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Consumo de Cloro vs Volumen Despachado</h3>
                                        <div className="h-[350px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis dataKey="volumen" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" name="Volumen (gal)" />
                                                    <YAxis dataKey="cloro" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" name="Cloro (mg/L)" />
                                                    <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                    <Scatter data={getCloroVsVolumen()} fill="#10b981" opacity={0.6} />
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Frecuencia de Viajes por Vehículo</h3>
                                        <div className="h-[350px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={getFrecuenciaViajes()} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                    <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                    <YAxis type="category" dataKey="placa" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontWeight="900" width={70} />
                                                    <Tooltip cursor={false} formatter={(value, name) => [Number(value).toFixed(2), name === 'viajes' ? 'Viajes' : 'Galones']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                    <Bar dataKey="viajes" fill="#06b6d4" radius={[0, 6, 6, 0]} barSize={14} name="viajes" />
                                                    <Bar dataKey="total_galones" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14} name="total_galones" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabla Surtidor */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
                                <div className="p-6 border-b border-slate-700 bg-slate-950/20">
                                    <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-widest">Registros Despacho de Agua ({surtidorData.length})</h3>
                                </div>
                                <div className="overflow-x-auto max-h-[500px]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-slate-900">
                                            <tr className="border-b border-slate-700">
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Fecha</th>
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Punto</th>
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Placa</th>
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Vehículo</th>
                                                <th className="p-3 text-[9px] font-black text-emerald-500 uppercase">Galones</th>
                                                <th className="p-3 text-[9px] font-black text-cyan-500 uppercase">m³</th>
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Cloro</th>
                                                <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Operador</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {surtidorData.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-800/20">
                                                    <td className="p-3 font-bold">{r.fecha?.split('T')[0]}</td>
                                                    <td className="p-3 font-mono">{r.surtidor}</td>
                                                    <td className="p-3 font-bold text-sky-400">{r.placa}</td>
                                                    <td className="p-3">{r.tvehiculo}</td>
                                                    <td className="p-3 font-mono font-bold text-emerald-400">{format2Dec(r.volumen_gln)}</td>
                                                    <td className="p-3 font-mono text-cyan-400">{format2Dec(r.volumen_m3)}</td>
                                                    <td className="p-3 font-mono">{format2Dec(r.hipoclorito)}</td>
                                                    <td className="p-3 text-slate-400">{r.operador}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ===== SUB-VISTA: RÍO SAN JUAN ===== */}
            {isRSanjuan && (
                <div className="space-y-8">
                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl flex flex-wrap items-center gap-6">
                        <button onClick={() => handleFileUpload('rsanjuan')} disabled={uploading}
                            className="text-[10px] font-black uppercase tracking-widest px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
                            {uploading ? 'Importando...' : 'Importar Río San Juan Excel'}
                        </button>
                    </div>

                    {rioData.length > 0 && (
                        <>
                            {/* Gráficos Río San Juan */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl lg:col-span-2">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Caudal del Río San Juan — m³/s</h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={getRioChartData()}>
                                                <defs>
                                                    <linearGradient id="gradRio" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="fecha" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontWeight="900" tickFormatter={v => v?.split('-').slice(1).join('/') || ''} />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Area type="monotone" dataKey="caudal" stroke="#06b6d4" fill="url(#gradRio)" strokeWidth={3} dot={false} />
                                                <Area type="monotone" dataKey="max" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                                <Area type="monotone" dataKey="min" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Distribución Horaria del Caudal */}
                            {getDistribucionHorariaRio().length > 0 && (
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        Distribución Horaria del Caudal (m³/s)
                                    </h3>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getDistribucionHorariaRio()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="hora" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Bar dataKey="caudal" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20}>
                                                    {getDistribucionHorariaRio().map((_, idx) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Comparativa Mensual Río */}
                            {getComparativaMensualRio().length > 1 && (
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                        Comparativa Mensual — Caudal Río San Juan
                                    </h3>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={getComparativaMensualRio()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="mes" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                                <Bar dataKey="max" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} name="Máximo" />
                                                <Bar dataKey="caudal" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={12} name="Promedio" />
                                                <Bar dataKey="min" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} name="Mínimo" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Alertas Río San Juan */}
                            {alertasRio?.disparos?.length > 0 && (
                                <div className="bg-slate-800/50 border border-rose-500/30 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">warning</span>
                                        Alertas de Caudal Bajo
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Tipo</th>
                                                    <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Parámetro</th>
                                                    <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Umbral</th>
                                                    <th className="p-3 text-[9px] font-black text-rose-400 uppercase">Valor Actual</th>
                                                    <th className="p-3 text-[9px] font-black text-slate-500 uppercase">Fecha</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {alertasRio.disparos.slice(0, 5).map((a: any, i: number) => (
                                                    <tr key={i} className="hover:bg-slate-800/20">
                                                        <td className="p-3 font-black text-rose-400">{a.tipo}</td>
                                                        <td className="p-3">{a.parametro}</td>
                                                        <td className="p-3">{a.umbral} m³/s</td>
                                                        <td className="p-3 font-bold text-rose-400">{Number(a.valor_actual).toFixed(2)} m³/s</td>
                                                        <td className="p-3">{a.fecha} {a.hora}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Resumen Río */}
                            {dashData?.rio && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Caudal Promedio</span>
                                        <h3 className="text-2xl font-black text-white mt-1">{Number(dashData.rio.caudal_promedio || 0).toFixed(2)}</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">m³/s</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Caudal Máximo</span>
                                        <h3 className="text-2xl font-black text-white mt-1">{Number(dashData.rio.caudal_maximo || 0).toFixed(2)}</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">m³/s</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Caudal Mínimo</span>
                                        <h3 className="text-2xl font-black text-white mt-1">{Number(dashData.rio.caudal_minimo || 0).toFixed(2)}</h3>
                                        <p className="text-[9px] text-slate-500 font-bold">m³/s</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ===== SUB-VISTA: DASHBOARD ===== */}
            {isDashboard && (
                <div className="space-y-8" id="export-canvas-produccion">
                    {!dashData && !loading && (
                        <div className="text-center py-20 text-slate-500">
                            <span className="material-symbols-outlined text-6xl mb-4 block">analytics</span>
                            <p className="font-black uppercase tracking-widest text-sm">Sube datos de producción para ver el dashboard</p>
                        </div>
                    )}

                    {dashData && (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest relative">Producción Total</span>
                                    <h3 className="text-4xl font-black text-white mt-2 relative tracking-tighter">{format2DecLocale(dashData.bd?.produccion_total)}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 relative">m³ totales generados</p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest relative">Agua Despachada</span>
                                    <h3 className="text-4xl font-black text-white mt-2 relative tracking-tighter">{format2DecLocale(dashData.surtidor?.total_galones)}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 relative">galones de agua distribuidos</p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest relative">Vehículos</span>
                                    <h3 className="text-4xl font-black text-white mt-2 relative tracking-tighter">{dashData.surtidor?.vehiculos_abastecidos || 0}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 relative">unidades abastecidas con agua</p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest relative">Río San Juan</span>
                                    <h3 className="text-4xl font-black text-white mt-2 relative tracking-tighter">{Number(dashData.rio?.caudal_promedio || 0).toFixed(2)}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 relative">m³/s caudal promedio</p>
                                </div>
                            </div>

                            {/* Top Fuentes */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Ranking de Producción por Fuente</h3>
                                    <div className="h-[450px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={dashData.topFuentes?.map((f: any) => ({ ...f, name: FUENTES_MAP[f.fuente] || f.fuente })) || []} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} width={120} />
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Bar dataKey="m3" radius={[0, 8, 8, 0]} barSize={18}>
                                                    {dashData.topFuentes?.map((_: any, idx: number) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Contribución % por Fuente</h3>
                                    <div className="h-[450px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={dashData.topFuentes || []} dataKey="m3" nameKey="fuente" cx="50%" cy="50%" outerRadius={140} innerRadius={70} paddingAngle={2}>
                                                    {dashData.topFuentes?.map((_: any, idx: number) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <Legend formatter={(v: string) => FUENTES_MAP[v] || v} wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Gráfico radial de eficiencia */}
                            {dashData.topFuentes?.length > 0 && (
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Horas de Operación por Fuente</h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={16} data={dashData.topFuentes?.map((f: any) => ({ ...f, name: FUENTES_MAP[f.fuente] || f.fuente, horas: Number(f.horas) || 0 })) || []}>
                                                <RadialBar dataKey="horas" background={{ fill: '#1e293b' }} label={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}>
                                                    {dashData.topFuentes?.map((_: any, idx: number) => (
                                                        <Cell key={idx} fill={COLORS_POZOS[idx % COLORS_POZOS.length]} />
                                                    ))}
                                                </RadialBar>
                                                <Legend formatter={(v: string) => FUENTES_MAP[v] || v} wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                                        <Tooltip cursor={false} formatter={(value) => [Number(value).toFixed(2)]} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                </RadialBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Score Consolidado */}
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-3xl">
                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                        Score de Gestión — Indicador Consolidado
                                    </h3>
                                    {(() => {
                                        const scoreData = getScoreConsolidado()
                                        return (
                                            <div className="flex flex-col md:flex-row items-center gap-8">
                                                <div className="relative w-40 h-40 flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                                        <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="8" />
                                                        <circle cx="60" cy="60" r="54" fill="none" stroke={
                                                            scoreData.score >= 80 ? '#10b981' : scoreData.score >= 50 ? '#f59e0b' : '#ef4444'
                                                        } strokeWidth="8" strokeDasharray={`${(scoreData.score / 100) * 339.292} 339.292`} strokeLinecap="round" />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className={`text-4xl font-black ${
                                                            scoreData.score >= 80 ? 'text-emerald-400' : scoreData.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                                                        }`}>{Number(scoreData.score).toFixed(2)}</span>
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">/ 100</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                                                    {scoreData.items.map((item: any) => (
                                                        <div key={item.label} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-center">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                                                            <h4 className="text-xl font-black text-white mt-1">{Number(item.value).toFixed(2)}</h4>
                                                            <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                                <div className={`h-full rounded-full ${
                                                                    item.value >= 80 ? 'bg-emerald-500' : item.value >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`} style={{ width: `${Math.min(100, item.value)}%` }}></div>
                                                            </div>
                                                            <span className="text-[8px] text-slate-600 font-bold mt-1 block">{item.peso}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* Botón Exportar PDF */}
                                <div className="flex justify-end">
                                    <button onClick={async () => {
                                        const exportEl = document.getElementById('export-canvas-produccion')
                                        if (!exportEl) return
                                        try {
                                            const blob = await toPng(exportEl, { quality: 0.95, pixelRatio: 2 })
                                            const pdf = new jsPDF('l', 'mm', 'a3')
                                            const imgProps = pdf.getImageProperties(blob)
                                            const pdfW = pdf.internal.pageSize.getWidth()
                                            const pdfH = (imgProps.height * pdfW) / imgProps.width
                                            pdf.addImage(blob, 'PNG', 0, 0, pdfW, pdfH)
                                            pdf.save('Dashboard-Produccion-OPAPTAR.pdf')
                                        } catch { }
                                    }}
                                        className="text-[10px] font-black uppercase tracking-widest px-8 py-4 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition-all flex items-center gap-3 shadow-lg shadow-amber-900/30">
                                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                        Exportar Dashboard PDF
                                    </button>
                                </div>

                                {/* Cumplimiento Metas en Dashboard */}
                                {metasData.length > 0 && bdData.length > 0 && (
                                    <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl">
                                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest mb-6">Cumplimiento de Metas por Fuente</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {getCumplimientoMetas().map(d => (
                                                <div key={d.name} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 text-center">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{d.name}</span>
                                                    <h4 className={`text-2xl font-black mt-1 ${
                                                        d.cumplimiento >= 80 ? 'text-emerald-400' : d.cumplimiento >= 50 ? 'text-amber-400' : 'text-rose-400'
                                                    }`}>{d.cumplimiento}%</h4>
                                                    <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                        <div className={`h-full rounded-full ${
                                                            d.cumplimiento >= 80 ? 'bg-emerald-500' : d.cumplimiento >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                        }`} style={{ width: `${Math.min(100, d.cumplimiento)}%` }}></div>
                                                    </div>
                                                    <span className="text-[8px] text-slate-500 font-bold mt-1 block">
                                                        {d.real.toFixed(2)} / {d.meta.toFixed(2)} m³
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
            )}
        </div>
    )
}
