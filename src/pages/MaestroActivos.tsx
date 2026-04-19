import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { Asset } from '../models/types'
import { useAssetType } from '../contexts/AssetTypeContext'

// ===== Componente Modal reutilizable =====
function Modal({ open, onClose, title, children }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
            <div className="card-premium-white w-full max-w-2xl mb-12 animate-fade-in-up shadow-2xl overflow-hidden !p-0 border-none"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-8 border-b border-slate-800">
                    <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-3 text-slate-500 hover:bg-slate-800 rounded-2xl transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-8">{children}</div>
            </div>
        </div>
    )
}

// ===== Formulario de activo =====
function AssetForm({ asset, catalogos, stations, category, onSave, onCancel }: {
    asset: Partial<Asset> | null
    catalogos: { tipos: string[]; estados: string[]; criticidades: string[]; controles: string[] }
    stations: any[]
    category: 'fleet' | 'stations'
    onSave: (data: Partial<Asset>) => void
    onCancel: () => void
}) {
    const [form, setForm] = useState<Partial<Asset>>({
        codigo_patrimonial: '', tipo_unidad: '', fuente: '', placa_principal: '',
        placa_secundaria: '', anio_fabricacion: null, estado: 'Operativo',
        criticidad: 'Media', forma_control: category === 'fleet' ? 'Kilometraje' : 'Horómetro',
        km_actual: 0, horometro_actual: 0, observaciones: '', calidad_dato_inicial: 'no disponible',
        horas_programadas_estandar: 8,
        categoria: category,
        station_id: null,
        marca: '', modelo: '', potencia_hp: 0, potencia_kw: 0, voltaje: '',
        ...asset
    })

    const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                    <label className="label-sky mb-2">Código Patrimonial *</label>
                    <input type="text" value={form.codigo_patrimonial || ''} onChange={e => set('codigo_patrimonial', e.target.value)}
                        className="w-full" placeholder="Ej: PAT-001" />
                </div>
                <div className="relative">
                    <label className="label-sky mb-2">Tipo de Unidad *</label>
                    <input list="tipos-list" type="text" value={form.tipo_unidad || ''} onChange={e => set('tipo_unidad', e.target.value)}
                        className="w-full" placeholder="Ej: Camioneta, Cisterna..." />
                    <datalist id="tipos-list">
                        {catalogos.tipos.map(t => <option key={t} value={t} />)}
                    </datalist>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                {category === 'fleet' ? (
                    <>
                        <div>
                            <label className="label-sky">Placa Principal</label>
                            <input type="text" value={form.placa_principal || ''} onChange={e => set('placa_principal', e.target.value)}
                                className="w-full" placeholder="Ej: ABC-123" />
                        </div>
                        <div>
                            <label className="label-sky">Placa Secundaria</label>
                            <input type="text" value={form.placa_secundaria || ''} onChange={e => set('placa_secundaria', e.target.value)}
                                className="w-full" placeholder="Remolque/Opcional" />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="label-sky text-cyan-400">Estación Hídrica *</label>
                            <select value={form.station_id || ''} onChange={e => set('station_id', Number(e.target.value))} className="w-full border-cyan-500/20 bg-cyan-500/5">
                                <option value="">--- Seleccionar Estación ---</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-sky">Marca / Serie</label>
                            <input type="text" value={form.marca || ''} onChange={e => set('marca', e.target.value)}
                                className="w-full" placeholder="Ej: Grundfos, Modasa..." />
                        </div>
                    </>
                )}
            </div>

            {category === 'stations' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                        <label className="label-sky">Potencia (HP)</label>
                        <input type="number" value={form.potencia_hp || 0} onChange={e => set('potencia_hp', Number(e.target.value))}
                            className="w-full" step="0.1" />
                    </div>
                    <div>
                        <label className="label-sky">Potencia (kW)</label>
                        <input type="number" value={form.potencia_kw || 0} onChange={e => set('potencia_kw', Number(e.target.value))}
                            className="w-full" step="0.1" />
                    </div>
                    <div>
                        <label className="label-sky">Voltaje / Tensión</label>
                        <input type="text" value={form.voltaje || ''} onChange={e => set('voltaje', e.target.value)}
                            className="w-full" placeholder="Ej: 380V, 220V..." />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                    <label className="label-sky">Estado</label>
                    <select value={form.estado || 'Operativo'} onChange={e => set('estado', e.target.value)} className="w-full">
                        {catalogos.estados.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div>
                    <label className="label-sky">Criticidad</label>
                    <select value={form.criticidad || 'Media'} onChange={e => set('criticidad', e.target.value)} className="w-full">
                        {catalogos.criticidades.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="label-sky">Control</label>
                    <select value={form.forma_control || 'Kilometraje'} onChange={e => set('forma_control', e.target.value)} className="w-full">
                        {catalogos.controles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                    <label className="label-sky">Hrs Prog. (KPI)</label>
                    <input type="number"
                        value={form.horas_programadas_estandar}
                        onChange={e => set('horas_programadas_estandar', Number(e.target.value))}
                        className="w-full font-bold text-sky-400 bg-sky-500/10 border-sky-500/20"
                        placeholder="Ej: 8, 12, 16" />
                </div>
                <div>
                    <label className="label-sky">{category === 'fleet' ? 'Km Actual' : 'Horas de Vida'}</label>
                    <input type="number" value={category === 'fleet' ? form.km_actual : form.horometro_actual} onChange={e => set(category === 'fleet' ? 'km_actual' : 'horometro_actual', Number(e.target.value))}
                        className="w-full font-mono" step="0.1" />
                </div>
                <div>
                    <label className="label-sky">Año Fab.</label>
                    <input type="number" value={form.anio_fabricacion || ''} onChange={e => set('anio_fabricacion', e.target.value ? Number(e.target.value) : null)}
                        className="w-full" placeholder="2020" />
                </div>
                <div>
                    <label className="label-sky">Calidad Dato</label>
                    <select value={form.calidad_dato_inicial || 'no disponible'} onChange={e => set('calidad_dato_inicial', e.target.value)} className="w-full">
                        <option value="confirmado">Confirmado</option>
                        <option value="estimado">Estimado</option>
                        <option value="no disponible">No disponible</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="label-sky">Especificaciones / Observaciones</label>
                <textarea value={form.observaciones || ''} onChange={e => set('observaciones', e.target.value)}
                    className="w-full h-24 resize-none" placeholder="Detalles técnicos del activo..." />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button onClick={onCancel}
                    className="px-6 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 transition-colors">
                    Cancelar
                </button>
                <button onClick={() => onSave(form)}
                    className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-sky-900/20 active:scale-95">
                    {asset?.id ? 'Actualizar Información' : 'Crear Activo'}
                </button>
            </div>
        </div>
    )
}

// ===== Badge de criticidad =====
function CriticidadBadge({ value }: { value: string }) {
    const colors: Record<string, string> = {
        'Crítica': 'bg-rose-500/15 text-rose-400',
        'Alta': 'bg-orange-500/15 text-orange-400',
        'Media': 'bg-sky-500/15 text-sky-400',
        'Baja': 'bg-emerald-500/15 text-emerald-400',
    }
    return (
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${colors[value] || 'bg-slate-800 text-slate-400'}`}>
            {value}
        </span>
    )
}

// ===== Badge de estado =====
function EstadoBadge({ value }: { value: string }) {
    const colors: Record<string, string> = {
        'Operativo': 'bg-emerald-500',
        'En reparación': 'bg-orange-500',
        'Fuera de servicio': 'bg-rose-500',
        'En mantenimiento preventivo': 'bg-sky-500',
        'Baja': 'bg-slate-500',
    }
    return (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${colors[value] || 'bg-slate-500'} shadow-sm`}></span>
            <span className="text-xs font-bold text-slate-400">{value}</span>
        </div>
    )
}

export default function MaestroActivos() {
    const { assetType } = useAssetType()
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
    const [buscar, setBuscar] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroCriticidad, setFiltroCriticidad] = useState('')
    const [catalogos, setCatalogos] = useState({ tipos: [] as string[], estados: [] as string[], criticidades: [] as string[], controles: [] as string[] })
    const [stations, setStations] = useState<any[]>([])
    const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'error' } | null>(null)

    const showToast = (msg: string, tipo: 'ok' | 'error' = 'ok') => {
        setToast({ msg, tipo })
        setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        console.log('[MaestroActivos] Cargando catálogos...')
        Promise.all([
            api.getCatalog('tipo_unidad'),
            api.getCatalog('estado_unidad'),
            api.getCatalog('criticidad'),
            api.getCatalog('forma_control'),
            api.getStations(),
        ]).then(([tipos, estados, criticidades, controles, st]) => {
            const catalogosData = {
                tipos: tipos.map((c: any) => c.valor),
                estados: estados.map((c: any) => c.valor),
                criticidades: criticidades.map((c: any) => c.valor),
                controles: controles.map((c: any) => c.valor),
            }
            console.log('[MaestroActivos] Catálogos cargados:', catalogosData)
            setCatalogos(catalogosData)
            setStations(st)
        }).catch(err => {
            console.error('Error cargando catálogos:', err)
            showToast('Error cargando catálogos', 'error')
        })
    }, [])

    const loadAssets = () => {
        console.log('[MaestroActivos] Cargando activos...', { assetType, buscar, filtroTipo, filtroCriticidad })
        setLoading(true)
        setError(null)
        const params: Record<string, string> = {}
        if (buscar) params.buscar = buscar
        if (filtroTipo) params.tipo_unidad = filtroTipo
        if (filtroCriticidad) params.criticidad = filtroCriticidad
        // Siempre filtrar por categoría (fleet o stations)
        params.categoria = assetType
        api.getAssets(params)
            .then(data => {
                console.log('[MaestroActivos] Activos cargados:', data.length)
                setAssets(data)
                setLoading(false)
            })
            .catch(err => {
                console.error('Error cargando activos:', err)
                setLoading(false)
                setError('Error al cargar la base de datos de activos')
                showToast('Error al cargar activos', 'error')
            })
    }

    useEffect(() => { loadAssets() }, [buscar, filtroTipo, filtroCriticidad, assetType])

    const handleSave = async (data: Partial<Asset>) => {
        try {
            if (!data.codigo_patrimonial || !data.tipo_unidad) {
                showToast('Código patrimonial y tipo de unidad son obligatorios', 'error')
                return
            }
            if (editingAsset?.id) {
                await api.updateAsset(editingAsset.id, data)
                showToast('Activo actualizado correctamente')
            } else {
                await api.createAsset(data)
                if (!catalogos.tipos.includes(data.tipo_unidad)) {
                    await api.createCatalogItem({ tipo: 'tipo_unidad', valor: data.tipo_unidad })
                    api.getCatalog('tipo_unidad').then(res => {
                        setCatalogos(prev => ({ ...prev, tipos: res.map((c: any) => c.valor) }))
                    })
                }
                showToast('Activo creado correctamente')
            }
            setModalOpen(false)
            setEditingAsset(null)
            loadAssets()
        } catch (e: any) {
            showToast(e.message || 'Error al guardar', 'error')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Desactivar este activo?')) return
        try {
            await api.deleteAsset(id)
            showToast('Activo desactivado')
            loadAssets()
        } catch { showToast('Error al desactivar', 'error') }
    }

    return (
        <div className="animate-fade-in-up space-y-8 min-h-[600px]">
            <div className="card-premium-white mb-10 border-none shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-sky-500 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40">
                        <span className="material-symbols-outlined text-white text-4xl">{assetType === 'fleet' ? 'local_shipping' : 'water_pump'}</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Maestro de Activos</h2>
                        <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mt-1 italic">
                            {assetType === 'fleet' ? 'Inventario General y Control Técnico de Flota' : 'Inventario de Equipos y Sistemas Hídricos'}
                        </p>
                    </div>
                </div>

                <button onClick={() => { setEditingAsset(null); setModalOpen(true) }}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-900/20 hover:-translate-y-1">
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Registrar {assetType === 'fleet' ? 'Nueva Unidad' : 'Nuevo Equipo'}
                </button>
            </div>
            <div className="card-premium-white border-none shadow-premium-xl flex flex-wrap items-center gap-8 mb-4">
                <div className="flex flex-col gap-2 flex-grow min-w-[300px]">
                    <span className="label-sky ml-1">Búsqueda Inteligente</span>
                    <div className="flex items-center bg-slate-800/50 px-6 py-3.5 rounded-2xl border border-slate-700 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-slate-800">
                        <span className="material-symbols-outlined text-sky-500 text-[22px] flex-shrink-0 transition-transform group-focus-within:scale-110">search</span>
                        <div className="h-6 w-px bg-slate-700 mx-4"></div>
                        <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)}
                            className="flex-1 bg-transparent border-none text-xs font-black text-slate-200 focus:ring-0 p-0 placeholder:text-slate-600"
                            placeholder="Buscar por placa, código patrimonial o modelo..." />
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <span className="label-sky ml-1">Tipo de Activo</span>
                    <div className="flex items-center bg-slate-800/50 px-6 py-3.5 rounded-2xl border border-slate-700 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-slate-800">
                        <span className="material-symbols-outlined text-sky-500 text-[20px] flex-shrink-0">category</span>
                        <div className="h-6 w-px bg-slate-700 mx-4"></div>
                        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                            className="flex-1 bg-transparent border-none text-slate-200 text-xs font-black focus:ring-0 p-0 min-w-[160px] appearance-none cursor-pointer">
                            <option value="" className="bg-slate-800">Todos los Tipos</option>
                            {catalogos.tipos.map(t => <option key={t} value={t} className="bg-slate-800">{t}</option>)}
                        </select>
                        <span className="material-symbols-outlined text-slate-500 text-sm ml-2 pointer-events-none">expand_more</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <span className="label-sky ml-1">Criticidad</span>
                    <div className="flex items-center bg-slate-800/50 px-6 py-3.5 rounded-2xl border border-slate-700 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-slate-800">
                        <span className="material-symbols-outlined text-sky-500 text-[20px] flex-shrink-0">emergency</span>
                        <div className="h-6 w-px bg-slate-700 mx-4"></div>
                        <select value={filtroCriticidad} onChange={e => setFiltroCriticidad(e.target.value)}
                            className="flex-1 bg-transparent border-none text-slate-200 text-xs font-black focus:ring-0 p-0 min-w-[160px] appearance-none cursor-pointer">
                            <option value="" className="bg-slate-800">Toda Criticidad</option>
                            {catalogos.criticidades.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                        </select>
                        <span className="material-symbols-outlined text-slate-500 text-sm ml-2 pointer-events-none">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="table-premium-container !p-0 min-h-[400px]">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="table-premium w-full">
                        <thead>
                            <tr>
                                <th>Identificación</th>
                                <th>{assetType === 'stations' ? 'Estación / Equipo' : 'Tipo / Marca'}</th>
                                <th className="text-center">Hrs Prog.</th>
                                <th>Estado</th>
                                <th>Criticidad</th>
                                <th>Control</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={7} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <span className="material-symbols-outlined text-5xl text-sky-500 animate-spin">progress_activity</span>
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando base de datos...</span>
                                    </div>
                                </td></tr>
                            )}
                            {error && (
                                <tr><td colSpan={7} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <span className="material-symbols-outlined text-5xl text-rose-500">error</span>
                                        <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">{error}</p>
                                        <button onClick={loadAssets} className="mt-2 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all">
                                            Reintentar
                                        </button>
                                    </div>
                                </td></tr>
                            )}
                            {!loading && !error && assets.length === 0 && (
                                <tr><td colSpan={7} className="p-20 text-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">inventory_2</span>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No se encontraron activos registrados</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Haz clic en "Registrar" para agregar uno</p>
                                </td></tr>
                            )}
                            {!loading && !error && assets.map(a => (
                                <tr key={a.id} className="group">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-200">{a.placa_principal || a.codigo_patrimonial}</span>
                                            <span className="text-[10px] font-bold text-slate-500">{a.categoria === 'stations' ? (stations.find(s => s.id === a.station_id)?.nombre || 'Sin Estación') : a.codigo_patrimonial}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400">{a.tipo_unidad}</span>
                                            {a.marca && <span className="text-[10px] text-slate-600 font-bold uppercase">{a.marca}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-3 py-1 bg-sky-500/15 text-sky-400 text-xs font-black rounded-lg">{a.horas_programadas_estandar || 8}h</span>
                                    </td>
                                    <td className="p-4"><EstadoBadge value={a.estado} /></td>
                                    <td className="p-4"><CriticidadBadge value={a.criticidad} /></td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-200">
                                                {a.forma_control === 'Horómetro' ? `${a.horometro_actual} h` : `${a.km_actual} km`}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{a.forma_control}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingAsset(a); setModalOpen(true) }}
                                                className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all" title="Editar">
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(a.id!)}
                                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" title="Desactivar">
                                                <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingAsset(null) }}
                title={editingAsset ? 'Ficha de Edición' : `Alta de ${assetType === 'fleet' ? 'Vehículo' : assetType === 'stations' ? 'Equipo' : 'Activo'}`}>
                <AssetForm
                    asset={editingAsset}
                    catalogos={catalogos}
                    stations={stations}
                    category={editingAsset?.categoria ?? assetType}
                    onSave={handleSave}
                    onCancel={() => { setModalOpen(false); setEditingAsset(null) }} />
            </Modal>

            {toast && (
                <div className="fixed bottom-12 right-12 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-5 animate-fade-in-up border-l-4 border-emerald-500">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                        <span className="material-symbols-outlined text-sm">{toast.tipo === 'ok' ? 'check_circle' : 'error'}</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{toast.msg}</span>
                </div>
            )}
        </div>
    )
}

