import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function PlanMantenimiento2026() {
    const [activities, setActivities] = useState<any[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedTrimester, setSelectedTrimester] = useState<number | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [actRes, sumRes] = await Promise.all([
                api.getPlan2026Activities(),
                api.getPlan2026Summary()
            ])
            setActivities(actRes)
            setSummary(sumRes)
        } catch (e: any) {
            console.error(e)
        }
        setLoading(false)
    }

    const totalPresupuesto = activities.reduce((s, a) => s + (Number(a.presupuesto_anual) || 0), 0)
    const totalEjecutado = Number(summary?.ejecutado_total) || 0
    const porcentajeEjecucion = totalPresupuesto > 0 ? ((totalEjecutado / totalPresupuesto) * 100) : 0

    const trimestres = [
        { key: 't1', label: 'Trimestre 1', field: 'presupuesto_t1', months: 'Ene - Mar' },
        { key: 't2', label: 'Trimestre 2', field: 'presupuesto_t2', months: 'Abr - Jun' },
        { key: 't3', label: 'Trimestre 3', field: 'presupuesto_t3', months: 'Jul - Sep' },
        { key: 't4', label: 'Trimestre 4', field: 'presupuesto_t4', months: 'Oct - Dic' },
    ]

    const filteredActivities = selectedTrimester !== null
        ? activities.filter(a => (Number(a[trimestres[selectedTrimester].field]) || 0) > 0)
        : activities

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tight">Plan de Mantenimiento 2026</h1>
                <p className="text-xs text-slate-400 mt-0.5">EPS SEMAPACH — Seguimiento presupuestal y metas físicas</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-sky-600/20 to-sky-800/10 rounded-xl border border-sky-500/20 p-4">
                    <div className="text-[10px] text-sky-300 font-black uppercase tracking-wider">Presupuesto Total</div>
                    <div className="text-xl font-black text-white mt-1">S/ {totalPresupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 rounded-xl border border-emerald-500/20 p-4">
                    <div className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">Ejecutado</div>
                    <div className="text-xl font-black text-emerald-400 mt-1">S/ {totalEjecutado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/10 rounded-xl border border-amber-500/20 p-4">
                    <div className="text-[10px] text-amber-300 font-black uppercase tracking-wider">% Ejecución</div>
                    <div className="text-xl font-black text-amber-400 mt-1">{porcentajeEjecucion.toFixed(1)}%</div>
                </div>
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 rounded-xl border border-purple-500/20 p-4">
                    <div className="text-[10px] text-purple-300 font-black uppercase tracking-wider">Actividades</div>
                    <div className="text-xl font-black text-purple-400 mt-1">{activities.filter(a => (Number(a.presupuesto_anual) || 0) > 0).length}</div>
                </div>
            </div>

            {/* Barra de ejecución general */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase">Ejecución Presupuestal General</span>
                    <span className="text-xs font-bold text-white">{porcentajeEjecucion.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-sky-500 to-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(porcentajeEjecucion, 100)}%` }} />
                </div>
            </div>

            {/* Selector de trimestre */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSelectedTrimester(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-colors ${selectedTrimester === null ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                    Todas
                </button>
                {trimestres.map((t, i) => {
                    const totalT = activities.reduce((s, a) => s + (Number(a[t.field]) || 0), 0)
                    return (
                        <button key={t.key} onClick={() => setSelectedTrimester(selectedTrimester === i ? null : i)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-colors flex items-center gap-1.5 ${selectedTrimester === i ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                            {t.label} <span className="opacity-60">·</span> S/ {totalT.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </button>
                    )
                })}
            </div>

            {/* Tabla de actividades */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-800/80">
                                <th className="text-left px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase sticky left-0 bg-slate-800/95 z-10">Código</th>
                                <th className="text-left px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase">Actividad</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase">Anual</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-black text-sky-400 uppercase hidden sm:table-cell">T1</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-black text-sky-400 uppercase hidden sm:table-cell">T2</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-black text-sky-400 uppercase hidden md:table-cell">T3</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-black text-sky-400 uppercase hidden md:table-cell">T4</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-black text-emerald-400 uppercase hidden lg:table-cell">Ejecutado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredActivities.map(a => {
                                const hasBudget = (Number(a.presupuesto_anual) || 0) > 0
                                return (
                                    <tr key={a.codigo} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${!hasBudget ? 'opacity-40' : ''}`}>
                                        <td className="px-3 py-2 font-mono font-bold text-sky-400 sticky left-0 bg-slate-800/50 z-10">{a.codigo}</td>
                                        <td className="px-3 py-2 text-white max-w-[200px] truncate">{a.nombre}</td>
                                        <td className="px-3 py-2 text-right font-bold text-white">{Number(a.presupuesto_anual).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-right text-slate-300 hidden sm:table-cell">{Number(a.presupuesto_t1).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-right text-slate-300 hidden sm:table-cell">{Number(a.presupuesto_t2).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-right text-slate-300 hidden md:table-cell">{Number(a.presupuesto_t3).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-right text-slate-300 hidden md:table-cell">{Number(a.presupuesto_t4).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-right text-emerald-400 font-bold hidden lg:table-cell">—</td>
                                    </tr>
                                )
                            })}
                            {/* Totales */}
                            <tr className="border-t-2 border-slate-600 bg-slate-700/40 font-black">
                                <td className="px-3 py-3 text-sky-400 sticky left-0 bg-slate-700/60 z-10">TOTAL</td>
                                <td className="px-3 py-3 text-white">{filteredActivities.length} actividades</td>
                                <td className="px-3 py-3 text-right text-white">{filteredActivities.reduce((s, a) => s + (Number(a.presupuesto_anual) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-3 text-right text-sky-300 hidden sm:table-cell">{filteredActivities.reduce((s, a) => s + (Number(a.presupuesto_t1) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-3 text-right text-sky-300 hidden sm:table-cell">{filteredActivities.reduce((s, a) => s + (Number(a.presupuesto_t2) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-3 text-right text-sky-300 hidden md:table-cell">{filteredActivities.reduce((s, a) => s + (Number(a.presupuesto_t3) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-3 text-right text-sky-300 hidden md:table-cell">{filteredActivities.reduce((s, a) => s + (Number(a.presupuesto_t4) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-3 text-right text-emerald-400 hidden lg:table-cell">{totalEjecutado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resumen por estación */}
            {summary?.por_estacion && summary.por_estacion.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                        <h2 className="text-sm font-black text-white uppercase">Ejecución por Estación</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Estación</th>
                                    <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Tipo</th>
                                    <th className="text-right px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Mantenimientos</th>
                                    <th className="text-right px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.por_estacion.map((e: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-3 py-2 text-white font-medium">{e.estacion}</td>
                                        <td className="px-3 py-2 text-slate-400">{e.tipo}</td>
                                        <td className="px-3 py-2 text-right text-sky-400 font-bold">{e.total_mantenimientos}</td>
                                        <td className="px-3 py-2 text-right text-emerald-400 font-bold">S/ {Number(e.costo_total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
