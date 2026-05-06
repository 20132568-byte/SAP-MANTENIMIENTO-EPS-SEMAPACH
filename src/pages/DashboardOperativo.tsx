import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function DashboardOperativo() {
    const { assetType } = useAssetType()
    const [kpi, setKpi] = useState<any>(null)
    const [assetKpis, setAssetKpis] = useState<any[]>([])
    const [backlog, setBacklog] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [stations, setStations] = useState<any[]>([])
    const [activeStations, setActiveStations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [week, setWeek] = useState(() => {
        const d = new Date(); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
    })
    const [fleetSector, setFleetSector] = useState('General')
    const [toast, setToast] = useState<string | null>(null)
    const [selectedStation, setSelectedStation] = useState<any>(null)
    const [stationEquipment, setStationEquipment] = useState<any[]>([])
    const [loadingDetail, setLoadingDetail] = useState(false)

    const { desde, hasta } = (() => {
        const [y, w] = week.split('-W')
        if (!y || !w) return { desde: '', hasta: '' }
        const year = parseInt(y, 10); const d = new Date(year, 0, 4)
        const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1 + (parseInt(w, 10) - 1) * 7)
        const st = new Date(d); const en = new Date(d); en.setDate(en.getDate() + 6)
        return { desde: st.toISOString().split('T')[0], hasta: en.toISOString().split('T')[0] }
    })()

    // Filtrado estricto: solo muestra datos del modo seleccionado
    const isFleetMode = assetType === 'fleet'
    const isStationMode = assetType === 'stations'

    useEffect(() => {
        if (selectedStation) {
            setLoadingDetail(true)
            api.getStationEquipment(selectedStation.id)
                .then(setStationEquipment)
                .catch(err => setToast('Error al cargar equipos: ' + err.message))
                .finally(() => setLoadingDetail(false))
        } else {
            setStationEquipment([])
        }
    }, [selectedStation])

    useEffect(() => {
        setLoading(true)
        // Limpiar datos previos
        setKpi(null); setAssetKpis([]); setBacklog([]); setAssets([]); setStations([]); setActiveStations([])

        const loadData = async () => {
            try {
                const promises: Promise<any>[] = []

                if (isFleetMode) {
                    // MODO FLOTA: Solo datos de flota vehicular
                    promises.push(api.getKPIGlobal(desde, hasta, fleetSector))
                    promises.push(api.getKPIPorActivo(desde, hasta, fleetSector))
                    promises.push(api.getPreventiveBacklog({ categoria: 'fleet' }))
                    promises.push(api.getAssets({ categoria: 'fleet' }))
                } else if (isStationMode) {
                    // MODO ESTACIONES: Solo datos de estaciones hídricas
                    promises.push(api.getKPIGlobal(desde, hasta))
                    promises.push(api.getKPIPorActivo(desde, hasta))
                    promises.push(api.getPreventiveBacklog({ categoria: 'stations' }))
                    promises.push(api.getAssets({ categoria: 'stations' }))
                    promises.push(api.getStations())
                }

                const results = await Promise.all(promises)
                let idx = 0

                if (isFleetMode || isStationMode) {
                    const kpiData = results[idx++]
                    const rawAssetKpis = results[idx++]
                    const rawBacklog = results[idx++]
                    const fetchedAssets = results[idx++]
                    const fetchedStations = isStationMode ? results[idx++] : []

                    // USAR fetchedAssets COMO FUENTE DE VERDAD PARA EL FILTRADO
                    const validAssetIds = new Set(fetchedAssets.map((a: any) => a.id))
                    const validAssetCodigos = new Set(fetchedAssets.map((a: any) => a.codigo_patrimonial))

                    setAssetKpis(Array.isArray(rawAssetKpis) ? rawAssetKpis.filter((k: any) => 
                        validAssetIds.has(k.asset_id) || validAssetCodigos.has(k.asset_codigo)
                    ) : [])
                    
                    setBacklog(Array.isArray(rawBacklog) ? rawBacklog.filter((b: any) => 
                        validAssetIds.has(b.asset_id) || validAssetCodigos.has(b.asset_codigo)
                    ) : [])
                    
                    setAssets(fetchedAssets)
                    
                    if (isStationMode) {
                        setStations(fetchedStations)
                        // Filtrar estaciones que tienen mantenimiento en esta semana
                        const stationsWithActivity: any[] = []
                        for (const s of fetchedStations) {
                            const maint = await api.getStationMaintenance(s.id, { desde, hasta })
                            if (maint.length > 0) {
                                stationsWithActivity.push({ ...s, maintenanceCount: maint.length })
                            }
                        }
                        setActiveStations(stationsWithActivity)
                    }

                    // Intentar ajustar el KPI global si detectamos mezcla de datos
                    setKpi(kpiData)
                }
                setLoading(false)
            } catch (e: any) {
                console.error("Dashboard error:", e)
                setToast(`Error cargando datos: ${e.message || String(e)}`)
                setLoading(false)
            }
        }

        loadData()
    }, [desde, hasta, fleetSector, assetType, isFleetMode, isStationMode])

    const fleetSectores = ['General', ...Array.from(new Set(assets.map(a => a.tipo_unidad))).filter(Boolean)]

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

    const STATUS_COLORS: Record<string, string> = {
        'Vencido': '#ef4444',
        'Crítico': '#f59e0b',
        'Próximo': '#0ea5e9',
        'Al Día': '#10b981',
        'Al día': '#10b981'
    }

    const backlogByStatus = backlog.reduce((acc: any, b) => {
        const status = b.estado_preventivo || 'Al Día'
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {})

    const backlogChartData = Object.entries(backlogByStatus).map(([name, value]) => ({ name, value }))

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header Premium */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-900/40">
                            <span className="material-symbols-outlined text-white text-3xl">monitoring</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Dashboard Operativo</h2>
                            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mt-1">
                                {assetType === 'fleet' ? 'Inteligencia de Flota Vehicular' : 'Control de Estaciones Hídricas'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 pl-3">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Período:</span>
                            <input type="week" value={week} onChange={e => setWeek(e.target.value)}
                                className="text-xs font-black text-slate-100 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        {isFleetMode && fleetSectores.length > 1 && (
                            <>
                                <div className="h-6 w-px bg-slate-700"></div>
                                <div className="flex items-center gap-2.5 pr-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">🚗 Sector:</span>
                                    <select value={fleetSector} onChange={e => setFleetSector(e.target.value)}
                                        className="text-xs font-black text-slate-100 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
                                        {fleetSectores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== SECCIÓN MÉTRICAS PRINCIPALES (FLOTA Y ESTACIONES) ========== */}
            {(isFleetMode || isStationMode) && kpi && (
                <>
                    {/* KPIs - Estilo Premium */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] block mb-3">Disponibilidad Global</span>
                                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.disponibilidad_global?.toFixed(1) ?? '—'}<span className="text-2xl text-slate-500 ml-2">%</span></div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-emerald-500/20">
                                    <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-900/50 h-3 rounded-full overflow-hidden shadow-inner border border-slate-800">
                                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.4)]" style={{ width: `${kpi.disponibilidad_global ?? 0}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-amber-500/10 hover:border-amber-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] block mb-3">MTTR Estimado</span>
                                    {kpi.fallas_correctivas === 0 ? (
                                        <div className="text-3xl lg:text-4xl font-black text-emerald-400 tracking-tighter mt-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-3xl">verified</span>
                                            SIN FALLAS
                                        </div>
                                    ) : (
                                        <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.mttr_global?.toFixed(1) ?? '—'}<span className="text-2xl text-slate-500 ml-2">h</span></div>
                                    )}
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-amber-500/20">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">timer</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 inline-block px-4 py-1.5 rounded-lg text-amber-300 font-black uppercase tracking-[0.2em]">Meta: &lt;5.0h</div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-blue-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] block mb-3">MTBF Confiabilidad</span>
                                    {kpi.fallas_correctivas === 0 ? (
                                        <div className="text-3xl lg:text-4xl font-black text-emerald-400 tracking-tighter mt-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-3xl">verified</span>
                                            SIN FALLAS
                                        </div>
                                    ) : (
                                        <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.mtbf_global?.toFixed(1) ?? '—'}<span className="text-2xl text-slate-500 ml-2">h</span></div>
                                    )}
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-blue-500/20">
                                    <span className="material-symbols-outlined text-blue-400 text-3xl">update</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-blue-500/10 border border-blue-500/20 inline-block px-4 py-1.5 rounded-lg text-blue-300 font-black uppercase tracking-[0.2em]">Meta: &gt;100h</div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-rose-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-rose-500/10 hover:border-rose-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] block mb-3">Fallas Críticas</span>
                                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.fallas_correctivas ?? '—'}</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-rose-500/20 to-rose-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-rose-500/20">
                                    <span className="material-symbols-outlined text-rose-400 text-3xl">warning</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-rose-500/10 border border-rose-500/20 inline-block px-4 py-1.5 rounded-lg text-rose-300 font-black uppercase tracking-[0.2em]">Total Eventos: {kpi.total_fallas ?? '—'}</div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-sky-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-sky-500/10 hover:border-sky-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] block mb-3">Preventivos Realizados</span>
                                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.preventivos_ejecutados ?? '—'}</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-sky-500/20 to-sky-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-sky-500/20">
                                    <span className="material-symbols-outlined text-sky-400 text-3xl">engineering</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-sky-500/10 border border-sky-500/20 inline-block px-4 py-1.5 rounded-lg text-sky-300 font-black uppercase tracking-[0.2em]">Ejecución: S/ {kpi.costo_preventivo?.toLocaleString() ?? '—'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Backlog */}
                        {backlog.length > 0 && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-lg">
                                <div className="px-8 py-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <span className="material-symbols-outlined text-sky-400 text-xl">{isFleetMode ? 'directions_car' : 'location_on'}</span>
                                        Estado de Backlog Preventivo
                                    </h3>
                                    <span className="text-xs font-black text-slate-100 bg-slate-700 px-4 py-1.5 rounded-xl shadow-lg border border-white/5">{backlog.length} activos</span>
                                </div>
                                <div className="p-10 flex flex-col items-center">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mb-12">
                                        {Object.entries(backlogByStatus).map(([status, count]) => (
                                            <div key={status} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 shadow-inner group hover:border-white/20 transition-all duration-500 text-center">
                                                <div className={`text-4xl lg:text-5xl font-black mb-2 tracking-tighter ${status === 'Vencido' ? 'text-rose-500' : status === 'Crítico' ? 'text-amber-500' : status === 'Próximo' ? 'text-sky-500' : 'text-emerald-500'}`}>{count as number}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-white transition-colors">{status}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-full h-[400px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie 
                                                    data={backlogChartData} 
                                                    dataKey="value" 
                                                    nameKey="name" 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    innerRadius={80} 
                                                    outerRadius={140}
                                                    paddingAngle={6}
                                                    stroke="none"
                                                >
                                                    {backlogChartData.map((entry, i) => (
                                                        <Cell key={i} fill={STATUS_COLORS[entry.name] || '#64748b'} className="focus:outline-none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 24, fontSize: 12, fontWeight: '900', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }} 
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-5xl font-black text-white leading-none tracking-tighter shadow-2xl">{backlog.length}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Total</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ranking */}
                        {assetKpis.length > 0 && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-lg">
                                <div className="px-8 py-6 border-b border-slate-700 bg-slate-900/40">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-400 text-xl">workspace_premium</span>
                                        {isFleetMode ? 'Ranking de Disponibilidad (Flota)' : 'Ranking de Estaciones Hídricas'}
                                    </h3>
                                </div>
                                <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-700/50 bg-slate-800/50">
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">#</th>
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Activo</th>
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase hidden sm:table-cell">Tipo</th>
                                                <th className="text-center px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Disponibilidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...assetKpis].sort((a, b) => (a.disponibilidad ?? 100) - (b.disponibilidad ?? 100)).map((a, i) => {
                                                const asset = isFleetMode 
                                                    ? assets.find(x => x.codigo_patrimonial === a.asset_codigo)
                                                    : stations.find(x => x.codigo === a.asset_codigo || x.nombre === a.asset_nombre)
                                                const dispColor = (a.disponibilidad ?? 0) >= 90 ? 'text-emerald-400' : (a.disponibilidad ?? 0) >= 75 ? 'text-amber-400' : 'text-rose-400'
                                                return (
                                                    <tr key={a.asset_id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors cursor-pointer"
                                                        onClick={() => !isFleetMode && setSelectedStation(stations.find(s => s.codigo === a.asset_codigo))}>
                                                        <td className="px-6 py-5 font-mono text-slate-500 font-bold">{i + 1}</td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-white font-bold text-sm tracking-tight">{a.asset_nombre || asset?.nombre || a.asset_codigo}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{a.asset_codigo}</div>
                                                        </td>
                                                        <td className="px-6 py-5 text-slate-300 font-medium hidden sm:table-cell">{a.asset_tipo}</td>
                                                        <td className="px-6 py-5 text-center">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className={`font-mono font-black text-sm ${dispColor}`}>{a.disponibilidad?.toFixed(1) ?? '—'}%</span>
                                                                <div className="w-20 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                                    <div className={`${dispColor.replace('text-', 'bg-')} h-full rounded-full`} style={{ width: `${a.disponibilidad ?? 0}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ========== SECCIÓN ESPECÍFICA DE ESTACIONES (GRID) ========== */}
            {isStationMode && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-[2rem] overflow-hidden shadow-premium-lg">
                    <div className="px-8 py-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="material-symbols-outlined text-purple-400">location_on</span>
                            Mapa de Estaciones Operativas
                        </h3>
                        <span className="text-xs font-black text-slate-100 bg-slate-700 px-4 py-1.5 rounded-xl border border-white/5">
                            {stations.length} estaciones
                        </span>
                    </div>
                    {stations.length > 0 ? (
                        <div className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {stations.map(s => {
                                    const skpi = assetKpis.find(a => a.asset_codigo === s.codigo)
                                    const disp = skpi?.disponibilidad ?? 100
                                    const statusColor = disp >= 95 ? 'bg-emerald-500' : disp >= 85 ? 'bg-amber-500' : 'bg-rose-500'
                                    
                                    return (
                                        <div key={s.id} 
                                            onClick={() => setSelectedStation(s)}
                                            className="group flex items-center gap-5 bg-slate-900/40 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-sky-500/50 transition-all cursor-pointer shadow-lg active:scale-95">
                                            <div className={`w-3 h-3 rounded-full ${statusColor} shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:scale-125 transition-transform`}></div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-sm text-white font-black uppercase tracking-tight truncate block group-hover:text-sky-400 transition-colors">{s.nombre}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.tipo}</span>
                                                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                    <span className={`text-[10px] font-black ${disp >= 85 ? 'text-emerald-400' : 'text-rose-400'}`}>{disp.toFixed(1)}% Disp.</span>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-700 group-hover:text-sky-500 transition-colors">arrow_forward_ios</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-800 block mb-4">location_off</span>
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No se hallaron estaciones registradas</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE DETALLE DE ESTACIÓN (DRILL-DOWN) */}
            {selectedStation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-reveal">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedStation(null)}></div>
                    <div className="relative w-full max-w-6xl max-h-full bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                        {/* Header Modal */}
                        <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-900/40">
                                    <span className="material-symbols-outlined text-white text-3xl">location_on</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedStation.nombre}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] font-black text-sky-400 uppercase tracking-[0.2em]">{selectedStation.tipo}</span>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{selectedStation.distrito || 'Sin Distrito'}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedStation(null); }} 
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all border border-slate-700/50"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Columna Izquierda: KPIs Específicos */}
                                <div className="space-y-6">
                                    <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-6">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Rendimiento Actual</h4>
                                        {(() => {
                                            const skpi = assetKpis.find(a => a.asset_codigo === selectedStation.codigo)
                                            return (
                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold text-white">Disponibilidad</span>
                                                            <span className="text-lg font-black text-emerald-400">{skpi?.disponibilidad?.toFixed(1) ?? '100'}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700">
                                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${skpi?.disponibilidad ?? 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                                                        <div>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase block">MTTR</span>
                                                            <span className="text-lg font-black text-white">{skpi?.mttr?.toFixed(1) ?? '—'}h</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-black text-slate-500 uppercase block">MTBF</span>
                                                            <span className="text-lg font-black text-white">{skpi?.mtbf?.toFixed(1) ?? '—'}h</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {/* Información General */}
                                    <div className="bg-slate-800/20 border border-slate-700 border-dashed rounded-3xl p-6">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Detalles del Activo</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Código:</span>
                                                <span className="text-[10px] font-black text-white">{selectedStation.codigo}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Capacidad:</span>
                                                <span className="text-[10px] font-black text-white">{selectedStation.capacidad || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Ubicación:</span>
                                                <span className="text-[10px] font-black text-white">{selectedStation.direccion || 'No registrada'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Central y Derecha: Equipamiento y Componentes */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-slate-800/40 border border-slate-700 rounded-3xl overflow-hidden">
                                        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/30 flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Componentes e Infraestructura</h4>
                                            <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-3 py-1 rounded-lg border border-sky-500/20">{stationEquipment.length} componentes</span>
                                        </div>
                                        <div className="p-6">
                                            {loadingDetail ? (
                                                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                                    <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mb-4"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando componentes...</span>
                                                </div>
                                            ) : stationEquipment.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {stationEquipment.map(eq => (
                                                        <div key={eq.id} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-500 transition-colors">
                                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                                                                <span className="material-symbols-outlined text-xl">settings</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[11px] font-black text-white uppercase block">{eq.codigo}</span>
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{eq.tipo_equipo}</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className={`w-2 h-2 rounded-full ${eq.estado === 'Operativo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">{eq.estado || 'Operativo'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 opacity-40">
                                                    <span className="material-symbols-outlined text-4xl block mb-3">inventory_2</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">No hay componentes individuales registrados</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recomendaciones / Alertas IA */}
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-5">
                                        <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-amber-500 text-2xl">psychology</span>
                                        </div>
                                        <div>
                                            <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-1">Análisis Predictivo Antigravity</h5>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Basado en el historial de fallas y la antigüedad de los componentes, se recomienda una revisión preventiva de los tableros eléctricos en los próximos 15 días para evitar paradas no programadas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
