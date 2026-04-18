import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

function KPICard({ label, value, unit, icon, color }: {
    label: string; value: string | number | null; unit?: string; icon: string; color?: string
}) {
    const colorMap: Record<string, string> = {
        emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/20 text-emerald-400',
        amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/20 text-amber-400',
        rose: 'from-rose-500/20 to-rose-600/20 border-rose-500/20 text-rose-400',
        sky: 'from-sky-500/20 to-sky-600/20 border-sky-500/20 text-sky-400',
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/20 text-purple-400',
    }
    const colorClass = colorMap[color || 'sky'] || colorMap.sky

    return (
        <div className={`bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group ${colorClass.split(' ').slice(2).join(' ')}`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <span className={`text-[10px] font-black ${colorClass.split(' ').pop()} uppercase tracking-wider block mb-1`}>{label}</span>
                    <div className="text-4xl font-black text-white">{value ?? '—'}{unit && <span className="text-lg text-slate-400 ml-1">{unit}</span>}</div>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${colorClass.split(' ').slice(0, 3).join(' ')} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <span className={`material-symbols-outlined ${colorClass.split(' ').pop()} text-3xl`}>{icon}</span>
                </div>
            </div>
        </div>
    )
}

export default function DashboardGerencial() {
    const { assetType } = useAssetType()
    const [kpi, setKpi] = useState<any>(null)
    const [assetKpis, setAssetKpis] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [stations, setStations] = useState<any[]>([])
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

    const showFleet = assetType === 'fleet'
    const showStations = assetType === 'stations'

    useEffect(() => {
        setLoading(true)
        const promises: Promise<any>[] = []
        if (showFleet) {
            promises.push(api.getKPIGlobal(desde, hasta, sector, 'fleet'))
            promises.push(api.getKPIPorActivo(desde, hasta, sector, 'fleet'))
            promises.push(api.getAssets({ categoria: 'fleet' }))
        }
        if (showStations) {
            promises.push(api.getKPIGlobal(desde, hasta, undefined, 'stations'))
            promises.push(api.getKPIPorActivo(desde, hasta, undefined, 'stations'))
            promises.push(api.getAssets({ categoria: 'stations' }))
            promises.push(api.getStations())
        }
        Promise.all(promises).then(results => {
            if (showFleet && showStations) {
                const [k, a, allAssets, s] = results
                setKpi(k); setAssetKpis(a); setAssets(allAssets); setStations(s)
            } else if (showFleet) {
                const [k, a, allAssets] = results
                setKpi(k); setAssetKpis(a); setAssets(allAssets)
            } else {
                const [s] = results
                setStations(s)
            }
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [desde, hasta, sector, assetType, showFleet, showStations])

    const sectores = ['General', ...Array.from(new Set(assets.map(a => a.tipo_unidad))).filter(Boolean)]

    if (loading) return <div className="text-slate-500 text-sm font-black p-20 text-center uppercase tracking-widest animate-pulse">Procesando...</div>

    const dispColor = (v: number | null) => {
        if (v == null) return 'text-slate-400'; if (v >= 90) return 'text-emerald-400'; if (v >= 75) return 'text-amber-400'; return 'text-rose-400'
    }
    const barColor = (v: number | null) => {
        if (v == null) return 'bg-slate-700'; if (v >= 90) return 'bg-emerald-500'; if (v >= 75) return 'bg-amber-500'; return 'bg-rose-500'
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header Premium */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-900/40">
                            <span className="material-symbols-outlined text-white text-3xl">dashboard_customize</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Dashboard Gerencial</h2>
                            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mt-1">
                                {assetType === 'fleet' ? 'Inteligencia de Flota' : assetType === 'stations' ? 'Estado de Estaciones' : 'Visión Integral'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 pl-3">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Período:</span>
                            <input type="week" value={week} onChange={e => setWeek(e.target.value)}
                                className="text-xs font-black text-slate-100 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        {showFleet && sectores.length > 1 && (
                            <>
                                <div className="h-6 w-px bg-slate-700"></div>
                                <div className="flex items-center gap-2.5 pr-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Sector:</span>
                                    <select value={sector} onChange={e => setSector(e.target.value)}
                                        className="text-xs font-black text-slate-100 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
                                        {sectores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* KPIs Premium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {kpi && (
                    <>
                        <KPICard label="Disponibilidad" value={`${kpi.disponibilidad_global?.toFixed(2) ?? '—'}%`} icon="check_circle" color="emerald" />
                        <KPICard label="MTTR" value={`${kpi.mttr_global?.toFixed(2) ?? '—'}h`} icon="timer" color="amber" />
                        <KPICard label="Fallas Correctivas" value={kpi.fallas_correctivas ?? '—'} icon="warning" color="rose" />
                        <KPICard label="Costo Total" value={`S/ ${kpi.costo_total?.toFixed(2) ?? '—'}`} icon="payments" color="sky" />
                    </>
                )}
                {showStations && (
                    <KPICard label="Estaciones Activas" value={stations.filter(s => s.estado === 'Operativa').length} unit={`/ ${stations.length}`} icon="location_on" color="purple" />
                )}
            </div>

            {/* Ranking de activos por disponibilidad */}
            {showFleet && assetKpis.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest">Ranking por Disponibilidad — Flota</h3>
                    </div>
                    <div className="divide-y divide-slate-700/30 max-h-80 overflow-y-auto no-scrollbar">
                        {[...assetKpis].sort((a, b) => (a.disponibilidad ?? 100) - (b.disponibilidad ?? 100)).slice(0, 15).map((a, i) => (
                            <div key={a.asset_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-600 w-4 font-mono">{i + 1}</span>
                                    <div>
                                        <span className="text-xs font-black text-slate-100 uppercase">{(() => { const x = assets.find(ax => ax.codigo_patrimonial === a.asset_codigo); return x?.placa_principal || a.asset_codigo })()}</span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase ml-2">{a.asset_tipo}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-slate-700 h-2 rounded-full overflow-hidden hidden sm:block">
                                        <div className={`${barColor(a.disponibilidad)} h-full rounded-full transition-all duration-500`} style={{ width: `${a.disponibilidad ?? 0}%` }}></div>
                                    </div>
                                    <span className={`text-xs font-black font-mono w-12 text-right ${dispColor(a.disponibilidad)}`}>{a.disponibilidad?.toFixed(2) ?? '—'}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Estaciones */}
            {showStations && stations.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-400 text-sm">location_on</span>
                            Estaciones Hídricas
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                        {stations.map(s => (
                            <div key={s.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-3 py-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.estado === 'Operativa' ? 'bg-emerald-500' : s.estado === 'En Mantenimiento' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                <div className="min-w-0">
                                    <span className="text-xs text-white font-medium truncate block">{s.nombre}</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{s.tipo} · {s.distrito}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
