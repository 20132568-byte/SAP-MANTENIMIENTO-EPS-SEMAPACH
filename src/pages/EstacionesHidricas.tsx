import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface Station {
    id?: number
    codigo: string
    nombre: string
    tipo: string
    zona: string
    distrito: string
    direccion: string
    coordenadas_lat: string
    coordenadas_lng: string
    estado: string
    observaciones: string
    activo: number
}

export default function EstacionesHidricas() {
    const [stations, setStations] = useState<Station[]>([])
    const [catalogs, setCatalogs] = useState<{ tipo_estacion: string[] }>({ tipo_estacion: [] })
    const [search, setSearch] = useState('')
    const [filterTipo, setFilterTipo] = useState('')
    const [filterEstado, setFilterEstado] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Station | null>(null)
    const [selectedStation, setSelectedStation] = useState<Station | null>(null)
    const [equipment, setEquipment] = useState<any[]>([])
    const [maintenanceLog, setMaintenanceLog] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

    const emptyStation: Station = { codigo: '', nombre: '', tipo: '', zona: '', distrito: '', direccion: '', coordenadas_lat: '', coordenadas_lng: '', estado: 'Operativa', observaciones: '', activo: 1 }
    const [form, setForm] = useState<Station>(emptyStation)

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        loadStations()
    }, [search, filterTipo, filterEstado])

    const loadData = async () => {
        setLoading(true)
        try {
            const [stationsRes, catalogsRes] = await Promise.all([
                api.getStations(),
                api.getCatalog('tipo_estacion').catch(() => [])
            ])
            setStations(stationsRes)
            setCatalogs({ tipo_estacion: catalogsRes.map((c: any) => c.valor) })
        } catch (e: any) {
            showToast(e.message, 'err')
        }
        setLoading(false)
    }

    const loadStations = async () => {
        try {
            const params: Record<string, string> = {}
            if (search) params.buscar = search
            if (filterTipo) params.tipo = filterTipo
            if (filterEstado) params.estado = filterEstado
            setStations(await api.getStations(params))
        } catch (e: any) {
            showToast(e.message, 'err')
        }
    }

    const loadStationDetail = async (station: Station) => {
        setSelectedStation(station)
        try {
            const [eqRes, logRes] = await Promise.all([
                api.getStationEquipment(station.id!),
                api.getStationMaintenanceHistory(station.id!)
            ])
            setEquipment(eqRes)
            setMaintenanceLog(logRes)
        } catch (e: any) {
            showToast(e.message, 'err')
        }
    }

    const showToast = (msg: string, type: 'ok' | 'err') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleSubmit = async () => {
        if (!form.codigo || !form.nombre) return showToast('Código y nombre son obligatorios', 'err')
        try {
            if (editing?.id) {
                await api.updateStation(editing.id, form)
                showToast('Estación actualizada', 'ok')
            } else {
                await api.createStation(form)
                showToast('Estación creada', 'ok')
            }
            setShowForm(false)
            setEditing(null)
            setForm(emptyStation)
            loadData()
        } catch (e: any) {
            showToast(e.message, 'err')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Desactivar esta estación?')) return
        try {
            await api.deleteStation(id)
            showToast('Estación desactivada', 'ok')
            loadData()
        } catch (e: any) {
            showToast(e.message, 'err')
        }
    }

    const openEdit = (s: Station) => {
        setEditing(s)
        setForm(s)
        setShowForm(true)
    }

    const openNew = () => {
        setEditing(null)
        setForm(emptyStation)
        setShowForm(true)
    }

    const estados = ['Operativa', 'En Mantenimiento', 'Fuera de Servicio', 'Reparación', 'Inactiva']

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

    return (
        <div className="space-y-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-bold ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-white uppercase tracking-tight">Estaciones Hídricas</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Inventario y control de estaciones de la EPS SEMAPACH</p>
                </div>
                <button onClick={openNew} className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add_location</span> Nueva Estación
                </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" placeholder="Buscar estación..." value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
                <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500">
                    <option value="">Todos los tipos</option>
                    {catalogs.tipo_estacion.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500">
                    <option value="">Todos los estados</option>
                    {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <div className="text-sm text-slate-400 flex items-center">
                    <span className="font-bold text-white">{stations.length}</span>&nbsp;estaciones
                </div>
            </div>

            {/* Tabla de estaciones */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Código</th>
                            <th className="text-left px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Nombre</th>
                            <th className="text-left px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                            <th className="text-left px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Distrito</th>
                            <th className="text-left px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
                            <th className="text-right px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.map(s => (
                            <tr key={s.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => loadStationDetail(s)}>
                                <td className="px-4 py-3 font-mono text-sky-400 font-bold">{s.codigo}</td>
                                <td className="px-4 py-3 text-white font-medium">{s.nombre}</td>
                                <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{s.tipo}</td>
                                <td className="px-4 py-3 text-slate-300 hidden lg:table-cell">{s.distrito}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                        s.estado === 'Operativa' ? 'bg-emerald-500/20 text-emerald-400' :
                                        s.estado === 'En Mantenimiento' ? 'bg-amber-500/20 text-amber-400' :
                                        s.estado === 'Fuera de Servicio' ? 'bg-red-500/20 text-red-400' :
                                        'bg-slate-500/20 text-slate-400'
                                    }`}>{s.estado}</span>
                                </td>
                                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => openEdit(s)} className="text-sky-400 hover:text-sky-300 mr-2">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(s.id!)} className="text-red-400 hover:text-red-300">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {stations.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-500">No hay estaciones registradas</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Panel de detalle de estación */}
            {selectedStation && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-black text-white">{selectedStation.nombre}</h2>
                            <p className="text-xs text-slate-400">{selectedStation.codigo} · {selectedStation.tipo} · {selectedStation.distrito}</p>
                        </div>
                        <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Equipos */}
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-sky-400 uppercase mb-2">Equipos ({equipment.length})</h3>
                        {equipment.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {equipment.map(eq => (
                                    <div key={eq.id} className="bg-slate-700/50 rounded-lg p-3">
                                        <div className="text-xs font-bold text-white">{eq.codigo}</div>
                                        <div className="text-xs text-slate-400">{eq.tipo_equipo}</div>
                                        {eq.marca && <div className="text-xs text-slate-500">{eq.marca} {eq.modelo}</div>}
                                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            eq.estado === 'Operativo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>{eq.estado}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-slate-500">Sin equipos registrados</p>}
                    </div>

                    {/* Historial de mantenimiento */}
                    <div>
                        <h3 className="text-sm font-bold text-sky-400 uppercase mb-2">Historial de Mantenimiento ({maintenanceLog.length})</h3>
                        {maintenanceLog.length > 0 ? (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {maintenanceLog.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-3 py-2 text-xs">
                                        <span className="text-sky-400 font-mono font-bold">{m.fecha?.split('T')[0]}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            m.tipo === 'preventivo' ? 'bg-emerald-500/20 text-emerald-400' :
                                            m.tipo === 'correctivo' ? 'bg-red-500/20 text-red-400' :
                                            'bg-amber-500/20 text-amber-400'
                                        }`}>{m.tipo}</span>
                                        {m.activity_code && <span className="text-slate-400 font-mono">{m.activity_code}</span>}
                                        <span className="text-slate-300 truncate">{m.descripcion}</span>
                                        {m.costo && <span className="text-emerald-400 font-bold ml-auto">S/ {Number(m.costo).toFixed(2)}</span>}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-slate-500">Sin registros de mantenimiento</p>}
                    </div>
                </div>
            )}

            {/* Formulario modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-black text-white">{editing ? 'Editar Estación' : 'Nueva Estación'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Código *</label>
                                    <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Nombre *</label>
                                    <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Tipo</label>
                                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                        <option value="">Seleccionar...</option>
                                        {catalogs.tipo_estacion.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Estado</label>
                                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                        {estados.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Zona</label>
                                    <input value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Distrito</label>
                                    <input value={form.distrito} onChange={e => setForm({ ...form, distrito: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Dirección</label>
                                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Latitud</label>
                                    <input value={form.coordenadas_lat} onChange={e => setForm({ ...form, coordenadas_lat: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="-13.xxx" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Longitud</label>
                                    <input value={form.coordenadas_lng} onChange={e => setForm({ ...form, coordenadas_lng: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="-75.xxx" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Observaciones</label>
                                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-black uppercase px-6 py-2 rounded-lg">{editing ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
