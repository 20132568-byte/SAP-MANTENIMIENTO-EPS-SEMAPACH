import React, { useState, useEffect } from 'react'
import { api } from '../api/client'

/** Convierte array de objetos a CSV y dispara descarga */
function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            const val = row[h]
            if (val == null) return ''
            const str = String(val)
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"` : str
        }).join(','))
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
}

const reportTypes = [
    { id: 'activos', label: 'Maestro de Activos', icon: 'precision_manufacturing', desc: 'Listado completo de activos con estado, criticidad y lecturas actuales.' },
    { id: 'fallas', label: 'Registro de Fallas', icon: 'warning', desc: 'Historial de fallas con clasificación, severidad, duración y costos.' },
    { id: 'preventivos', label: 'Mantenimientos Preventivos', icon: 'construction', desc: 'Eventos preventivos ejecutados con lecturas, intervalos y costos.' },
    { id: 'registros', label: 'Registros Diarios', icon: 'edit_calendar', desc: 'Uso diario por activo con horas y kilometraje.' },
    { id: 'kpi', label: 'KPI por Activo', icon: 'analytics', desc: 'MTTR, MTBF, disponibilidad y costos por cada activo.' },
    { id: 'backlog', label: 'Backlog Preventivo', icon: 'event_repeat', desc: 'Estado preventivo de cada activo con progreso y próximo objetivo.' },
    { id: 'diagnosticos', label: 'Diagnósticos Iniciales', icon: 'assignment', desc: 'Estado técnico inicial y calidad de dato de cada activo.' },
    { id: 'catalogos', label: 'Catálogos', icon: 'list_alt', desc: 'Todos los valores de catálogo del sistema.' },
    { id: 'water', label: 'Monitoreo de Agua', icon: 'water_drop', desc: 'Historial de presión y continuidad por distrito del mes seleccionado.' },
]

export default function Reportes() {
    const [generating, setGenerating] = useState('')
    const [toast, setToast] = useState<string | null>(null)
    const getCurrentWeek = () => {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
    }

    const [week, setWeek] = useState(getCurrentWeek())
    const [sector, setSector] = useState('General')
    const [assets, setAssets] = useState<any[]>([])

    const { desde, hasta } = React.useMemo(() => {
        const [y, w] = week.split('-W')
        if (!y || !w) return { desde: '', hasta: '' }
        const year = parseInt(y, 10)
        const d = new Date(year, 0, 4)
        const day = d.getDay() || 7
        d.setDate(d.getDate() - day + 1 + (parseInt(w, 10) - 1) * 7)
        const st = new Date(d); const en = new Date(d)
        en.setDate(en.getDate() + 6)
        return { desde: st.toISOString().split('T')[0], hasta: en.toISOString().split('T')[0] }
    }, [week])

    useEffect(() => {
        api.getAssets().then(setAssets)
    }, [])

    const sectores = ['General', ...Array.from(new Set(assets.map(a => a.tipo_unidad))).filter(Boolean)]

    const generate = async (id: string) => {
        setGenerating(id)
        try {
            let data: any[] = []
            switch (id) {
                case 'activos': data = await api.getAssets(); break
                case 'fallas': data = await api.getFailures(); break
                case 'preventivos': data = await api.getPreventiveEvents(); break
                case 'registros': data = await api.getDailyRecords(); break
                case 'kpi': data = await api.getKPIPorActivo(desde, hasta, sector); break
                case 'backlog': data = await api.getPreventiveBacklog(); break
                case 'diagnosticos': data = await api.getDiagnoses(); break
                case 'catalogos': data = await api.getAllCatalogs(); break
                case 'water': data = await api.getWaterReadings({ inicio: desde, fin: hasta }); break
            }
            if (data.length === 0) {
                setToast('Sin datos para exportar'); setTimeout(() => setToast(null), 2500)
            } else {
                exportToCSV(data, `semapach_${id}`)
                setToast(`${data.length} registros exportados`); setTimeout(() => setToast(null), 2500)
            }
        } catch { setToast('Error al generar reporte') }
        setGenerating('')
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-100">Reportes y Exportación</h2>
                    <p className="text-xs text-slate-500 mt-1">Exportar datos en formato CSV — {desde} al {hasta}</p>
                </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 p-responsive rounded-3xl mb-10 shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40">
                        <span className="material-symbols-outlined text-white text-3xl">download_for_offline</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Reportes y Exportación</h2>
                        <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mt-1 italic">Gestión de Datos y Auditoría Externa</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-900/50 p-2 rounded-3xl border border-slate-700 shadow-inner">
                    <div className="flex items-center gap-2 pl-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periodo:</span>
                        <input type="week" value={week} onChange={e => setWeek(e.target.value)}
                            className="text-xs font-black text-slate-100 bg-slate-950/30 border-slate-700 rounded-xl py-2 px-3 focus:ring-sky-500 shadow-sm" />
                    </div>
                    <div className="h-8 w-px bg-slate-700 hidden sm:block mx-4"></div>
                    <div className="flex items-center gap-2 pr-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Sector:</span>
                        <select value={sector} onChange={e => setSector(e.target.value)}
                            className="text-xs font-black text-slate-100 bg-slate-950/30 border-slate-700 rounded-xl py-2 px-3 focus:ring-sky-500 shadow-sm">
                            {sectores.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportTypes.map(r => (
                    <div key={r.id} className="bg-slate-800/50 border border-slate-700 shadow-premium-xl p-8 flex flex-col group hover:-translate-y-2 transition-all duration-500 rounded-3xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none radar-grid"></div>
                        <div className="flex items-start gap-5 mb-6 relative z-10">
                            <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-all duration-500">
                                <span className="material-symbols-outlined text-sky-400 text-[28px]">{r.icon}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">{r.label}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Exportación CSV</p>
                            </div>
                        </div>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed mb-8 flex-1">{r.desc}</p>
                        <button onClick={() => generate(r.id)} disabled={generating === r.id}
                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 ${
                                generating === r.id 
                                    ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800' 
                                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-900/40 hover:shadow-sky-300 border-none active:scale-95'
                            }`}>
                            <span className="material-symbols-outlined text-[18px]">{generating === r.id ? 'hourglass_top' : 'file_download'}</span>
                            {generating === r.id ? 'Generando...' : 'Descargar Reporte'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl shadow-premium-xl !p-10">
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
                    Información de Soporte Técnico
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
                        <span className="material-symbols-outlined text-sky-400 mb-3">format_list_bulleted</span>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Formato Estándar</p>
                        <p className="text-xs font-bold text-slate-300">Archivos CSV nativos para Excel y Google Sheets</p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
                        <span className="material-symbols-outlined text-sky-400 mb-3">security</span>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Integridad</p>
                        <p className="text-xs font-bold text-slate-300">Codificación UTF-8 con BOM para caracteres especiales</p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
                        <span className="material-symbols-outlined text-sky-400 mb-3">sync</span>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sincronización</p>
                        <p className="text-xs font-bold text-slate-300">KPIs calculados sobre la semana seleccionada</p>
                    </div>
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
                        <span className="material-symbols-outlined text-sky-400 mb-3">verified</span>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Auditoría</p>
                        <p className="text-xs font-bold text-slate-300">Todos los reportes incluyen marcas de tiempo</p>
                    </div>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-20 lg:bottom-12 right-4 lg:right-12 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in-up border-l-4 border-emerald-500">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{toast}</span>
                </div>
            )}
        </div>
    )
}
