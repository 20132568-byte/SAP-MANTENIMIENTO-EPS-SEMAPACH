import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function APMDesempenio() {
    const [assets, setAssets] = useState<any[]>([])
    const [selected, setSelected] = useState<any>(null)
    const [kpiActivo, setKpiActivo] = useState<any>(null)
    const [fallas, setFallas] = useState<any[]>([])
    const [preventivos, setPrev] = useState<any[]>([])
    const [dailyRecords, setDailyRecords] = useState<any[]>([])
    const [diag, setDiag] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const hasta = new Date().toISOString().split('T')[0]
    const desdeDate = new Date(); desdeDate.setDate(desdeDate.getDate() - 90)
    const desde = desdeDate.toISOString().split('T')[0]

    useEffect(() => { api.getAssets().then(a => { setAssets(a); setLoading(false) }) }, [])

    const selectAsset = async (asset: any) => {
        setSelected(asset)
        const [kpis, fl, pv, dg, dr] = await Promise.all([
            api.getKPIPorActivo(desde, hasta),
            api.getFailures({ asset_id: String(asset.id) }),
            api.getPreventiveEvents({ asset_id: String(asset.id) }),
            api.getDiagnosis(asset.id),
            api.getDailyRecords({ asset_id: String(asset.id) }),
        ])
        setKpiActivo(kpis.find((k: any) => k.asset_id === asset.id) || null)
        setFallas(fl)
        setPrev(pv)
        setDiag(dg)
        setDailyRecords(dr.filter((r: any) => r.observaciones?.trim()))
    }

    const formatDuration = (h: number | null) => {
        if (h == null) return '---'
        const hours = Math.floor(h)
        const minutes = Math.round((h - hours) * 60)
        return `${h.toFixed(2)}h (${minutes} min)`
    }

    // Cálculo de semáforo de salud vinculado a Diagnóstico y KPIs
    const healthScore = (kpi: any, diagnosis: any) => {
        if (!kpi) return { score: 0, label: 'Sin datos', color: 'text-slate-400', bg: 'bg-slate-100', icon: 'pending' }
        
        let score = 100
        
        // 1. Penalización por Diagnóstico Base (Pasado)
        if (diagnosis) {
            if (diagnosis.estado_tecnico_inicial === 'Crítica') score -= 60;
            else if (diagnosis.estado_tecnico_inicial === 'Deteriorada') score -= 40;
            else if (diagnosis.estado_tecnico_inicial === 'Regular') score -= 15;
        }

        // 2. Penalización por Disponibilidad (Presente)
        if (kpi.disponibilidad != null) { 
            if (kpi.disponibilidad < 70) score -= 40; 
            else if (kpi.disponibilidad < 85) score -= 20;
        }

        // 3. Penalización por Confiabilidad y Reparación
        if (kpi.mttr != null) { 
            if (kpi.mttr > 10) score -= 30; 
            else if (kpi.mttr > 5) score -= 15;
        }

        // 4. Penalización por Frecuencia
        if (kpi.total_fallas > 3) score -= 25; 
        else if (kpi.total_fallas > 0) score -= 10;

        score = Math.max(0, Math.min(100, score))
        
        if (score >= 80) return { score, label: 'Saludable', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: 'verified_user' }
        if (score >= 60) return { score, label: 'Alerta', color: 'text-amber-500', bg: 'bg-amber-50', icon: 'warning' }
        if (score >= 40) return { score, label: 'En Riesgo', color: 'text-orange-500', bg: 'bg-orange-50', icon: 'report' }
        return { score, label: 'Falla Crítica', color: 'text-rose-500', bg: 'bg-rose-50', icon: 'dangerous' }
    }

    const estadoColors: Record<string, string> = {
        'Operativo': 'text-emerald-500',
        'En reparación': 'text-orange-500',
        'Fuera de servicio': 'text-rose-500',
        'En mantenimiento preventivo': 'text-sky-500',
        'Baja': 'text-slate-400',
    }

    if (loading) return <div className="p-8 text-center text-sm font-black text-slate-400 uppercase tracking-widest">Iniciando análisis...</div>

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 p-responsive rounded-3xl mb-10 shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40">
                        <span className="material-symbols-outlined text-white text-4xl">analytics</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Desempeño del Activo</h2>
                        <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mt-1 italic">Auditoría 360° de Confiabilidad de Activos</p>
                    </div>
                </div>
                
                <div className="flex flex-col bg-slate-900/50 p-4 rounded-3xl border border-slate-700 min-w-[350px] shadow-inner">
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 ml-1">Selección de Activo</span>
                    <select 
                        value={selected?.id || ''} 
                        onChange={e => { const a = assets.find(x => x.id === Number(e.target.value)); if (a) selectAsset(a) }}
                        className="w-full py-3 pl-4 pr-10 font-black text-xs text-slate-100 bg-slate-950/30 border-slate-700 rounded-xl focus:ring-sky-500 shadow-sm">
                        <option value="" className="bg-slate-900">Seleccionar flota...</option>
                        {assets.map(a => (
                            <option key={a.id} value={a.id} className="bg-slate-900">
                                {a.placa_principal || 'S/P'} — {a.codigo_patrimonial} ({a.tipo_unidad})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selected ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-32 text-center flex flex-col items-center shadow-premium-xl">
                    <div className="w-24 h-24 bg-slate-900/50 border border-slate-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <span className="material-symbols-outlined text-5xl text-slate-700">monitor_heart</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Listo para Iniciar Análisis</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Seleccione una unidad del inventario para cargar su perfil de desempeño</p>
                </div>
            ) : (
                <div className="space-y-8 pb-12">
                    {/* Tarjeta de Identidad Principal */}
                    <div className="bg-slate-800/50 border border-slate-700 shadow-premium-xl overflow-hidden rounded-3xl">
                        <div className="p-10 border-b border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex flex-col">
                                <span className="tag-premium-sky mb-4">Perfil Operativo del Activo</span>
                                <h3 className="text-5xl font-black text-slate-100 tracking-tighter">{selected.placa_principal || '—'}</h3>
                                <div className="flex items-center gap-4 mt-4">
                                    <span className="text-base font-black text-slate-500">{selected.codigo_patrimonial}</span>
                                    <span className="w-2 h-2 bg-slate-700 rounded-full"></span>
                                    <span className="text-base font-black text-slate-300 uppercase tracking-widest">{selected.tipo_unidad}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-10 p-6 bg-slate-900/50 rounded-3xl border border-slate-700">
                                <div className="text-right border-r border-slate-700 pr-10 last:border-0">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estado de Flota</span>
                                    <p className={`text-xl font-black uppercase mt-1 ${estadoColors[selected.estado] || 'text-slate-400'}`}>
                                        {selected.estado}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nivel Criticidad</span>
                                    <p className="text-xl font-black text-slate-100 uppercase mt-1">
                                        {selected.criticidad}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-700 bg-slate-950/20">
                            {[
                                { label: 'Recorrido Actual', val: `${selected.km_actual} km`, icon: 'speed' },
                                { label: 'Uso de Motor', val: `${selected.horometro_actual} h`, icon: 'timer' },
                                { label: 'Programación KPI', val: `${selected.horas_programadas_estandar || 8} h/día`, icon: 'schedule' },
                                { label: 'Protocolo Control', val: selected.forma_control, icon: 'edit_calendar' }
                            ].map((item, idx) => (
                                <div key={idx} className="p-8 flex flex-col items-center text-center group hover:bg-slate-800 transition-all duration-500 relative">
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] pointer-events-none radar-grid transition-opacity"></div>
                                    <span className="material-symbols-outlined text-slate-600 text-[28px] mb-3 group-hover:text-sky-400 group-hover:rotate-12 transition-all duration-500">{item.icon}</span>
                                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2">{item.label}</span>
                                    <p className="text-sm font-black text-slate-100 uppercase leading-tight tracking-tight">{item.val}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fila de Salud y KPIs */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* SCORE CARD */}
                        <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 p-10 flex flex-col items-center justify-center shadow-premium-xl relative overflow-hidden group rounded-3xl hover:-translate-y-2 transition-all duration-500">
                            <div className="absolute inset-0 opacity-[0.05] pointer-events-none radar-grid"></div>
                            {(() => {
                                const h = healthScore(kpiActivo, diag); return (<>
                                    <div className={`absolute top-0 inset-x-0 h-2 bg-${h.color.split('-')[1]}-500 opacity-40`}></div>
                                    <div className={`w-32 h-32 rounded-[2.5rem] bg-slate-900/50 border border-slate-700 flex items-center justify-center mb-8 shadow-inner transition-all duration-700 group-hover:scale-110 group-hover:rotate-3`}>
                                        <span className={`text-5xl font-black ${h.color}`}>{h.score}%</span>
                                    </div>
                                    <div className="text-center relative z-10">
                                        <div className={`flex items-center justify-center gap-2.5 mb-2`}>
                                            <span className={`material-symbols-outlined ${h.color} text-[22px]`}>{h.icon}</span>
                                            <span className={`text-base font-black uppercase tracking-[0.2em] ${h.color}`}>{h.label}</span>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Health Index System</span>
                                    </div>
                                </>)
                            })()}
                        </div>

                        {/* KPI GRID */}
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {[
                                { 
                                    label: 'Disponibilidad', 
                                    val: kpiActivo?.disponibilidad != null ? `${kpiActivo.disponibilidad.toFixed(2)}%` : '---',
                                    sub: 'Disponibilidad Técnica',
                                    icon: 'verified',
                                    color: kpiActivo?.disponibilidad >= 85 ? 'sky' : (kpiActivo?.disponibilidad >= 70 ? 'amber' : 'rose'),
                                    isFault: kpiActivo?.disponibilidad < 70
                                },
                                { 
                                    label: 'MTTR', 
                                    val: kpiActivo?.mttr != null ? `${kpiActivo.mttr.toFixed(2)}h` : '---',
                                    sub: 'Horas x Reparación',
                                    icon: 'timer',
                                    color: 'slate',
                                    isFault: kpiActivo?.mttr > 5
                                },
                                { 
                                    label: 'Freq. Fallas', 
                                    val: kpiActivo?.total_fallas ?? 0,
                                    sub: 'Incidentes Periodo',
                                    icon: 'report_problem',
                                    color: (kpiActivo?.total_fallas || 0) > 0 ? 'rose' : 'emerald',
                                    isFault: (kpiActivo?.total_fallas || 0) > 1
                                },
                                { 
                                    label: 'Gasto Correctivo', 
                                    val: `S/ ${kpiActivo?.costo_total ?? 0}`,
                                    sub: 'Inversión en Reparación',
                                    icon: 'payments',
                                    color: 'amber'
                                }
                            ].map((kpi, i) => (
                                <div key={i} className="bg-slate-800/50 border border-slate-700 p-8 shadow-premium hover:shadow-premium-xl transition-all duration-500 rounded-3xl group cursor-pointer hover:-translate-y-2 relative overflow-hidden">
                                     <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] pointer-events-none radar-grid transition-opacity"></div>
                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">{kpi.label}</span>
                                        <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 flex items-center justify-center group-hover:rotate-12 transition-all duration-500`}>
                                            <span className={`material-symbols-outlined text-${kpi.color}-400 text-[22px]`}>{kpi.icon}</span>
                                        </div>
                                    </div>
                                    <p className={`text-4xl font-black ${kpi.isFault ? 'text-rose-500' : 'text-slate-100'} tracking-tighter relative z-10 transition-transform group-hover:scale-105 origin-left`}>{kpi.val}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3 relative z-10 italic">{kpi.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Historiales y Diagnóstico */}
                    {/* Historiales y Diagnóstico */}
                    <div className="flex flex-col gap-8">
                        {/* DIAGNÓSTICO Y RESUMEN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {diag && (
                                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 shadow-premium-xl">
                                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-sky-400 mb-6 flex items-center gap-3">
                                        <span className="w-6 h-0.5 bg-sky-900"></span> Diagnóstico Inicial
                                    </h4>
                                    
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Estado Técnico</span>
                                                <p className="text-sm font-black uppercase text-slate-100 leading-tight">{diag.estado_tecnico_inicial}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Prioridad Semapach</span>
                                                <p className="text-sm font-black uppercase text-slate-100 leading-tight">{diag.prioridad_manual || 'Baja'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Comentario de Especialista</span>
                                            <p className="text-xs text-slate-400 italic leading-relaxed">
                                                "{diag.observacion_tecnica || 'Sin observaciones registradas durante el diagnóstico base.'}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-slate-800/50 rounded-3xl p-8 shadow-premium-xl flex-1 border border-sky-500/30">
                                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-sky-400 mb-8 flex items-center gap-3">
                                    <span className="w-6 h-0.5 bg-sky-900"></span> Resumen Semanal
                                </h4>
                                <div className="space-y-4">
                                    <div className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-end border border-slate-700">
                                        <span className="text-xs font-bold text-slate-400">Downtime Total</span>
                                        <span className="text-xl font-black text-slate-100">{formatDuration(kpiActivo?.horas_perdidas)}</span>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-end border border-slate-700">
                                        <span className="text-xs font-bold text-slate-400">Fallas Críticas</span>
                                        <span className="text-xl font-black text-slate-100">{fallas.filter(f => f.severidad === 'Crítica').length}</span>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl flex justify-between items-end border border-slate-700">
                                        <span className="text-xs font-bold text-slate-400">Prev. Pendientes</span>
                                        <span className="text-xl font-black text-slate-100">---</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LISTAS BOX */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* FALLAS */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-xl flex flex-col">
                                <div className="p-6 border-b border-slate-700 bg-slate-950/20 flex justify-between items-center">
                                    <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-900/50"></div>
                                        Log de Eventos Correctivos
                                    </h4>
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{fallas.length} registros</span>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: '420px' }}>
                                    {fallas.length === 0 ? (
                                        <div className="p-12 text-center flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-700 mb-2">check_circle</span>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sin fallas registradas</p>
                                        </div>
                                    ) : fallas.map((f: any) => (
                                        <div key={f.id} className="p-5 border-b border-slate-700 hover:bg-slate-800 transition-colors last:border-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[9px] font-black text-slate-500 font-mono tracking-tighter uppercase">{f.fecha}</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                    f.severidad === 'Crítica' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-900 text-slate-400'
                                                }`}>{f.severidad || '---'}</span>
                                            </div>
                                            <p className="text-xs font-black text-slate-100 mb-1 leading-tight">{f.descripcion || f.clasificacion_falla}</p>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[10px] text-slate-500">history</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">{formatDuration(f.duracion_horas)} Reparación</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[10px] text-slate-500">payments</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">S/ {f.costo_reparacion || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PREVENTIVOS */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-xl flex flex-col">
                                <div className="p-6 border-b border-slate-700 bg-slate-950/20 flex justify-between items-center">
                                    <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shadow-lg shadow-sky-900/50"></div>
                                        Plan de Mantenimiento Ejecutado
                                    </h4>
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{preventivos.length} registros</span>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: '420px' }}>
                                    {preventivos.length === 0 ? (
                                        <div className="p-12 text-center flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-700 mb-2">event_busy</span>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sin eventos ejecutados</p>
                                        </div>
                                    ) : preventivos.map((p: any) => (
                                        <div key={p.id} className="p-5 border-b border-slate-700 hover:bg-slate-800 transition-colors last:border-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-black text-slate-500 font-mono uppercase">{p.fecha_mantenimiento}</span>
                                                <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">{p.tipo_preventivo}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Lectura Control</span>
                                                    <span className="text-xs font-black text-slate-100">{p.lectura_al_momento} {p.unidad_control}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Inversión</span>
                                                    <span className="text-xs font-black text-slate-100">S/ {p.costo || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* OBSERVACIONES DIARIAS */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-xl flex flex-col">
                                <div className="p-6 border-b border-slate-700 bg-slate-950/20 flex justify-between items-center">
                                    <h4 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-lg shadow-amber-900/50"></div>
                                        Voz del Operador (Diario)
                                    </h4>
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{dailyRecords.length} reportes</span>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: '420px' }}>
                                    {dailyRecords.length === 0 ? (
                                        <div className="p-12 text-center flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-700 mb-2">forum</span>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sin comentarios diarios</p>
                                        </div>
                                    ) : dailyRecords.map((r: any) => (
                                        <div key={r.id} className="p-5 border-b border-slate-700 hover:bg-slate-800 transition-colors last:border-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-black text-slate-500 font-mono uppercase">{r.fecha}</span>
                                                <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase">Reporte Diario</span>
                                            </div>
                                            <p className="text-xs font-black text-slate-200 leading-relaxed italic">
                                                "{r.observaciones}"
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[10px] text-slate-400">person</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">Operador Responsable</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

