import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Catalogos() {
    const [tipos, setTipos] = useState<string[]>([])
    const [selectedTipo, setSelectedTipo] = useState('')
    const [items, setItems] = useState<any[]>([])
    const [newValue, setNewValue] = useState('')
    const [toast, setToast] = useState<string | null>(null)

    useEffect(() => {
        api.getCatalogTypes().then(t => { setTipos(t); if (t.length > 0) setSelectedTipo(t[0]) })
    }, [])

    const loadItems = () => { if (selectedTipo) api.getCatalog(selectedTipo).then(setItems) }
    useEffect(() => { loadItems() }, [selectedTipo])

    const handleAdd = async () => {
        if (!newValue.trim()) return
        try {
            await api.createCatalogItem({ tipo: selectedTipo, valor: newValue.trim() })
            setNewValue(''); loadItems()
            setToast('Valor agregado'); setTimeout(() => setToast(null), 2000)
        } catch (e: any) { setToast(e.message) }
    }

    const tipoLabels: Record<string, string> = {
        tipo_unidad: 'Tipos de Unidad', estado_unidad: 'Estados', criticidad: 'Criticidades',
        forma_control: 'Formas de Control', condicion_tecnica: 'Condiciones Técnicas',
        clasificacion_falla: 'Clasificaciones', sistema_afectado: 'Sistemas Afectados',
        severidad: 'Severidades', causa_probable: 'Causas Probables', tipo_evento: 'Tipos de Evento',
        tipo_preventivo: 'Tipos Preventivo', estado_preventivo: 'Estados Preventivo',
    }

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="bg-slate-800/50 border border-slate-700 p-responsive rounded-3xl mb-10 shadow-premium-xl flex items-center gap-6">
                <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-sky-900/40">
                    <span className="material-symbols-outlined text-white text-3xl">list_alt</span>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Catálogos</h2>
                    <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mt-1 italic">Configuración Técnica de Parámetros Globales</p>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-80 flex-shrink-0 bg-slate-800/50 border border-slate-700 rounded-3xl shadow-premium-xl !p-0 overflow-hidden">
                    <div className="p-6 border-b border-slate-700 bg-slate-900/50">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <span className="material-symbols-outlined text-sm">category</span> Categorías
                        </span>
                    </div>
                    <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto no-scrollbar">
                        {tipos.map(t => (
                            <button key={t} onClick={() => setSelectedTipo(t)}
                                className={`w-full text-left px-8 py-5 text-xs font-black uppercase tracking-tight transition-all relative group ${
                                    selectedTipo === t 
                                        ? 'text-sky-400 bg-sky-900/20' 
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                }`}>
                                {selectedTipo === t && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-sky-500 rounded-r-full shadow-lg shadow-sky-500/40"></div>}
                                {tipoLabels[t] || t}
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-slate-500">chevron_right</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-3xl shadow-premium-xl !p-0 overflow-hidden">
                    <div className="p-8 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                        <div>
                            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">{tipoLabels[selectedTipo] || selectedTipo}</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Diccionario de Valores Permitidos</p>
                        </div>
                        <span className="px-5 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">{items.length} Registros Activos</span>
                    </div>
                    <div className="p-8 bg-slate-950/20 border-b border-slate-700 flex gap-4">
                        <div className="flex items-center bg-slate-900/50 px-6 py-3.5 rounded-2xl border border-slate-700 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:bg-slate-900 flex-1">
                            <span className="material-symbols-outlined text-sky-400 text-[22px] flex-shrink-0">add</span>
                            <div className="h-6 w-px bg-slate-700 mx-4"></div>
                            <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                className="flex-1 bg-transparent border-none text-xs font-black text-slate-100 focus:ring-0 p-0 placeholder:text-slate-600" 
                                placeholder="Escriba un nuevo valor para agregar..." />
                        </div>
                        <button onClick={handleAdd} className="px-10 py-4 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-sky-900/40 hover:shadow-sky-300 active:scale-95">
                            Agregar
                        </button>
                    </div>
                    <div className="divide-y divide-slate-700 max-h-[500px] overflow-y-auto no-scrollbar bg-slate-950/10">
                        {items.length === 0 ? (
                            <div className="p-20 text-center flex flex-col items-center">
                                <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">inventory_2</span>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Sin valores configurados</p>
                            </div>
                        ) : items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between px-8 py-5 hover:bg-slate-800 transition-all group border-b border-slate-700/30 last:border-none">
                                <span className="text-sm font-black text-slate-300 tracking-tight">{item.valor}</span>
                                <button onClick={() => { if(confirm('¿Eliminar este valor?')) api.deleteCatalogItem(item.id).then(loadItems) }} 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                                </button>
                            </div>
                        ))}
                    </div>
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
