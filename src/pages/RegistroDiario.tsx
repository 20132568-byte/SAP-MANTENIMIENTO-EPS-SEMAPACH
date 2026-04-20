import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

function calcHorasParada(inicio: string, fin: string): number | null {
    if (!inicio || !fin) return null
    const [hi, mi] = inicio.split(':').map(Number)
    const [hf, mf] = fin.split(':').map(Number)
    let diff = (hf * 60 + mf) - (hi * 60 + mi)
    if (diff < 0) diff += 24 * 60
    return Math.round((diff / 60) * 100) / 100
}

function calcHorasJornada(inicio: string, fin: string): number | null {
    if (!inicio || !fin) return null
    const [hi, mi] = inicio.split(':').map(Number)
    const [hf, mf] = fin.split(':').map(Number)
    let diff = (hf * 60 + mf) - (hi * 60 + mi)
    if (diff < 0) diff += 24 * 60
    return Math.round((diff / 60) * 100) / 100
}

type FormMode = 'inicio' | 'cierre' | 'completo'

const emptyFormInicio = {
    fecha: new Date().toISOString().split('T')[0],
    asset_id: '', operador_id: '', horas_programadas: 8,
    hora_inicio_jornada: '',
    km_inicial: '', horometro_inicial: '',
    estado_dia: 'Operativo', observaciones: ''
}

const emptyFormCierre = {
    hora_fin_jornada: '',
    horas_reales: 0,
    km_final: '', horometro_final: '',
    hora_inicio_parada: '', hora_fin_parada: '',
    observaciones: ''
}

export default function RegistroDiario() {
    const [records, setRecords] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [operators, setOperators] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formMode, setFormMode] = useState<FormMode>('inicio')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingRecord, setEditingRecord] = useState<any>(null)
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [filtroPlaca, setFiltroPlaca] = useState('')
    const [toast, setToast] = useState<string | null>(null)
    const [form, setForm] = useState<any>({ ...emptyFormInicio })

    const [showQuickMode, setShowQuickMode] = useState(false)
    const [quickAssetId, setQuickAssetId] = useState('')
    const [quickKm, setQuickKm] = useState('')

    const { assetType } = useAssetType()

    useEffect(() => {
        const params: Record<string, string> = {}
        params.categoria = assetType
        api.getAssets(params).then(setAssets)
        api.getOperators().then(setOperators)
    }, [assetType])

    const loadRecords = () => {
        setLoading(true)
        api.getDailyRecords({ fecha, categoria: assetType }).then(data => { setRecords(data); setLoading(false) })
    }
    useEffect(() => { loadRecords() }, [fecha, assetType])

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
    const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

    const openInicioJornada = () => {
        setEditingId(null)
        setEditingRecord(null)
        setFormMode('inicio')
        const now = new Date()
        const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        setForm({ ...emptyFormInicio, fecha, hora_inicio_jornada: horaActual })
        setShowForm(true)
    }

    const openCierreJornada = (record: any) => {
        setEditingId(record.id)
        setEditingRecord(record)
        setFormMode('cierre')
        const now = new Date()
        const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        setForm({
            ...emptyFormCierre,
            hora_fin_jornada: horaActual,
            km_final: '',
            horometro_final: '',
            observaciones: record.observaciones || '',
        })
        setShowForm(true)
    }

    const openEdit = (record: any) => {
        setEditingId(record.id)
        setEditingRecord(record)
        setFormMode('completo')
        setForm({
            fecha: record.fecha,
            asset_id: String(record.asset_id),
            operador_id: record.operador_id ? String(record.operador_id) : '',
            horas_programadas: record.horas_programadas,
            horas_reales: record.horas_reales,
            hora_inicio_jornada: record.hora_inicio_jornada || '',
            hora_fin_jornada: record.hora_fin_jornada || '',
            hora_inicio_parada: record.hora_inicio_parada || '',
            hora_fin_parada: record.hora_fin_parada || '',
            km_inicial: record.km_inicial ?? '',
            km_final: record.km_final ?? '',
            horometro_inicial: record.horometro_inicial ?? '',
            horometro_final: record.horometro_final ?? '',
            estado_dia: record.estado_dia,
            observaciones: record.observaciones || '',
        })
        setShowForm(true)
    }

    const handleAssetChange = (idStr: string) => {
        const id = Number(idStr)
        set('asset_id', idStr)
        const a = assets.find(x => x.id === id)
        if (a && !editingId) {
            set('horas_programadas', a.horas_programadas_estandar || 8)
            set('km_inicial', a.km_actual ?? '')
            set('horometro_inicial', a.horometro_actual ?? '')
        }
    }

    const handleSaveInicio = async () => {
        if (!form.asset_id) return
        try {
            await api.createDailyRecord({
                fecha: form.fecha,
                asset_id: Number(form.asset_id),
                operador_id: form.operador_id ? Number(form.operador_id) : null,
                horas_programadas: form.horas_programadas,
                horas_reales: 0,
                horas_parada: 0,
                hora_inicio_parada: '',
                hora_fin_parada: '',
                km_inicial: form.km_inicial !== '' ? Number(form.km_inicial) : null,
                km_final: null,
                horometro_inicial: form.horometro_inicial !== '' ? Number(form.horometro_inicial) : null,
                horometro_final: null,
                estado_dia: form.estado_dia,
                observaciones: form.observaciones,
                hora_inicio_jornada: form.hora_inicio_jornada,
                hora_fin_jornada: '',
                jornada_completa: 0,
            })
            notify('Jornada iniciada')
            setShowForm(false)
            loadRecords()
        } catch (e: any) { notify(e.message) }
    }

    const handleSaveCierre = async () => {
        if (!editingId || !editingRecord) return
        const horasParada = calcHorasParada(form.hora_inicio_parada, form.hora_fin_parada)
        const horasJornada = calcHorasJornada(editingRecord.hora_inicio_jornada, form.hora_fin_jornada)
        try {
            await api.updateDailyRecord(editingId, {
                fecha: editingRecord.fecha,
                asset_id: editingRecord.asset_id,
                operador_id: editingRecord.operador_id,
                horas_programadas: editingRecord.horas_programadas,
                horas_reales: horasJornada ?? form.horas_reales,
                horas_parada: horasParada ?? 0,
                hora_inicio_parada: form.hora_inicio_parada,
                hora_fin_parada: form.hora_fin_parada,
                km_inicial: editingRecord.km_inicial,
                km_final: form.km_final !== '' ? Number(form.km_final) : null,
                horometro_inicial: editingRecord.horometro_inicial,
                horometro_final: form.horometro_final !== '' ? Number(form.horometro_final) : null,
                estado_dia: editingRecord.estado_dia,
                observaciones: form.observaciones,
                hora_inicio_jornada: editingRecord.hora_inicio_jornada,
                hora_fin_jornada: form.hora_fin_jornada,
                jornada_completa: 1,
            })
            notify('Jornada cerrada')
            setShowForm(false)
            setEditingId(null)
            setEditingRecord(null)
            loadRecords()
            api.getAssets().then(setAssets)
        } catch (e: any) { notify(e.message) }
    }

    const handleSaveCompleto = async () => {
        if (!form.asset_id) return
        const horasParada = calcHorasParada(form.hora_inicio_parada, form.hora_fin_parada)
        const horasJornada = calcHorasJornada(form.hora_inicio_jornada, form.hora_fin_jornada)
        const payload = {
            ...form,
            asset_id: Number(form.asset_id),
            operador_id: form.operador_id ? Number(form.operador_id) : null,
            horas_reales: horasJornada ?? form.horas_reales,
            horas_parada: horasParada ?? 0,
            km_inicial: form.km_inicial !== '' ? Number(form.km_inicial) : null,
            km_final: form.km_final !== '' ? Number(form.km_final) : null,
            horometro_inicial: form.horometro_inicial !== '' ? Number(form.horometro_inicial) : null,
            horometro_final: form.horometro_final !== '' ? Number(form.horometro_final) : null,
            jornada_completa: form.hora_fin_jornada ? 1 : 0,
        }
        try {
            if (editingId) {
                await api.updateDailyRecord(editingId, payload)
                notify('Registro actualizado')
            } else {
                await api.createDailyRecord(payload)
                notify('Registro guardado')
            }
            setShowForm(false)
            setEditingId(null)
            setEditingRecord(null)
            setForm({ ...emptyFormInicio })
            loadRecords()
            api.getAssets().then(setAssets)
        } catch (e: any) { notify(e.message) }
    }

    const handleQuickSave = async () => {
        if (!quickAssetId || !quickKm) return
        const asset = assets.find(a => a.id === Number(quickAssetId))
        if (!asset) return
        const kmAnterior = asset.km_actual || 0
        try {
            await api.createDailyRecord({
                fecha,
                asset_id: Number(quickAssetId),
                operador_id: null,
                horas_programadas: asset.horas_programadas_estandar || 8,
                horas_reales: asset.horas_programadas_estandar || 8,
                km_inicial: kmAnterior,
                km_final: Number(quickKm),
                horometro_inicial: null,
                horometro_final: null,
                estado_dia: 'Operativo',
                observaciones: 'Lectura rápida de odómetro — sin novedad',
                hora_inicio_jornada: '',
                hora_fin_jornada: '',
                jornada_completa: 1,
            })
            notify(`Lectura registrada: ${asset.placa_principal || asset.codigo_patrimonial} → ${quickKm} km`)
            setShowQuickMode(false); setQuickAssetId(''); setQuickKm(''); loadRecords(); api.getAssets().then(setAssets)
        } catch (e: any) { notify(e.message) }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro de forma permanente?')) return
        try {
            await api.deleteDailyRecord(id)
            notify('Registro eliminado')
            loadRecords()
        } catch (e: any) { notify(e.message) }
    }

    const selectedAsset = formMode === 'cierre'
        ? assets.find((a: any) => a.id === editingRecord?.asset_id)
        : assets.find((a: any) => a.id === Number(form.asset_id))

    const filtered = filtroPlaca
        ? records.filter(r => {
            const asset = assets.find(a => a.id === r.asset_id)
            return (asset?.placa_principal?.toLowerCase() || '').includes(filtroPlaca.toLowerCase())
        })
        : records

    const pendientes = filtered.filter(r => !r.jornada_completa)
    const completados = filtered.filter(r => r.jornada_completa)

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="card-premium-white mb-10 border-none shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-sky-500 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40 flex-shrink-0">
                        <span className="material-symbols-outlined text-white text-2xl md:text-3xl">edit_calendar</span>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-3xl font-black text-slate-100 uppercase tracking-tight">Registro Diario</h2>
                        <p className="text-[10px] md:text-sm font-bold text-sky-400 uppercase tracking-widest mt-1 italic">Control de Jornadas — Inicio y Cierre</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button onClick={() => setShowQuickMode(true)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-widest px-8 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm border border-emerald-500/20 hover:-translate-y-1">
                        <span className="material-symbols-outlined text-[20px]">speed</span>
                        Lectura Rápida
                    </button>
                    <button onClick={openInicioJornada}
                        className="bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-900/40 hover:-translate-y-1">
                        <span className="material-symbols-outlined text-[20px]">play_circle</span>
                        Iniciar Jornada
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 card-premium-white border-none shadow-premium-xl !p-6 mb-12">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 shadow-inner">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Temporalidad:</span>
                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                            className="text-xs font-black text-sky-400 bg-transparent border-none focus:ring-0 w-36" />
                    </div>
                </div>

                <div className="h-10 w-px bg-slate-700 hidden sm:block mx-2"></div>

                <div className="flex items-center gap-4 flex-1 bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 shadow-inner">
                    <span className="material-symbols-outlined text-slate-500 text-[20px]">search</span>
                    <input type="text" value={filtroPlaca} onChange={e => setFiltroPlaca(e.target.value)}
                        placeholder="Filtrar por placa..."
                        className="text-xs font-black text-slate-200 bg-transparent border-none focus:ring-0 w-full lg:w-64 placeholder:text-slate-600" />
                </div>

                <div className="flex items-center gap-4">
                    {pendientes.length > 0 && (
                        <div className="flex items-center gap-3 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span>
                            <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest font-mono">{pendientes.length} Pendientes</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-700">
                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.4)]"></span>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">{filtered.length} Total</span>
                    </div>
                </div>
            </div>

            {showQuickMode && (
                <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-3xl p-responsive space-y-6 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[20px]">bolt</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-emerald-100 uppercase tracking-widest">Asistente de Lectura Express</h3>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase mt-0.5">Reporte rápido de odómetro — Asume jornada normal</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="label-sky text-emerald-400">Activo Seleccionado</label>
                            <select value={quickAssetId} onChange={e => setQuickAssetId(e.target.value)}
                                className="w-full text-xs font-black py-3 px-4 bg-slate-800 border-none rounded-2xl focus:ring-emerald-500/20 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">--- Seleccionar ---</option>
                                {assets.filter(a => a.categoria === assetType).map(a => (
                                    <option key={a.id} value={a.id} className="bg-slate-800">
                                        {a.categoria === 'stations' ? `[EST] ${a.codigo_patrimonial}` : `[FLO] ${a.placa_principal}`} | {a.tipo_unidad}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="label-sky text-emerald-400">
                                Lectura Actual ({quickAssetId ? (assets.find(a => a.id === Number(quickAssetId))?.forma_control === 'Horómetro' ? 'Horas' : 'Km') : '...'})
                            </label>
                            <input type="number" value={quickKm} onChange={e => setQuickKm(e.target.value)}
                                className="w-full text-xs font-black py-4 px-4 bg-slate-800 border-none rounded-2xl focus:ring-emerald-500/20 shadow-sm text-slate-200" placeholder="0.0" />
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="p-4 bg-white/5 rounded-2xl border border-emerald-500/10">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Kilometraje en Base</span>
                                <span className="text-sm font-black text-emerald-100">
                                    {quickAssetId ? `${assets.find(a => a.id === Number(quickAssetId))?.km_actual || 0} km` : '---'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button onClick={() => { setShowQuickMode(false); setQuickAssetId(''); setQuickKm('') }}
                            className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/10 px-6 py-3 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={handleQuickSave}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-900/40">Validar y Guardar</button>
                    </div>
                </div>
            )}

            {/* FORMULARIO INICIO DE JORNADA */}
            {showForm && formMode === 'inicio' && (
                <div className="bg-sky-900/20 border border-sky-500/20 rounded-3xl p-responsive space-y-8 animate-fade-in shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        <span className="material-symbols-outlined text-8xl text-sky-500/10 select-none">play_circle</span>
                    </div>
                    <div className="relative">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                            Iniciar Jornada
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Datos de salida — el chofer completa al comenzar su turno</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Inicio</label>
                            <input type="time" value={form.hora_inicio_jornada} onChange={e => set('hora_inicio_jornada', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-sky-400" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad (Placa)</label>
                            <select value={form.asset_id} onChange={e => handleAssetChange(e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">Seleccionar Activo...</option>
                                {assets.filter((a: any) => a.categoria === assetType).map((a: any) => (
                                    <option key={a.id} value={a.id} className="bg-slate-800">
                                        {a.placa_principal || 'S/P'} — {a.codigo_patrimonial} ({a.tipo_unidad})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operador</label>
                            <select value={form.operador_id} onChange={e => set('operador_id', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">Por Asignar...</option>
                                {operators.map((o: any) => <option key={o.id} value={o.id} className="bg-slate-800">{o.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="label-sky text-sky-400">
                                Lectura Inicial ({selectedAsset?.forma_control || 'Control'})
                            </label>
                            <input type="number"
                                value={selectedAsset?.forma_control === 'Horómetro' ? form.horometro_inicial : form.km_inicial}
                                onChange={e => set(selectedAsset?.forma_control === 'Horómetro' ? 'horometro_inicial' : 'km_inicial', e.target.value)}
                                className="w-full text-lg font-black bg-slate-800 border-none rounded-2xl py-4 px-6 shadow-sm text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hrs Programadas</label>
                            <select value={form.horas_programadas} onChange={e => set('horas_programadas', Number(e.target.value))}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200">
                                <option value="8" className="bg-slate-800">8 Hrs (1 Turno)</option>
                                <option value="12" className="bg-slate-800">12 Hrs (Mixto)</option>
                                <option value="16" className="bg-slate-800">16 Hrs (2 Turnos)</option>
                                <option value="24" className="bg-slate-800">24 Hrs (Guardia)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                            <select value={form.estado_dia} onChange={e => set('estado_dia', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200">
                                <option className="bg-slate-800">Operativo</option>
                                <option className="bg-slate-800">En reparación</option>
                                <option className="bg-slate-800">Fuera de servicio</option>
                                <option className="bg-slate-800">Sin uso</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones de Salida</label>
                        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                            className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-4 px-5 shadow-sm min-h-[70px] resize-none focus:ring-sky-500/20 text-slate-200" placeholder="Opcional — novedades al comenzar turno..."></textarea>
                    </div>

                    <div className="flex justify-end gap-5 pt-4">
                        <button onClick={() => setShowForm(false)}
                            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 px-6 py-3 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={handleSaveInicio}
                            className="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black uppercase tracking-widest px-10 py-4 rounded-2xl transition-all shadow-xl shadow-sky-900/40 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">play_circle</span>
                            Registrar Inicio
                        </button>
                    </div>
                </div>
            )}

            {/* FORMULARIO CIERRE DE JORNADA */}
            {showForm && formMode === 'cierre' && editingRecord && (
                <div className="bg-amber-900/20 border border-amber-500/20 rounded-3xl p-responsive space-y-8 animate-fade-in shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        <span className="material-symbols-outlined text-8xl text-amber-500/10 select-none">stop_circle</span>
                    </div>
                    <div className="relative">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                    Cerrar Jornada
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Datos de retorno — el chofer completa al finalizar su turno</p>
                            </div>
                            <div className="bg-slate-800 rounded-2xl px-5 py-3 border border-amber-500/20 shadow-sm">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unidad</p>
                                <p className="text-sm font-black text-slate-200 uppercase">{assets.find(a => a.id === editingRecord.asset_id)?.placa_principal || editingRecord.asset_codigo}</p>
                                <p className="text-[9px] font-bold text-sky-400 uppercase mt-0.5">Inicio: {editingRecord.hora_inicio_jornada || '---'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1">Hora Fin de Jornada</label>
                            <input type="time" value={form.hora_fin_jornada} onChange={e => set('hora_fin_jornada', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <label className="label-sky text-amber-400">
                                Lectura Final ({selectedAsset?.forma_control || 'Control'})
                            </label>
                            <input type="number"
                                value={selectedAsset?.forma_control === 'Horómetro' ? form.horometro_final : form.km_final}
                                onChange={e => set(selectedAsset?.forma_control === 'Horómetro' ? 'horometro_final' : 'km_final', e.target.value)}
                                className="w-full text-lg font-black bg-slate-800 border-none rounded-2xl py-4 px-6 shadow-sm text-slate-100" />
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="p-3.5 bg-slate-800 rounded-2xl text-center border border-amber-500/20">
                                <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block mb-0.5">Horas de Jornada</span>
                                <span className="text-sm font-black text-slate-200">
                                    {calcHorasJornada(editingRecord.hora_inicio_jornada, form.hora_fin_jornada)
                                        ? `${calcHorasJornada(editingRecord.hora_inicio_jornada, form.hora_fin_jornada)} h`
                                        : '---'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Incidencias (Opcional)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Parada Desde</label>
                                <input type="time" value={form.hora_inicio_parada} onChange={e => set('hora_inicio_parada', e.target.value)}
                                    className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Parada Hasta</label>
                                <input type="time" value={form.hora_fin_parada} onChange={e => set('hora_fin_parada', e.target.value)}
                                    className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200" />
                            </div>
                            <div className="col-span-2 flex flex-col justify-end">
                                {calcHorasParada(form.hora_inicio_parada, form.hora_fin_parada) && (
                                    <div className="p-3 bg-rose-500/10 rounded-2xl text-center border border-rose-500/20">
                                        <span className="text-sm font-black text-rose-400">{calcHorasParada(form.hora_inicio_parada, form.hora_fin_parada)}h de parada</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Novedades del Turno</label>
                        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                            className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-4 px-5 shadow-sm min-h-[70px] resize-none focus:ring-amber-500/20 text-slate-200" placeholder="Incidencias, novedades o comentarios del chofer..."></textarea>
                    </div>

                    <div className="flex justify-end gap-5 pt-4">
                        <button onClick={() => { setShowForm(false); setEditingId(null); setEditingRecord(null) }}
                            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 px-6 py-3 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={handleSaveCierre}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest px-10 py-4 rounded-2xl transition-all shadow-xl shadow-amber-900/40 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">stop_circle</span>
                            Cerrar Jornada
                        </button>
                    </div>
                </div>
            )}

            {/* FORMULARIO EDICIÓN COMPLETA */}
            {showForm && formMode === 'completo' && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-responsive space-y-8 animate-fade-in shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        <span className="material-symbols-outlined text-8xl text-slate-500/10 select-none">edit_document</span>
                    </div>
                    <div className="relative">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                            Editar Registro Completo
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad (Placa)</label>
                            <select value={form.asset_id} onChange={e => handleAssetChange(e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">Seleccionar Activo...</option>
                                {assets.map((a: any) => <option key={a.id} value={a.id} className="bg-slate-800">{a.placa_principal || 'S/P'} — {a.codigo_patrimonial}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operador a Cargo</label>
                            <select value={form.operador_id} onChange={e => set('operador_id', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200">
                                <option value="" className="bg-slate-800">Por Asignar...</option>
                                {operators.map((o: any) => <option key={o.id} value={o.id} className="bg-slate-800">{o.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-responsive bg-sky-900/20 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-8 border border-sky-500/20">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Hora Inicio</label>
                            <input type="time" value={form.hora_inicio_jornada} onChange={e => set('hora_inicio_jornada', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Hora Fin</label>
                            <input type="time" value={form.hora_fin_jornada} onChange={e => set('hora_fin_jornada', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Hrs Programadas</label>
                            <select value={form.horas_programadas} onChange={e => set('horas_programadas', Number(e.target.value))}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200">
                                <option value="8" className="bg-slate-800">8 Hrs (1 Turno)</option>
                                <option value="12" className="bg-slate-800">12 Hrs (Mixto)</option>
                                <option value="16" className="bg-slate-800">16 Hrs (2 Turnos)</option>
                                <option value="24" className="bg-slate-800">24 Hrs (Guardia)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Estado</label>
                            <select value={form.estado_dia} onChange={e => set('estado_dia', e.target.value)}
                                className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200">
                                <option className="bg-slate-800">Operativo</option>
                                <option className="bg-slate-800">En reparación</option>
                                <option className="bg-slate-800">Fuera de servicio</option>
                                <option className="bg-slate-800">Sin uso</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-4 col-span-1">
                            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Reporte de Inactividad
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Parada Desde</label>
                                    <input type="time" value={form.hora_inicio_parada} onChange={e => set('hora_inicio_parada', e.target.value)}
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Parada Hasta</label>
                                    <input type="time" value={form.hora_fin_parada} onChange={e => set('hora_fin_parada', e.target.value)}
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 text-slate-200" />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Control de Metraje ({selectedAsset?.forma_control || 'Km'})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Lectura Entrada</label>
                                    <input type="number"
                                        value={selectedAsset?.forma_control === 'Horómetro' ? form.horometro_inicial : form.km_inicial}
                                        onChange={e => set(selectedAsset?.forma_control === 'Horómetro' ? 'horometro_inicial' : 'km_inicial', e.target.value)}
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Lectura Salida</label>
                                    <input type="number"
                                        value={selectedAsset?.forma_control === 'Horómetro' ? form.horometro_final : form.km_final}
                                        onChange={e => set(selectedAsset?.forma_control === 'Horómetro' ? 'horometro_final' : 'km_final', e.target.value)}
                                        className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-3 px-4 shadow-sm text-sky-400" />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <div className="p-3.5 bg-sky-500/10 rounded-2xl text-center border border-sky-500/20">
                                        <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block mb-0.5">Recorrido Neto</span>
                                        <span className="text-sm font-black text-slate-200">
                                            {selectedAsset?.forma_control === 'Horómetro'
                                                ? (form.horometro_final && form.horometro_inicial ? `${(form.horometro_final - form.horometro_inicial).toFixed(2)} h` : '---')
                                                : (form.km_inicial !== '' && form.km_final !== '' ? `${(Number(form.km_final) - Number(form.km_inicial)).toFixed(2)} km` : '---')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas de Turno / Incidencias</label>
                        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                            className="w-full text-xs font-black bg-slate-800 border-none rounded-2xl py-4 px-5 shadow-sm min-h-[100px] resize-none focus:ring-sky-500/20 text-slate-200" placeholder="Escriba aquí cualquier novedad..."></textarea>
                    </div>

                    <div className="flex justify-end gap-5 pt-4">
                        <button onClick={() => { setShowForm(false); setEditingId(null); setEditingRecord(null) }}
                            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 px-6 py-3 rounded-2xl transition-all">Cancelar</button>
                        <button onClick={handleSaveCompleto}
                            className="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black uppercase tracking-widest px-10 py-4 rounded-2xl transition-all shadow-xl shadow-sky-900/40 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">sync</span>
                            Actualizar Registro
                        </button>
                    </div>
                </div>
            )}

            {/* LISTADO DE REGISTROS (RESPONSIVO) */}
            <div className="table-premium-container !p-0 overflow-x-auto no-scrollbar">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Unidad</th>
                            <th>Operador</th>
                            <th>Jornada</th>
                            <th>Parada</th>
                            <th>Recorrido</th>
                            <th>Estado</th>
                            <th className="w-28 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-24 text-center text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Cargando registros...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="p-24 text-center flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl text-slate-800 mb-6 font-thin">history_toggle_off</span>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Sin registros para esta fecha</p>
                            </td></tr>
                        ) : filtered.map((r: any) => {
                            const asset = assets.find((a: any) => a.id === r.asset_id)
                            const isPendiente = !r.jornada_completa
                            return (
                                <tr key={r.id} className="group">
                                    <td>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-sky-500 group-hover:shadow-sm group-hover:text-white transition-all flex-shrink-0">
                                                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-200 uppercase tracking-tight">{asset?.placa_principal || asset?.codigo_patrimonial || 'S/ID'}</p>
                                                <p className="label-sky !text-[9px] !mb-0">{asset?.categoria === 'station' ? 'ESTACIÓN' : 'FLOTA'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-xs font-black text-slate-400">{r.operador_nombre || '—'}</span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            {isPendiente ? (
                                                <>
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                                        En curso
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Inicio: {r.hora_inicio_jornada || '---'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-black text-slate-100 font-mono italic">{r.horas_reales?.toFixed(2)}h</span>
                                                        {r.horas_reales > 8 && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>}
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                                                        {r.hora_inicio_jornada && r.hora_fin_jornada
                                                            ? `${r.hora_inicio_jornada} → ${r.hora_fin_jornada}`
                                                            : `de ${r.horas_programadas}h prog.`}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {r.horas_parada > 0 ? (
                                            <span className="px-4 py-1.5 bg-rose-500/10 text-rose-400 text-[9px] font-black rounded-xl uppercase tracking-widest border border-rose-500/20 shadow-sm inline-block">
                                                {r.horas_parada.toFixed(2)}h Down
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-600 uppercase italic">{isPendiente ? '---' : '100% On-Line'}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-200 font-mono tracking-tight">
                                                {r.km_recorridos != null ? `+${Number(r.km_recorridos).toFixed(2)}` : '---'}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                                                {isPendiente ? 'Pendiente cierre' : 'Diferencia Neta'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${r.estado_dia === 'Operativo' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-600'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${r.estado_dia === 'Operativo' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {r.estado_dia}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {isPendiente ? (
                                                <button onClick={() => openCierreJornada(r)}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-900/40 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                                                    Cerrar
                                                </button>
                                            ) : (
                                                <button onClick={() => openEdit(r)}
                                                    className="w-10 h-10 bg-transparent border border-transparent rounded-2xl flex items-center justify-center text-slate-500 hover:text-sky-400 hover:bg-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-300">
                                                    <span className="material-symbols-outlined text-[18px]">manage_search</span>
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(r.id)}
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

