import { useState, useEffect } from 'react'
import { api } from '../api/client'

const emptyForm = {
    fecha: new Date().toISOString().split('T')[0], asset_id: '', operador_id: '',
    hora_inicio: '', hora_fin: '', tipo_evento: 'Correctivo no programado',
    clasificacion_falla: '', sistema_afectado: '', severidad: '',
    descripcion: '', causa_probable: '', accion_correctiva: '',
    inmovilizo_unidad: false, es_correctiva_no_programada: true,
    costo_reparacion: '', observaciones: ''
}

export default function RegistroFallas() {
    const [failures, setFailures] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [operators, setOperators] = useState<any[]>([])
    const [catalogos, setCatalogos] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [filtroPlaca, setFiltroPlaca] = useState('')
    const [toast, setToast] = useState<string | null>(null)
    const [form, setForm] = useState<any>({ ...emptyForm })

    useEffect(() => {
        api.getAssets().then(setAssets)
        api.getOperators().then(setOperators)
        Promise.all([
            api.getCatalog('clasificacion_falla'), api.getCatalog('sistema_afectado'),
            api.getCatalog('severidad'), api.getCatalog('causa_probable'), api.getCatalog('tipo_evento'),
        ]).then(([clf, sis, sev, cau, tip]) => {
            setCatalogos({
                clasificaciones: clf.map((c: any) => c.valor), sistemas: sis.map((c: any) => c.valor),
                severidades: sev.map((c: any) => c.valor), causas: cau.map((c: any) => c.valor),
                tipos: tip.map((c: any) => c.valor),
            })
        })
    }, [])

    const loadFailures = () => { setLoading(true); api.getFailures().then(d => { setFailures(d); setLoading(false) }) }
    useEffect(() => { loadFailures() }, [])

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
    const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

    let duracionCalc: number | null = null
    if (form.hora_inicio && form.hora_fin) {
        const [h1, m1] = form.hora_inicio.split(':').map(Number)
        const [h2, m2] = form.hora_fin.split(':').map(Number)
        let d = (h2 * 60 + m2) - (h1 * 60 + m1)
        if (d < 0) d += 24 * 60
        duracionCalc = Math.round((d / 60) * 100) / 100
    }

    const openNew = () => {
        setEditingId(null)
        setForm({ ...emptyForm })
        setShowForm(true)
    }

    const openEdit = (f: any) => {
        setEditingId(f.id)
        setForm({
            fecha: f.fecha,
            asset_id: String(f.asset_id),
            operador_id: f.operador_id ? String(f.operador_id) : '',
            hora_inicio: f.hora_inicio || '',
            hora_fin: f.hora_fin || '',
            tipo_evento: f.tipo_evento || 'Correctivo no programado',
            clasificacion_falla: f.clasificacion_falla || '',
            sistema_afectado: f.sistema_afectado || '',
            severidad: f.severidad || '',
            descripcion: f.descripcion || '',
            causa_probable: f.causa_probable || '',
            accion_correctiva: f.accion_correctiva || '',
            inmovilizo_unidad: !!f.inmovilizo_unidad,
            es_correctiva_no_programada: !!f.es_correctiva_no_programada,
            costo_reparacion: f.costo_reparacion ?? '',
            observaciones: f.observaciones || '',
        })
        setShowForm(true)
    }

    const handleSave = async () => {
        if (!form.asset_id || !form.fecha) return
        const payload = {
            ...form, asset_id: Number(form.asset_id),
            operador_id: form.operador_id ? Number(form.operador_id) : null,
            duracion_horas: duracionCalc ?? 0,
            costo_reparacion: form.costo_reparacion !== '' ? Number(form.costo_reparacion) : null,
        }
        try {
            if (editingId) {
                await api.updateFailure(editingId, payload)
                notify('Falla actualizada')
            } else {
                await api.createFailure(payload)
                notify('Falla registrada')
            }
            setShowForm(false)
            setEditingId(null)
            setForm({ ...emptyForm })
            loadFailures()
        } catch (e: any) { notify(e.message) }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro permanentemente?')) return
        try {
            await api.deleteFailure(id)
            notify('Registro eliminado')
            loadFailures()
        } catch (e: any) { notify(e.message) }
    }

    const severidadColor: Record<string, string> = {
        'Crítica': 'text-rose-400 bg-rose-500/10 border border-rose-500/20', 
        'Mayor': 'text-amber-400 bg-amber-500/10 border border-amber-500/20', 
        'Menor': 'text-sky-400 bg-sky-500/10 border border-sky-500/20', 
        'Observación': 'text-slate-400 bg-slate-500/10 border border-slate-500/20'
    }

    const filtered = filtroPlaca
        ? failures.filter(f => {
            const asset = assets.find(a => a.id === f.asset_id)
            return (asset?.placa_principal || '').toLowerCase().includes(filtroPlaca.toLowerCase())
        })
        : failures

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 p-responsive rounded-3xl mb-10 shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-600 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-900/40">
                        <span className="material-symbols-outlined text-white text-3xl">report_problem</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Registro de Fallas</h2>
                        <p className="text-sm font-bold text-rose-400 uppercase tracking-widest mt-1 italic">Control de Eventos Correctivos y Análisis de MTTR</p>
                    </div>
                </div>
                
                <button onClick={openNew}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-900/40 hover:-translate-y-1">
                    <span className="material-symbols-outlined text-[20px]">add_alert</span>
                    Reportar Incidente
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-8 bg-slate-800/50 border border-slate-700 p-responsive rounded-3xl shadow-premium-xl !p-6 mb-12">
                <div className="flex items-center gap-4 flex-1 lg:flex-none bg-slate-900/50 px-6 py-3 rounded-2xl border border-slate-700 shadow-inner">
                    <span className="material-symbols-outlined text-slate-500 text-[20px]">manage_search</span>
                    <input type="text" value={filtroPlaca} onChange={e => setFiltroPlaca(e.target.value)}
                        placeholder="Filtrar por placa o patr..." 
                        className="text-xs font-black text-slate-200 bg-transparent border-none focus:ring-0 w-full lg:w-64 placeholder:text-slate-500" />
                </div>
                
                <div className="h-10 w-px bg-slate-700 hidden lg:block mx-2"></div>
                
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-100 leading-none">{failures.length}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mt-1">Eventos Reportados</span>
                        </div>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-4xl p-premium space-y-10 animate-fade-in shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10">
                        <span className="material-symbols-outlined text-9xl text-slate-500/10 select-none opacity-50">warning</span>
                    </div>

                    <div className="relative">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                            {editingId ? 'Actualizar Reporte de Falla' : 'Nuevo Registro de Incidencia Técnica'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha Evento</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-slate-200" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad Afectada</label>
                            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">Seleccionar Activo...</option>
                                {assets.map((a: any) => <option key={a.id} value={a.id} className="bg-slate-800">{a.placa_principal || 'S/P'} — {a.codigo_patrimonial}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsable del Turno</label>
                            <select value={form.operador_id} onChange={e => set('operador_id', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">Asignar Operador...</option>
                                {operators.map((o: any) => <option key={o.id} value={o.id} className="bg-slate-800">{o.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-responsive bg-rose-900/20 rounded-4xl grid grid-cols-1 md:grid-cols-3 gap-10 border border-rose-500/20">
                        <div className="space-y-4">
                            <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest ml-1">Cronometría de Reparación</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-rose-500 uppercase">Inicio</label>
                                    <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} 
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-xl py-3 px-4 shadow-sm text-slate-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-rose-500 uppercase">Fin</label>
                                    <input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} 
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-xl py-3 px-4 shadow-sm text-slate-200" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">MTTR Estimado</span>
                                <span className="text-3xl font-black text-slate-100 font-mono tracking-tighter">
                                    {duracionCalc != null ? `${duracionCalc.toFixed(2)}h` : '0.00h'}
                                </span>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-6">
                            <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest ml-1">Categorización del Incidente</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Clasificación</label>
                                    <select value={form.clasificacion_falla} onChange={e => set('clasificacion_falla', e.target.value)} 
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-slate-200">
                                        <option value="" className="bg-slate-800">Seleccionar...</option>
                                        {(catalogos.clasificaciones || []).map((c: string) => <option key={c} className="bg-slate-800">{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Sistema Crítico</label>
                                    <select value={form.sistema_afectado} onChange={e => set('sistema_afectado', e.target.value)} 
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-slate-200">
                                        <option value="" className="bg-slate-800">Seleccionar...</option>
                                        {(catalogos.sistemas || []).map((s: string) => <option key={s} className="bg-slate-800">{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Impacto (Severidad)</label>
                                    <select value={form.severidad} onChange={e => set('severidad', e.target.value)} 
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-slate-200">
                                        <option value="" className="bg-slate-800">Seleccionar...</option>
                                        {(catalogos.severidades || []).map((s: string) => <option key={s} className="bg-slate-800">{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Presupuesto Ejecutado (S/)</label>
                                    <input type="number" value={form.costo_reparacion} onChange={e => set('costo_reparacion', e.target.value)} 
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3.5 px-5 shadow-sm text-rose-400 font-mono" step="0.01" placeholder="0.00" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hallazgos y Síntomas</label>
                            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-3xl py-5 px-6 shadow-sm min-h-[120px] resize-none focus:ring-rose-500/20 text-slate-200" placeholder="Describa el fallo, ruidos extraños, fugas, etc..."></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Solución Técnica Aplicada</label>
                            <textarea value={form.accion_correctiva} onChange={e => set('accion_correctiva', e.target.value)} 
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-3xl py-5 px-6 shadow-sm min-h-[120px] resize-none focus:ring-rose-500/20 text-slate-200" placeholder="Detalle el procedimiento de reparación realizado..."></textarea>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-700">
                        <div className="flex gap-10">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${form.inmovilizo_unidad ? 'bg-rose-600 border-rose-600 shadow-lg shadow-rose-900/40' : 'bg-slate-800 border-slate-700 group-hover:border-rose-500 shadow-sm'}`}>
                                    {form.inmovilizo_unidad && <span className="material-symbols-outlined text-white text-[18px] font-black">check</span>}
                                    <input type="checkbox" className="hidden" checked={form.inmovilizo_unidad} onChange={e => set('inmovilizo_unidad', e.target.checked)} />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-rose-400 transition-colors">Inmovilizó Unidad</span>
                            </label>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${form.es_correctiva_no_programada ? 'bg-sky-600 border-sky-600 shadow-lg shadow-sky-900/40' : 'bg-slate-800 border-slate-700 group-hover:border-sky-500 shadow-sm'}`}>
                                    {form.es_correctiva_no_programada && <span className="material-symbols-outlined text-white text-[18px] font-black">check</span>}
                                    <input type="checkbox" className="hidden" checked={form.es_correctiva_no_programada} onChange={e => set('es_correctiva_no_programada', e.target.checked)} />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-sky-400 transition-colors">Correctiva No Prog.</span>
                            </label>
                        </div>
                        <div className="flex gap-6">
                            <button onClick={() => { setShowForm(false); setEditingId(null) }} 
                                className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 px-8 py-4 rounded-2xl transition-all">Descartar</button>
                            <button onClick={handleSave} 
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest px-12 py-4 rounded-2xl transition-all shadow-xl shadow-rose-900/40 hover:shadow-rose-300 flex items-center gap-3 active:scale-95">
                                <span className="material-symbols-outlined text-[20px] font-black">{editingId ? 'update' : 'publish'}</span>
                                {editingId ? 'Actualizar Reporte' : 'Registrar Falla'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TABLA — desktop */}
            <div className="hidden md:block table-premium-container !p-0">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Temporalidad</th>
                            <th>Activo Critico</th>
                            <th className="text-center">Severidad</th>
                            <th>Impacto Temporal</th>
                            <th>Sistema e Incidencia</th>
                            <th>Costo Ext.</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-24 text-center text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Auditando historial de fallas...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="p-24 text-center flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl text-slate-800 mb-6 font-thin">history_toggle_off</span>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Sin incidencias tecnicas reportadas</p>
                            </td></tr>
                        ) : filtered.map((f: any) => {
                            const asset = assets.find((a: any) => a.id === f.asset_id)
                            return (
                                <tr key={f.id} className="group">
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-100 font-mono">{f.fecha_falla}</span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{f.hora_inicio || '00:00'} — {f.hora_fin || '--:--'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-sm transition-all">
                                                <span className="material-symbols-outlined text-[20px]">precision_manufacturing</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-200 uppercase tracking-tight">{asset?.placa_principal || 'S/P'}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{f.asset_codigo}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${severidadColor[f.severidad] || 'text-slate-500 bg-slate-800'}`}>
                                            {f.severidad || 'Indet.'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-rose-500 font-mono tracking-tighter">{f.duracion_horas?.toFixed(2)}h</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">Tiempo Fuera</span>
                                                {f.inmovilizo_unidad && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-200 uppercase tracking-wide">{f.sistema_afectado || 'Generico'}</span>
                                            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[240px] italic">"{f.descripcion || 'Sin descripcion detallada'}"</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-xs font-black text-slate-100 font-mono">
                                            {f.costo_reparacion != null ? `S/ ${Number(f.costo_reparacion).toFixed(2)}` : 'S/ 0.00'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(f)}
                                                className="w-10 h-10 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-slate-800 hover:border-slate-700 hover:shadow-xl transition-all">
                                                <span className="material-symbols-outlined text-[18px]">manage_search</span>
                                            </button>
                                            <button onClick={() => handleDelete(f.id)}
                                                className="w-10 h-10 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:shadow-md transition-all duration-300">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* CARDS — movil */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="py-16 text-center text-xs font-black text-slate-500 uppercase tracking-widest">Cargando fallas...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 flex flex-col items-center">
                        <span className="material-symbols-outlined text-5xl text-slate-800 mb-4">history_toggle_off</span>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Sin incidencias reportadas</p>
                    </div>
                ) : filtered.map((f: any) => {
                    const asset = assets.find((a: any) => a.id === f.asset_id)
                    return (
                        <div key={f.id} className="bg-slate-800/50 rounded-3xl border border-slate-700 shadow-sm p-5 flex flex-col gap-4">
                            {/* Cabecera */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-rose-500 text-[24px]">precision_manufacturing</span>
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-slate-200 uppercase tracking-tight">{asset?.placa_principal || 'S/P'}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{f.fecha_falla} · {f.hora_inicio || '--:--'}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${severidadColor[f.severidad] || 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                                    {f.severidad || 'Indet.'}
                                </span>
                            </div>

                            {/* Info clave en grid */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-900/50 rounded-2xl p-3">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Duracion</span>
                                    <span className="text-sm font-black text-rose-400 font-mono">{f.duracion_horas?.toFixed(1) || '--'}h</span>
                                </div>
                                <div className="flex flex-col items-center border-x border-slate-700">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Sistema</span>
                                    <span className="text-[10px] font-black text-slate-200 text-center leading-tight">{f.sistema_afectado || '--'}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Costo</span>
                                    <span className="text-sm font-black text-slate-200 font-mono">
                                        {f.costo_reparacion != null ? `S/${Number(f.costo_reparacion).toFixed(0)}` : '--'}
                                    </span>
                                </div>
                            </div>

                            {/* Descripcion */}
                            {f.descripcion && (
                                <p className="text-xs text-slate-400 italic bg-slate-900/30 rounded-xl p-3 border border-slate-700/50">"{f.descripcion}"</p>
                            )}

                            {/* Acciones */}
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(f)}
                                    className="flex-1 bg-slate-800 text-rose-400 text-[11px] font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 border border-slate-700">
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                    Editar
                                </button>
                                <button onClick={() => handleDelete(f.id)}
                                    className="w-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-rose-500/20">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {toast && (
                <div className="fixed bottom-20 lg:bottom-12 right-4 lg:right-12 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in-up border-l-4 border-rose-500">
                    <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500">
                        <span className="material-symbols-outlined text-sm">notifications</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{toast}</span>
                </div>
            )}
        </div>
    )
}

