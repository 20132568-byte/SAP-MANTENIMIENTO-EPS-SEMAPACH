import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

export default function DiagnosticoInicial() {
    const { assetType } = useAssetType()
    const [assets, setAssets] = useState<any[]>([])
    const [diagnoses, setDiagnoses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAsset, setSelectedAsset] = useState<any>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [form, setForm] = useState<any>({
        km_actual: 0, horometro_actual: 0, fecha_ultimo_preventivo: '',
        lectura_ultimo_preventivo: 0, estado_tecnico_inicial: 'Buena',
        observacion_tecnica: '', calidad_dato: 'no disponible',
        recomendacion_manual: '', prioridad_manual: ''
    })

    useEffect(() => { 
        api.getAssets({ categoria: assetType }).then(setAssets); 
        loadDiag() 
    }, [assetType])

    const loadDiag = () => { 
        setLoading(true); 
        api.getDiagnoses({ categoria: assetType }).then(d => { setDiagnoses(d); setLoading(false) }) 
    }
    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

    const startDiag = (asset: any) => {
        setSelectedAsset(asset)
        const existing = diagnoses.find(d => d.asset_id === asset.id)
        if (existing) {
            setForm({ ...existing })
        } else {
            setForm({ km_actual: asset.km_actual, horometro_actual: asset.horometro_actual, fecha_ultimo_preventivo: '', lectura_ultimo_preventivo: 0, estado_tecnico_inicial: 'Buena', observacion_tecnica: '', calidad_dato: 'no disponible', recomendacion_manual: '', prioridad_manual: '' })
        }
    }

    const handleSave = async () => {
        if (!selectedAsset) return
        try {
            const existing = diagnoses.find(d => d.asset_id === selectedAsset.id)
            if (existing) {
                await api.updateDiagnosis(selectedAsset.id, form)
            } else {
                await api.createDiagnosis({ ...form, asset_id: selectedAsset.id })
            }
            setToast('Diagnóstico guardado'); setTimeout(() => setToast(null), 2500)
            setSelectedAsset(null); loadDiag()
        } catch (e: any) { setToast(e.message) }
    }

    const diagnosed = new Set(diagnoses.map((d: any) => d.asset_id))
    const pct = assets.length > 0 ? Math.round((diagnosed.size / assets.length) * 100) : 0

    return (
        <div className="animate-fade-in-up space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Diagnóstico Inicial</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        {diagnosed.size}/{assets.length} ACTIVOS DIAGNOSTICADOS ({pct}%)
                    </p>
                </div>
            </div>

            {/* Barra de progreso global */}
            <div className="card-premium-white">
                <div className="flex justify-between items-center mb-4">
                    <span className="label-slate text-slate-400">PROGRESO DE DIAGNÓSTICO</span>
                    <span className="text-lg font-black text-sky-400">{pct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-sky-900/40" 
                        style={{ width: `${pct}%` }}
                    ></div>
                </div>
            </div>

            {/* Formulario de diagnóstico */}
            {selectedAsset && (
                <div className="card-premium-white border-2 border-sky-500/20 animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center font-black">
                            {selectedAsset.tipo_unidad?.substring(0, 1) || 'A'}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
                                Diagnóstico: {selectedAsset.placa_principal || '—'}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {selectedAsset.codigo_patrimonial} — {selectedAsset.tipo_unidad}
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div><label className="label-slate mb-2">Km Actual</label>
                            <input type="number" value={form.km_actual} onChange={e => set('km_actual', Number(e.target.value))} className="w-full font-bold" /></div>
                        <div><label className="label-slate mb-2">Horómetro</label>
                            <input type="number" value={form.horometro_actual} onChange={e => set('horometro_actual', Number(e.target.value))} className="w-full font-bold" /></div>
                        <div><label className="label-slate mb-2">Último Preventivo</label>
                            <input type="date" value={form.fecha_ultimo_preventivo} onChange={e => set('fecha_ultimo_preventivo', e.target.value)} className="w-full font-bold" /></div>
                        <div><label className="label-slate mb-2">Lectura Último Prev.</label>
                            <input type="number" value={form.lectura_ultimo_preventivo} onChange={e => set('lectura_ultimo_preventivo', Number(e.target.value))} className="w-full font-bold" /></div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                        <div><label className="label-slate mb-2">Estado Técnico</label>
                            <select value={form.estado_tecnico_inicial} onChange={e => set('estado_tecnico_inicial', e.target.value)} className="w-full font-bold">
                                <option>Buena</option><option>Regular</option><option>Deteriorada</option><option>Crítica</option>
                            </select></div>
                        <div><label className="label-slate mb-2">Calidad del Dato</label>
                            <select value={form.calidad_dato} onChange={e => set('calidad_dato', e.target.value)} className="w-full font-bold">
                                <option value="confirmado">Confirmado</option><option value="estimado">Estimado</option><option value="no disponible">No disponible</option>
                            </select></div>
                        <div><label className="label-slate mb-2">Prioridad Manual</label>
                            <select value={form.prioridad_manual} onChange={e => set('prioridad_manual', e.target.value)} className="w-full font-bold">
                                <option value="">Sin definir</option><option>Inmediata</option><option>Alta</option><option>Media</option><option>Baja</option>
                            </select></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div><label className="label-slate mb-2">Observación Técnica</label>
                            <textarea value={form.observacion_tecnica} onChange={e => set('observacion_tecnica', e.target.value)} className="w-full font-bold h-24 resize-none" /></div>
                        <div><label className="label-slate mb-2">Recomendación Manual</label>
                            <textarea value={form.recomendacion_manual} onChange={e => set('recomendacion_manual', e.target.value)} className="w-full font-bold h-24 resize-none" /></div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-800">
                        <button onClick={() => setSelectedAsset(null)} className="px-6 py-2 label-slate text-slate-500 hover:text-slate-200 transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="px-8 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg shadow-sky-900/30">
                            Guardar Diagnóstico
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de activos */}
            <div className="table-premium-container">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Identificación Activo</th>
                            <th>Tipo de Unidad</th>
                            <th>Estado Diagnóstico</th>
                            <th>Calificación Técnica</th>
                            <th>Confiabilidad</th>
                            <th className="text-right">Gestión</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando flota...</td></tr>
                        ) : (
                            assets.map((a: any) => {
                                const diag = diagnoses.find((d: any) => d.asset_id === a.id)
                                return (
                                    <tr key={a.id}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-slate-200">{a.placa_principal || '—'}</span>
                                                <span className="text-[10px] text-slate-500 font-bold">{a.codigo_patrimonial}</span>
                                            </div>
                                        </td>
                                        <td><span className="text-slate-400">{a.tipo_unidad}</span></td>
                                        <td>
                                            {diag ? (
                                                <span className="tag-premium-sky">Completado</span>
                                            ) : (
                                                <span className="text-slate-600">Pendiente</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`font-black ${
                                                diag?.estado_tecnico_inicial === 'Buena' ? 'text-emerald-400' :
                                                diag?.estado_tecnico_inicial === 'Regular' ? 'text-amber-400' : 'text-rose-400'
                                            }`}>
                                                {diag?.estado_tecnico_inicial || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`text-[10px] font-black uppercase ${
                                                diag?.calidad_dato === 'confirmado' ? 'text-emerald-400' : 
                                                diag?.calidad_dato === 'estimado' ? 'text-amber-400' : 'text-slate-600'
                                            }`}>
                                                {diag?.calidad_dato || '—'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button 
                                                onClick={() => startDiag(a)} 
                                                className="text-sky-400 hover:text-sky-300 text-[10px] font-black uppercase tracking-tighter"
                                            >
                                                {diag ? '[ Editar ]' : '[ Diagnosticar ]'}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                        {!loading && assets.length === 0 && (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron activos</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {toast && (
                <div className="fixed bottom-12 right-12 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-5 animate-fade-in-up border-l-4 border-emerald-500">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{toast}</span>
                </div>
            )}
        </div>
    )
}
