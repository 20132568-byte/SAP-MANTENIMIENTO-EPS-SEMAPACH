import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

export default function MantenimientoIntegrado() {
    const { assetType } = useAssetType()

    // Filtrado estricto según el selector global
    const showFleet = assetType === 'fleet'
    const showStations = assetType === 'stations'

    const [stations, setStations] = useState<any[]>([])
    const [vehicles, setVehicles] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [selectedType, setSelectedType] = useState<'station' | 'vehicle' | null>(null)
    const [items, setItems] = useState<any[]>([])
    const [maintenanceLog, setMaintenanceLog] = useState<any[]>([])
    const [filterDesde, setFilterDesde] = useState('')
    const [filterHasta, setFilterHasta] = useState('')
    const [filterTipo, setFilterTipo] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        equipment_id: '', activity_code: '', fecha: new Date().toISOString().split('T')[0],
        tipo: 'preventivo', descripcion: '', horas_trabajadas: '', costo: '', tecnico: '', observaciones: '',
        asset_id: '', operador_id: '', hora_inicio: '', hora_fin: '', sistema_afectado: '', severidad: '', causa_probable: '', accion_correctiva: ''
    })
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (selectedId && selectedType) loadDetail()
    }, [selectedId, selectedType, filterDesde, filterHasta, filterTipo])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            const promises: Promise<any>[] = [api.getPlan2026Activities()]
            if (assetType !== 'stations') promises.push(api.getAssets())
            if (assetType !== 'fleet') promises.push(api.getStations())

            const results = await Promise.all(promises)
            let idx = 0
            setActivities(results[idx++])
            if (assetType !== 'stations') setVehicles(results[idx++])
            if (assetType !== 'fleet') setStations(results[idx++])
        } catch (e: any) {
            showToast(e.message, 'err')
        }
        setLoading(false)
    }

    const loadDetail = async () => {
        if (!selectedId || !selectedType) return
        setLoading(true)
        try {
            if (selectedType === 'station') {
                const params: Record<string, string> = {}
                if (filterDesde) params.desde = filterDesde
                if (filterHasta) params.hasta = filterHasta
                if (filterTipo) params.tipo = filterTipo
                const [eqRes, logRes] = await Promise.all([
                    api.getStationEquipment(selectedId),
                    api.getStationMaintenance(selectedId, params)
                ])
                setItems(eqRes)
                setMaintenanceLog(logRes)
            } else {
                // Vehicle: show as "general" since fleet maintenance is tracked via failures/preventives
                setItems([{ id: 0, codigo: 'GENERAL', tipo_equipo: 'Vehículo completo' }])
                const params: Record<string, string> = {}
                if (filterDesde) params.desde = filterDesde
                if (filterHasta) params.hasta = filterHasta
                // Use failures as maintenance log for vehicles
                const failures = await api.getFailures(params)
                setMaintenanceLog(failures.filter((f: any) => f.asset_id === selectedId))
            }
        } catch (e: any) {
            showToast(e.message, 'err')
        }
        setLoading(false)
    }

    const showToast = (msg: string, type: 'ok' | 'err') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleSubmit = async () => {
        if (!form.fecha || !form.descripcion) return showToast('Fecha y descripción son obligatorios', 'err')
        try {
            if (selectedType === 'station') {
                await api.addStationMaintenance(selectedId!, form)
                showToast('Mantenimiento registrado en estación', 'ok')
            } else {
                // For vehicles, create a failure record as maintenance log
                await api.createFailure({
                    fecha: form.fecha, asset_id: selectedId, operador_id: form.operador_id || null,
                    hora_inicio: form.hora_inicio || '08:00', hora_fin: form.hora_fin || '17:00',
                    tipo_evento: form.tipo === 'emergencia' ? 'Correctivo' : 'Preventivo',
                    clasificacion_falla: form.tipo, sistema_afectado: form.sistema_afectado || 'General',
                    severidad: form.tipo === 'emergencia' ? 'Alta' : 'Baja',
                    descripcion: form.descripcion, causa_probable: form.causa_probable || '',
                    accion_correctiva: form.accion_correctiva || '',
                    inmovilizo_unidad: 0, es_correctiva_no_programada: form.tipo === 'emergencia' ? 1 : 0,
                    costo_reparacion: form.costo || null, observaciones: form.observaciones || ''
                })
                showToast('Mantenimiento registrado en vehículo', 'ok')
            }
            setShowForm(false)
            setForm({ equipment_id: '', activity_code: '', fecha: new Date().toISOString().split('T')[0], tipo: 'preventivo', descripcion: '', horas_trabajadas: '', costo: '', tecnico: '', observaciones: '', asset_id: '', operador_id: '', hora_inicio: '', hora_fin: '', sistema_afectado: '', severidad: '', causa_probable: '', accion_correctiva: '' })
            loadDetail()
        } catch (e: any) {
            showToast(e.message, 'err')
        }
    }

    const totalCosto = maintenanceLog.reduce((sum, m) => sum + (Number(m.costo || m.costo_reparacion) || 0), 0)
    const totalHoras = maintenanceLog.reduce((sum, m) => sum + (Number(m.horas_trabajadas || m.duracion_horas) || 0), 0)

    const tipoColors: Record<string, string> = {
        preventivo: 'bg-emerald-500/20 text-emerald-400',
        correctivo: 'bg-red-500/20 text-red-400',
        emergencia: 'bg-amber-500/20 text-amber-400',
    }

    const currentItem = selectedType === 'station'
        ? stations.find(s => s.id === selectedId)
        : vehicles.find(v => v.id === selectedId)

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

    return (
        <div className="space-y-4">
            {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-bold ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>{toast.msg}</div>}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-white uppercase tracking-tight">Mantenimiento Integrado</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Registro unificado para flota y estaciones hídricas</p>
                </div>
                <button onClick={() => setShowForm(true)} disabled={!selectedId}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add_task</span> Nuevo Registro
                </button>
            </div>

            {/* Selector de activo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assetType !== 'stations' && (
                    <select value={selectedType === 'vehicle' ? (selectedId ?? '') : ''} onChange={e => { setSelectedType('vehicle'); setSelectedId(e.target.value ? Number(e.target.value) : null) }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500">
                        <option value="">🚗 Seleccionar vehículo...</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.codigo_patrimonial} — {v.placa_principal || v.tipo_unidad}</option>)}
                    </select>
                )}
                {assetType !== 'fleet' && (
                    <select value={selectedType === 'station' ? (selectedId ?? '') : ''} onChange={e => { setSelectedType('station'); setSelectedId(e.target.value ? Number(e.target.value) : null) }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500">
                        <option value="">📍 Seleccionar estación...</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.codigo} — {s.nombre} ({s.tipo})</option>)}
                    </select>
                )}
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500" />
                <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500" />
                <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-sky-500">
                    <option value="">Todos los tipos</option>
                    <option value="preventivo">Preventivo</option>
                    <option value="correctivo">Correctivo</option>
                    <option value="emergencia">Emergencia</option>
                </select>
            </div>

            {currentItem ? (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-xs text-slate-400 font-bold uppercase">Registros</div>
                            <div className="text-2xl font-black text-white">{maintenanceLog.length}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-xs text-slate-400 font-bold uppercase">Costo Total</div>
                            <div className="text-2xl font-black text-emerald-400">S/ {totalCosto.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-xs text-slate-400 font-bold uppercase">Horas</div>
                            <div className="text-2xl font-black text-sky-400">{totalHoras.toFixed(2)}h</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-xs text-slate-400 font-bold uppercase">Componentes</div>
                            <div className="text-2xl font-black text-amber-400">{items.length}</div>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                            <h2 className="text-sm font-black text-white uppercase">
                                {selectedType === 'station' ? '📍' : '🚗'} {currentItem.nombre || currentItem.placa_principal || currentItem.codigo_patrimonial} — Historial
                            </h2>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedType === 'station' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                {selectedType === 'station' ? currentItem.tipo : currentItem.tipo_unidad}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-700/50">
                                        <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Fecha</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Tipo</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase hidden md:table-cell">Actividad</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Descripción</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-black text-slate-400 uppercase hidden sm:table-cell">Horas</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-black text-slate-400 uppercase">Costo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintenanceLog.map((m, i) => (
                                        <tr key={m.id || i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                            <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">{(m.fecha || '').split('T')[0]}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${tipoColors[m.tipo] || tipoColors[m.clasificacion_falla] || 'bg-slate-500/20 text-slate-400'}`}>
                                                    {m.tipo || m.clasificacion_falla || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-sky-400 hidden md:table-cell">{m.activity_code || '—'}</td>
                                            <td className="px-3 py-2 text-white max-w-[200px] truncate">{m.descripcion || '—'}</td>
                                            <td className="px-3 py-2 text-right text-slate-300 hidden sm:table-cell">{(m.horas_trabajadas || m.duracion_horas) ? `${m.horas_trabajadas || m.duracion_horas}h` : '—'}</td>
                                            <td className="px-3 py-2 text-right text-emerald-400 font-bold">{(m.costo || m.costo_reparacion) ? `S/ ${Number(m.costo || m.costo_reparacion).toFixed(2)}` : '—'}</td>
                                        </tr>
                                    ))}
                                    {maintenanceLog.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-slate-500">Sin registros</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <span className="material-symbols-outlined text-4xl block mb-2">swap_horiz</span>
                    Selecciona un vehículo o estación para ver su historial
                </div>
            )}

            {/* Formulario */}
            {showForm && currentItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-black text-white">Registrar Mantenimiento</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha *</label>
                                    <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                        <option value="preventivo">Preventivo</option>
                                        <option value="correctivo">Correctivo</option>
                                        <option value="emergencia">Emergencia</option>
                                    </select>
                                </div>
                            </div>
                            {selectedType === 'station' && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Equipo</label>
                                    <select value={form.equipment_id} onChange={e => setForm({ ...form, equipment_id: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                        <option value="">General</option>
                                        {items.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.codigo} — {eq.tipo_equipo}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Actividad</label>
                                <select value={form.activity_code} onChange={e => setForm({ ...form, activity_code: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                    <option value="">Sin actividad</option>
                                    {activities.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre.substring(0, 35)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Descripción *</label>
                                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Detalle del trabajo realizado..." />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horas</label>
                                    <input type="number" step="0.5" value={form.horas_trabajadas} onChange={e => setForm({ ...form, horas_trabajadas: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Costo (S/)</label>
                                    <input type="number" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Técnico</label>
                                    <input value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</label>
                                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-black uppercase px-6 py-2 rounded-lg">Registrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
