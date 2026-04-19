import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

interface Alerta {
    tipo: 'critica' | 'advertencia' | 'info' | 'ok'
    icono: string
    titulo: string
    detalle: string
    activo?: string
    source?: 'fleet' | 'station'
}

interface Recomendacion {
    prioridad: 'inmediata' | 'alta' | 'media' | 'baja'
    titulo: string
    detalle: string
    activos: string[]
    estaciones?: string[]
    source?: 'fleet' | 'station'
}

export default function MotorInteligencia() {
    const { assetType } = useAssetType()
    const [alertas, setAlertas] = useState<Alerta[]>([])
    const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([])
    const [rankings, setRankings] = useState<{ peores: any[]; mejores: any[]; stationWorst: any[]; stationBest: any[] }>({ peores: [], mejores: [], stationWorst: [], stationBest: [] })
    const [kpi, setKpi] = useState<any>(null)
    const [assets, setAssets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const getCurrentWeek = () => {
        const d = new Date(); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
    }

    const [week, setWeek] = useState(getCurrentWeek())
    const [sector, setSector] = useState('General')

    const { desde, hasta } = React.useMemo(() => {
        const [y, w] = week.split('-W')
        if (!y || !w) return { desde: '', hasta: '' }
        const year = parseInt(y, 10); const d = new Date(year, 0, 4)
        const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1 + (parseInt(w, 10) - 1) * 7)
        const st = new Date(d); const en = new Date(d); en.setDate(en.getDate() + 6)
        return { desde: st.toISOString().split('T')[0], hasta: en.toISOString().split('T')[0] }
    }, [week])

    useEffect(() => {
        setLoading(true)
        const stationParams = desde && hasta ? { desde, hasta } : undefined
        const showFleet = assetType === 'fleet'
        const showStations = assetType === 'stations'

        const promises: Promise<any>[] = []
        if (showFleet) {
            promises.push(api.getKPIGlobal(desde, hasta, sector, 'fleet'))
            promises.push(api.getKPIPorActivo(desde, hasta, sector, 'fleet'))
            promises.push(api.getPreventiveBacklog())
            promises.push(api.getAssets({ categoria: 'fleet' }))
            promises.push(api.getDiagnoses())
            promises.push(api.getDailyRecords({ desde, hasta }))
        }
        if (showStations) {
            promises.push(api.getStationAlerts(stationParams))
            promises.push(api.getStationRecommendations())
            promises.push(api.getStationRankings(stationParams))
        }

        Promise.all(promises).then((results) => {
            let kpiG: any = null, kpiA: any[] = [], backlog: any[] = [], fleetAssets: any[] = [], diagnoses: any[] = [], daily: any[] = []
            let stationAlerts: any[] = [], stationRecs: any[] = [], stationRankings: any = { worst: [], best: [] }

            if (showFleet && showStations) {
                [kpiG, kpiA, backlog, fleetAssets, diagnoses, daily, stationAlerts, stationRecs, stationRankings] = results
            } else if (showFleet) {
                [kpiG, kpiA, backlog, fleetAssets, diagnoses, daily] = results
            } else {
                [stationAlerts, stationRecs, stationRankings] = results
            }

            setAssets(fleetAssets)
            setKpi(kpiG)

            // Alertas
            const allAlerts: Alerta[] = []
            if (showFleet) {
                generarAlertasFlota(kpiG, kpiA, backlog, fleetAssets, diagnoses, daily, allAlerts, fleetAssets)
            }
            if (showStations) {
                allAlerts.push(...stationAlerts.map((a: any) => ({ ...a, source: 'station' as const })))
            }
            setAlertas(allAlerts.length > 0 ? allAlerts : [{ tipo: 'ok', icono: 'check_circle', titulo: 'Sistema operando normalmente', detalle: 'No se detectaron anomalías', source: showFleet ? 'fleet' : 'station' }])

            // Recomendaciones
            const allRecs: Recomendacion[] = []
            if (showFleet) generarRecomendacionesFlota(kpiG, kpiA, backlog, fleetAssets, allRecs)
            if (showStations) allRecs.push(...(stationRecs as Recomendacion[]).map(r => ({ ...r, source: 'station' as const, activos: r.estaciones || [] })))
            setRecomendaciones(allRecs)

            // Rankings
            if (showFleet) {
                const sorted = [...kpiA].filter(a => a.disponibilidad != null).sort((a, b) => a.disponibilidad - b.disponibilidad)
                setRankings(prev => ({ ...prev, peores: sorted.slice(0, 5), mejores: sorted.slice(-5).reverse() }))
            }
            if (showStations) {
                setRankings(prev => ({ ...prev, stationWorst: stationRankings.worst || [], stationBest: stationRankings.best || [] }))
            }
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [desde, hasta, sector, assetType])

    const sectores = ['General', ...Array.from(new Set(assets.map(a => a.tipo_unidad))).filter(Boolean)]

    const generarAlertasFlota = (kpiG: any, kpiA: any[], backlog: any[], fleetAssets: any[], diagnoses: any[], daily: any[], al: Alerta[], allAssets: any[]) => {
        const placa = (codigo: string) => { const a = allAssets.find(x => x.codigo_patrimonial === codigo); return a?.placa_principal || codigo }
        diagnoses.forEach(d => {
            const asset = fleetAssets.find(a => a.id === d.asset_id)
            if (asset && (d.estado_tecnico_inicial === 'Crítica' || d.estado_tecnico_inicial === 'Deteriorada'))
                al.push({ tipo: d.estado_tecnico_inicial === 'Crítica' ? 'critica' : 'advertencia', icono: 'heart_broken', titulo: `Estado Base: ${d.estado_tecnico_inicial}`, detalle: `${asset.placa_principal || asset.codigo_patrimonial} requiere atención.`, activo: asset.placa_principal, source: 'fleet' })
        })
        backlog.filter(b => b.estado_preventivo === 'Vencido').forEach(v => al.push({ tipo: 'critica', icono: 'emergency', titulo: 'Preventivo vencido', detalle: `${placa(v.asset_codigo)} superó el intervalo (${v.progreso}%)`, activo: placa(v.asset_codigo), source: 'fleet' }))
        backlog.filter(b => b.estado_preventivo === 'Crítico').forEach(v => al.push({ tipo: 'advertencia', icono: 'schedule', titulo: 'Preventivo próximo a vencer', detalle: `${placa(v.asset_codigo)} al ${v.progreso}%`, activo: placa(v.asset_codigo), source: 'fleet' }))
        kpiA.filter(a => a.mttr != null && a.mttr > 8).forEach(a => al.push({ tipo: 'advertencia', icono: 'timer', titulo: 'MTTR elevado', detalle: `${placa(a.asset_codigo)}: MTTR ${a.mttr.toFixed(2)}h`, activo: placa(a.asset_codigo), source: 'fleet' }))
        kpiA.filter(a => a.disponibilidad != null && a.disponibilidad < 70).forEach(a => al.push({ tipo: 'critica', icono: 'trending_down', titulo: 'Disponibilidad crítica', detalle: `${placa(a.asset_codigo)}: ${a.disponibilidad}%`, activo: placa(a.asset_codigo), source: 'fleet' }))
        fleetAssets.filter(a => a.estado === 'Fuera de servicio').forEach(a => al.push({ tipo: 'critica', icono: 'block', titulo: 'Fuera de servicio', detalle: `${a.placa_principal || a.codigo_patrimonial} (${a.tipo_unidad})`, activo: a.placa_principal, source: 'fleet' }))
        daily.filter(d => d.observaciones && d.observaciones.trim() !== '').forEach(o => {
            const asset = fleetAssets.find(a => a.id === o.asset_id)
            if (asset) al.push({ tipo: 'info', icono: 'chat_bubble', titulo: 'Observación de Operador', detalle: `${asset.placa_principal}: "${o.observaciones}"`, activo: asset.placa_principal, source: 'fleet' })
        })
    }

    const generarRecomendacionesFlota = (kpiG: any, kpiA: any[], backlog: any[], fleetAssets: any[], rec: Recomendacion[]) => {
        const placa = (codigo: string) => { const a = fleetAssets.find(x => x.codigo_patrimonial === codigo); return a?.placa_principal || codigo }
        const vencidos = backlog.filter(b => b.estado_preventivo === 'Vencido')
        if (vencidos.length > 0) rec.push({ prioridad: 'inmediata', titulo: 'Ejecutar preventivos vencidos', detalle: `${vencidos.length} activo(s) con preventivo vencido.`, activos: vencidos.map(v => placa(v.asset_codigo)), source: 'fleet' })
        const altaMTTR = kpiA.filter(a => a.mttr != null && a.mttr > 8)
        if (altaMTTR.length > 0) rec.push({ prioridad: 'alta', titulo: 'Reducir tiempo de reparación', detalle: `${altaMTTR.length} activo(s) con MTTR > 8h.`, activos: altaMTTR.map(a => placa(a.asset_codigo)), source: 'fleet' })
        const bajaDisp = kpiA.filter(a => a.disponibilidad != null && a.disponibilidad < 80)
        if (bajaDisp.length > 0) rec.push({ prioridad: 'alta', titulo: 'Mejorar disponibilidad', detalle: `${bajaDisp.length} activo(s) < 80% disp.`, activos: bajaDisp.map(a => placa(a.asset_codigo)), source: 'fleet' })
        if (kpiG?.fallas_correctivas > kpiG?.preventivos_ejecutados && kpiG?.preventivos_ejecutados > 0)
            rec.push({ prioridad: 'media', titulo: 'Aumentar cobertura preventiva', detalle: `Correctivas (${kpiG.fallas_correctivas}) > preventivas (${kpiG.preventivos_ejecutados}).`, activos: [], source: 'fleet' })
    }

    const alertColor: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
        critica: { bg: 'bg-rose-500/5', border: 'border-rose-500/30', icon: 'text-rose-500', dot: 'bg-rose-500 shadow-rose-500/50' },
        advertencia: { bg: 'bg-amber-500/5', border: 'border-amber-500/30', icon: 'text-amber-500', dot: 'bg-amber-500 shadow-amber-500/50' },
        info: { bg: 'bg-[#136dec]/5', border: 'border-[#136dec]/30', icon: 'text-[#136dec]', dot: 'bg-[#136dec] shadow-[#136dec]/50' },
        ok: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', icon: 'text-emerald-500', dot: 'bg-emerald-500 shadow-emerald-500/50' },
    }
    const prioColor: Record<string, string> = { inmediata: 'text-rose-500', alta: 'text-orange-500', media: 'text-amber-500', baja: 'text-slate-400' }
    const prioBg: Record<string, string> = { inmediata: 'bg-rose-500/10', alta: 'bg-orange-500/10', media: 'bg-amber-500/10', baja: 'bg-slate-700/30' }

    if (loading) return <div className="text-slate-500 text-sm p-8">Analizando datos...</div>

    const showFleet = assetType === 'fleet'
    const showStations = assetType === 'stations'

    return (
        <div className="animate-fade-in-up space-y-8">
            {/* Header con filtros */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6 p-6 md:p-8">
                    <div className="w-14 h-14 bg-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40">
                        <span className="material-symbols-outlined text-white text-3xl">neurology</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Motor de Inteligencia</h2>
                        <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mt-1">Análisis Predictivo</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 px-4 pb-4 md:px-6 md:pb-6">
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-1 pl-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Sem:</span>
                            <input type="week" value={week} onChange={e => setWeek(e.target.value)} className="text-xs font-black text-slate-100 bg-slate-950/30 border-slate-700 rounded-lg py-1.5 px-2 focus:ring-sky-500" />
                        </div>
                        <div className="h-6 w-px bg-slate-700 mx-1 self-center"></div>
                        <div className="flex items-center gap-1 pr-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase pl-1">Sector:</span>
                            <select value={sector} onChange={e => setSector(e.target.value)} className="text-xs font-black text-slate-100 bg-slate-950/30 border-slate-700 rounded-lg py-1.5 px-2 focus:ring-sky-500">
                                {sectores.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumen */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 relative overflow-hidden">
                <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-6">Resumen Ejecutivo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {showFleet && (
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Flota Vehicular</p>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${alertas.filter(a => a.source === 'fleet').some(a => a.tipo === 'critica') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <span className={`text-lg font-black ${alertas.filter(a => a.source === 'fleet').some(a => a.tipo === 'critica') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {alertas.filter(a => a.source === 'fleet').some(a => a.tipo === 'critica') ? 'Alerta' : 'OK'}
                                </span>
                            </div>
                        </div>
                    )}
                    {showStations && (
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Estaciones</p>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${alertas.filter(a => a.source === 'station').some(a => a.tipo === 'critica') ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <span className={`text-lg font-black ${alertas.filter(a => a.source === 'station').some(a => a.tipo === 'critica') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {alertas.filter(a => a.source === 'station').some(a => a.tipo === 'critica') ? 'Alerta' : 'OK'}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Total Alertas</p>
                        <div className="flex gap-4">
                            <div><span className="text-2xl font-black text-rose-500 font-mono">{alertas.filter(a => a.tipo === 'critica').length}</span><span className="text-[9px] font-bold text-slate-500 uppercase block">Críticas</span></div>
                            <div><span className="text-2xl font-black text-amber-400 font-mono">{alertas.filter(a => a.tipo === 'advertencia').length}</span><span className="text-[9px] font-bold text-slate-500 uppercase block">Avisos</span></div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Recomendaciones</p>
                        <span className="text-2xl font-black text-slate-100 font-mono">{recomendaciones.length}</span>
                    </div>
                </div>
            </div>

            {/* Alertas + Recomendaciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>Alertas ({alertas.length})
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                        {alertas.map((a, i) => {
                            const c = alertColor[a.tipo]
                            return (
                                <div key={i} className={`${c.bg} border ${c.border} rounded-2xl p-4 flex items-start gap-3 transition-all hover:bg-slate-800`}>
                                    <div className={`mt-1.5 w-3 h-3 rounded-full ${c.dot} flex-shrink-0`}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {a.source && <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${a.source === 'station' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>{a.source === 'station' ? 'EST' : 'FLOTA'}</span>}
                                            <span className={`material-symbols-outlined text-[18px] ${c.icon}`}>{a.icono}</span>
                                            <span className="text-xs font-black text-slate-100 uppercase">{a.titulo}</span>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-400">{a.detalle}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-sky-600 rounded-full"></span>Recomendaciones ({recomendaciones.length})
                    </h3>
                    <div className="space-y-3">
                        {recomendaciones.map((r, i) => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    {r.source && <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${r.source === 'station' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>{r.source === 'station' ? 'EST' : 'FLOTA'}</span>}
                                    <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-xl ${prioBg[r.prioridad]} ${prioColor[r.prioridad]}`}>{r.prioridad}</span>
                                    <span className="text-sm font-black text-slate-100 uppercase">{r.titulo}</span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400">{r.detalle}</p>
                                {(r.activos.length > 0 || r.estaciones?.length) && (
                                    <div className="flex gap-1.5 mt-3 flex-wrap">
                                        {r.activos.map(a => <span key={a} className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-400 rounded-xl font-mono">{a}</span>)}
                                        {r.estaciones?.map(e => <span key={e} className="px-2.5 py-1 bg-purple-900/30 border border-purple-500/20 text-[10px] font-black text-purple-400 rounded-xl font-mono">{e}</span>)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rankings */}
            {(rankings.peores.length > 0 || rankings.stationWorst.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {showFleet && rankings.peores.length > 0 && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
                            <div className="p-5 border-b border-slate-700 flex items-center gap-3 bg-slate-950/20">
                                <div className="w-9 h-9 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20"><span className="material-symbols-outlined text-[20px]">trending_down</span></div>
                                <h3 className="text-xs font-black text-slate-100 uppercase">Flota — Mayor Riesgo</h3>
                            </div>
                            <div className="divide-y divide-slate-700">
                                {rankings.peores.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-600 w-4 font-mono">{i + 1}</span>
                                            <span className="text-xs font-black text-slate-100 uppercase">{(() => { const x = assets.find(ax => ax.codigo_patrimonial === a.asset_codigo); return x?.placa_principal || a.asset_codigo })()}</span>
                                        </div>
                                        <span className={`text-xs font-black font-mono ${a.disponibilidad < 70 ? 'text-rose-500' : 'text-amber-400'}`}>{a.disponibilidad.toFixed(2)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {showStations && rankings.stationWorst.length > 0 && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
                            <div className="p-5 border-b border-slate-700 flex items-center gap-3 bg-slate-950/20">
                                <div className="w-9 h-9 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20"><span className="material-symbols-outlined text-[20px]">trending_down</span></div>
                                <h3 className="text-xs font-black text-slate-100 uppercase">Estaciones — Mayor Riesgo</h3>
                            </div>
                            <div className="divide-y divide-slate-700">
                                {rankings.stationWorst.map((e: any, i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800">
                                        <span className="text-xs font-black text-slate-100 uppercase">{e.nombre}</span>
                                        <span className="text-xs font-black text-rose-400 font-mono">S/ {(Number(e.costo_correctivo) || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showStations && rankings.stationBest.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden">
                    <div className="p-5 border-b border-slate-700 flex items-center gap-3 bg-slate-950/20">
                        <div className="w-9 h-9 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20"><span className="material-symbols-outlined text-[20px]">trending_up</span></div>
                        <h3 className="text-xs font-black text-slate-100 uppercase">Estaciones — Mejor Desempeño</h3>
                    </div>
                    <div className="divide-y divide-slate-700">
                        {rankings.stationBest.map((e: any, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800">
                                <span className="text-xs font-black text-slate-100 uppercase">{e.nombre}</span>
                                <span className="text-xs font-black text-emerald-400 font-mono">{e.preventivos} prev.</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
