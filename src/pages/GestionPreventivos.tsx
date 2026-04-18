import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { 
    PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';

export default function GestionPreventivos() {
    const { assetType } = useAssetType()
    const [events, setEvents] = useState<any[]>([])
    const [backlog, setBacklog] = useState<any[]>([])
    const [configs, setConfigs] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [tab, setTab] = useState<'backlog' | 'registros' | 'config'>('backlog')
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [form, setForm] = useState<any>({
        asset_id: '', tipo_preventivo: 'Cambio de aceite y filtros',
        fecha_mantenimiento: new Date().toISOString().split('T')[0],
        lectura_al_momento: 0, intervalo: 5000, unidad_control: 'km', costo: '', observaciones: ''
    })

    useEffect(() => {
        api.getAssets({ categoria: assetType }).then(setAssets)
        loadAll()
    }, [assetType])

    const loadAll = () => {
        setLoading(true)
        Promise.all([
            api.getPreventiveEvents({ categoria: assetType }), 
            api.getPreventiveBacklog({ categoria: assetType }), 
            api.getPreventiveConfig()
        ]).then(([ev, bl, cf]) => { setEvents(ev); setBacklog(bl); setConfigs(cf); setLoading(false) })
    }

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

    const openNewForm = () => {
        setEditingId(null)
        setForm({
            asset_id: '', tipo_preventivo: 'Cambio de aceite y filtros',
            fecha_mantenimiento: new Date().toISOString().split('T')[0],
            lectura_al_momento: 0, intervalo: 5000, unidad_control: 'km', costo: '', observaciones: ''
        })
        setShowForm(true)
    }

    const openEditEvent = (e: any) => {
        setEditingId(e.id)
        setForm({
            asset_id: String(e.asset_id),
            tipo_preventivo: e.tipo_preventivo || 'Cambio de aceite y filtros',
            fecha_mantenimiento: e.fecha_mantenimiento || new Date().toISOString().split('T')[0],
            lectura_al_momento: e.lectura_al_momento || 0,
            intervalo: e.intervalo || 0,
            unidad_control: e.unidad_control || 'km',
            costo: e.costo ?? '',
            observaciones: e.observaciones || ''
        })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.asset_id) return
        try {
            const payload = {
                ...form, asset_id: Number(form.asset_id),
                lectura_al_momento: Number(form.lectura_al_momento),
                intervalo: Number(form.intervalo),
                costo: form.costo !== '' ? Number(form.costo) : null,
            }
            if (editingId) {
                await api.updatePreventiveEvent(editingId, payload)
                setToast('Preventivo actualizado')
            } else {
                await api.createPreventiveEvent(payload)
                setToast('Preventivo registrado')
            }
            setTimeout(() => setToast(null), 2500)
            setShowForm(false); setEditingId(null); loadAll()
        } catch (e: any) { setToast(e.message) }
    }

    const handleDeleteEvent = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro de mantenimiento preventivo permanentemente?')) return
        try {
            await api.deletePreventiveEvent(id)
            setToast('Registro eliminado'); setTimeout(() => setToast(null), 2500)
            loadAll()
        } catch (e: any) { setToast(e.message) }
    }

    const handleDeleteConfig = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta configuración de preventivo permanentemente?')) return
        try {
            await api.deletePreventiveConfig(id)
            setToast('Configuración eliminada'); setTimeout(() => setToast(null), 2500)
            loadAll()
        } catch (e: any) { setToast(e.message) }
    }

    const estadoColors: Record<string, string> = {
        'Al día': 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
        'Próximo': 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
        'Crítico': 'text-orange-400 bg-orange-500/10 border border-orange-500/20',
        'Vencido': 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
        'Sin dato confiable': 'text-slate-400 bg-slate-500/10 border border-slate-500/20',
    }

    const progressBarColor = (estado: string) => {
        if (estado === 'Vencido') return 'bg-rose-500'
        if (estado === 'Crítico') return 'bg-orange-500'
        if (estado === 'Próximo') return 'bg-amber-500'
        return 'bg-emerald-500'
    }

    const backlogStats = [
        { name: 'Al día', value: backlog.filter(b => b.estado_preventivo === 'Al día').length, color: '#10B981' },
        { name: 'Próximo', value: backlog.filter(b => b.estado_preventivo === 'Próximo').length, color: '#F59E0B' },
        { name: 'Crítico', value: backlog.filter(b => b.estado_preventivo === 'Crítico').length, color: '#F97316' },
        { name: 'Vencido', value: backlog.filter(b => b.estado_preventivo === 'Vencido').length, color: '#EF4444' }
    ].filter(s => s.value > 0);

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 p-responsive rounded-3xl mb-10 shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40">
                        <span className="material-symbols-outlined text-white text-3xl">event_repeat</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Gestión de Preventivos</h2>
                        <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mt-1 italic">Gestión de Ciclos y Mantenimiento Programado</p>
                    </div>
                </div>
                
                <button onClick={openNewForm}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-900/40 hover:-translate-y-1">
                    <span className="material-symbols-outlined text-[20px]">add_task</span>
                    Registrar Ejecución
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-8 flex items-center">
                    <div className="bg-slate-900/50 p-2 rounded-3xl border border-slate-700/60 backdrop-blur-md flex gap-2">
                        {(['backlog', 'registros', 'config'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-8 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${tab === t ? 'bg-sky-600 text-white shadow-xl shadow-sky-900/40 -translate-y-[1px]' : 'text-slate-500 hover:text-sky-400 hover:bg-slate-800'}`}>
                                {t === 'backlog' ? 'Panel de Control' : t === 'registros' ? 'Historial de Mtto' : 'Estrategia Operativa'}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="lg:col-span-4 bg-slate-800/50 border border-slate-700 rounded-3xl shadow-premium-xl flex items-center gap-8 !p-8">
                    <div className="h-28 w-28 flex-shrink-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={backlogStats} 
                                    innerRadius={32} 
                                    outerRadius={45} 
                                    paddingAngle={8} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {backlogStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-slate-100 leading-none">{backlog.length}</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase">Activos</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 block">Salud de Preventivos</span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            {backlogStats.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: s.color }}></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-4xl p-premium space-y-10 animate-fade-in shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10">
                        <span className="material-symbols-outlined text-9xl text-slate-500/10 select-none opacity-50">event_repeat</span>
                    </div>

                <div className="relative">
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-4">
                        <span className="w-2.5 h-2.5 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></span>
                        {editingId ? 'Editar Mantenimiento Realizado' : 'Declaración de Mantenimiento Realizado'}
                    </h3>
                </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad</label>
                            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm focus:ring-sky-500 text-slate-200">
                                <option value="" className="bg-slate-950">Seleccionar Activo...</option>
                                {assets.map((a: any) => <option key={a.id} value={a.id} className="bg-slate-950">{a.placa_principal || 'S/P'} — {a.codigo_patrimonial}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                            <select value={form.tipo_preventivo} onChange={e => set('tipo_preventivo', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm focus:ring-sky-500 text-slate-200">
                                <option className="bg-slate-950">Cambio de aceite y filtros</option>
                                <option className="bg-slate-950">Revisión general</option>
                                <option className="bg-slate-950">Afinamiento</option>
                                <option className="bg-slate-950">Cambio de frenos</option>
                                <option className="bg-slate-950">Engrase general</option>
                                <option className="bg-slate-950">Otro</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Ejecución</label>
                            <input type="date" value={form.fecha_mantenimiento} onChange={e => set('fecha_mantenimiento', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm focus:ring-sky-500 text-slate-200" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Metraje al Cierre</label>
                            <input type="number" value={form.lectura_al_momento} onChange={e => set('lectura_al_momento', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm text-sky-400 font-mono focus:ring-sky-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Intervalo de Re-entrada</label>
                            <input type="number" value={form.intervalo} onChange={e => set('intervalo', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm focus:ring-sky-500 text-slate-200" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lógica de Control</label>
                            <select value={form.unidad_control} onChange={e => set('unidad_control', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm focus:ring-sky-500 text-slate-200">
                                <option value="km" className="bg-slate-950">Kilometraje (Km)</option>
                                <option value="horometro" className="bg-slate-950">Horómetro (Hrs)</option>
                                <option value="fecha" className="bg-slate-950">Temporal (Días)</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Inversión (S/)</label>
                            <input type="number" value={form.costo} onChange={e => set('costo', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm text-sky-400 font-mono focus:ring-sky-500" step="0.01" placeholder="0.00" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones Técnicas</label>
                            <input type="text" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-900 border-none rounded-2xl py-3.5 px-5 shadow-sm focus:ring-sky-500 text-slate-200" placeholder="Detalles del servicio..." />
                        </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-4 border-t border-slate-700">
                        <button onClick={() => setShowForm(false)} 
                            className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 px-8 py-4 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={handleSave} 
                            className="bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black uppercase tracking-widest px-12 py-4 rounded-2xl transition-all shadow-xl shadow-sky-900/40 hover:shadow-sky-300 flex items-center gap-3 active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">save_as</span> Confirmar Registro
                        </button>
                    </div>
                </div>
            )}

            <div className="table-premium-container !p-0">
                <div className="overflow-x-auto no-scrollbar">
                    {tab === 'backlog' ? (
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Activo Crítico</th>
                                    <th>Tipo de Unidad</th>
                                    <th className="text-center">Estado de Alerta</th>
                                    <th>Uso del Ciclo</th>
                                    <th>Lectura Actual</th>
                                    <th>Siguiente Hito</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="p-24 text-center text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Analizando ciclos de desgaste...</td></tr>
                                ) : backlog.length === 0 ? (
                                    <tr><td colSpan={6} className="p-24 text-center text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Sin datos de backlog preventivo</td></tr>
                                ) : backlog.map((b: any) => (
                                    <tr key={b.asset_id} className="group">
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-sm transition-all">
                                                    <span className="material-symbols-outlined text-[20px]">settings_backup_restore</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-100 uppercase tracking-tight">
                                                        {(() => { const a = assets.find((x: any) => x.id === b.asset_id); return a?.placa_principal || b.asset_codigo })()}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{b.asset_codigo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-xs font-black text-slate-400 uppercase italic">{b.asset_tipo}</td>
                                        <td className="text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${estadoColors[b.estado_preventivo] || 'text-slate-400 bg-slate-800/50'}`}>
                                                {b.estado_preventivo}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-2 min-w-[120px]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase">{b.progreso}% consumido</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                    <div className={`h-full ${progressBarColor(b.estado_preventivo)} rounded-full shadow-sm transition-all duration-1000`} style={{ width: `${Math.min(b.progreso, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-xs font-black text-slate-100 font-mono">{b.lectura_actual} {b.unidad_control === 'horometro' ? 'h' : 'km'}</td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-sky-400 font-mono">{b.siguiente_objetivo != null ? `${b.siguiente_objetivo} ${b.unidad_control === 'horometro' ? 'h' : 'km'}` : '---'}</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Límite de servicio</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : tab === 'registros' ? (
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Fecha Servicio</th>
                                    <th>Unidad</th>
                                    <th>Tipo de Preventivo</th>
                                    <th>Lectura Cierre</th>
                                    <th>Próximo Hito</th>
                                    <th>Inversión</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((e: any) => (
                                    <tr key={e.id} className="group">
                                        <td className="text-xs font-black text-slate-100 font-mono">{e.fecha_mantenimiento}</td>
                                        <td>
                                            <p className="text-sm font-black text-slate-100 uppercase">{(() => { const a = assets.find((x: any) => x.id === e.asset_id); return a?.placa_principal || e.asset_codigo })()}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{e.asset_codigo}</p>
                                        </td>
                                        <td className="text-xs font-black text-slate-400 uppercase">{e.tipo_preventivo}</td>
                                        <td className="p-6 text-xs font-black text-slate-100 font-mono">{e.lectura_al_momento}</td>
                                        <td className="p-6 text-xs font-black text-sky-400 font-mono">{e.siguiente_objetivo} {e.unidad_control}</td>
                                        <td className="p-6 text-xs font-black text-slate-100 font-mono">{e.costo != null ? `S/ ${Number(e.costo).toFixed(2)}` : 'S/ 0.00'}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEditEvent(e)} 
                                                    className="w-10 h-10 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-slate-500 hover:text-sky-400 hover:bg-slate-800 hover:border-slate-700 hover:shadow-xl transition-all">
                                                    <span className="material-symbols-outlined text-[18px]">manage_search</span>
                                                </button>
                                                <button onClick={() => handleDeleteEvent(e.id)} 
                                                    className="w-10 h-10 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:shadow-md transition-all duration-300">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Segmento de Flota</th>
                                    <th>Servicio Estandarizado</th>
                                    <th className="text-center">Intervalo Maestro</th>
                                    <th className="text-center">Alerta Early</th>
                                    <th className="text-center">Alerta Critical</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((c: any) => (
                                    <tr key={c.id} className="group">
                                        <td className="p-6 text-sm font-black text-slate-100 uppercase">{c.tipo_unidad || 'Global'}</td>
                                        <td className="p-6 text-xs font-black text-slate-500 uppercase">{c.tipo_preventivo}</td>
                                        <td className="p-6 text-center">
                                            <span className="px-4 py-1.5 bg-sky-500/10 text-sky-400 rounded-xl text-[10px] font-black font-mono border border-sky-500/20">
                                                {c.intervalo} {c.unidad_control}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center text-xs font-black text-amber-400">{c.criterio_alerta_temprana}%</td>
                                        <td className="p-6 text-center text-xs font-black text-orange-400">{c.criterio_alerta_critica}%</td>
                                        <td>
                                            <button onClick={() => handleDeleteConfig(c.id)} 
                                                className="w-10 h-10 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:shadow-md transition-all duration-300">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
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
