import { useState } from 'react';

// Tipado basado en el formato de la hoja "CONTROL DE PROCESO- ORIGINAL"
interface ProcesoLectura {
    hora: string;
    caudal: number;
    dosis: number;
    apertura: number;
    ingreso: {
        turbiedad: number;
        conductividad: number;
        ph: number;
    };
    tratada: {
        turbiedad: number;
        ph: number;
        cloroResidual: number;
    };
}

const PARAMETROS_LIMITES = {
    ph: { min: 6.5, max: 8.5 },
    cloro: { min: 0.5, max: 2.0 },
    turbiedad: { max: 5.0 }
};

export default function ControlProceso() {
    const [lectura, setLectura] = useState<ProcesoLectura>({
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        caudal: 70,
        dosis: 33.1,
        apertura: 14.2,
        ingreso: { turbiedad: 27.2, conductividad: 348, ph: 8.14 },
        tratada: { turbiedad: 4.3, ph: 7.8, cloroResidual: 2.43 }
    });

    const getStatusColor = (val: number, type: keyof typeof PARAMETROS_LIMITES) => {
        const limits = PARAMETROS_LIMITES[type] as any;
        if (limits.max !== undefined && val > limits.max) return 'text-rose-400';
        if (limits.min !== undefined && val < limits.min) return 'text-amber-400';
        return 'text-emerald-400';
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm shadow-premium-lg">
            <div className="p-6 border-b border-slate-700/50 bg-slate-950/20 flex items-center justify-between">
                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">biotech</span>
                    Control Fisicoquímico (PTAP Portachuelo)
                </h4>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Planta: Operativa</span>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* ETAPA 1: AGUA DE INGRESO */}
                <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                        Agua de Ingreso (Cruda)
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Turbiedad</div>
                            <input 
                                type="number" 
                                value={lectura.ingreso.turbiedad}
                                onChange={(e) => setLectura({...lectura, ingreso: {...lectura.ingreso, turbiedad: Number(e.target.value)}})}
                                className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0"
                            />
                            <span className="text-[8px] font-bold text-slate-600 absolute bottom-2 right-4">NTU</span>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Conductividad</div>
                            <input 
                                type="number" 
                                value={lectura.ingreso.conductividad}
                                onChange={(e) => setLectura({...lectura, ingreso: {...lectura.ingreso, conductividad: Number(e.target.value)}})}
                                className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0"
                            />
                            <span className="text-[8px] font-bold text-slate-600 absolute bottom-2 right-4">uS/cm</span>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">pH</div>
                            <input 
                                type="number" 
                                value={lectura.ingreso.ph}
                                onChange={(e) => setLectura({...lectura, ingreso: {...lectura.ingreso, ph: Number(e.target.value)}})}
                                className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0"
                            />
                            <span className="text-[8px] font-bold text-slate-600 absolute bottom-2 right-4">Unit.</span>
                        </div>
                    </div>
                </div>

                {/* ETAPA 2: AGUA TRATADA */}
                <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        Agua Tratada (Salida)
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Turbiedad Final</div>
                            <input 
                                type="number" 
                                value={lectura.tratada.turbiedad}
                                onChange={(e) => setLectura({...lectura, tratada: {...lectura.tratada, turbiedad: Number(e.target.value)}})}
                                className={`w-full bg-transparent border-none p-0 text-xl font-black focus:ring-0 ${getStatusColor(lectura.tratada.turbiedad, 'turbiedad')}`}
                            />
                            <span className="text-[8px] font-bold text-slate-600 absolute bottom-2 right-4">NTU</span>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">pH Salida</div>
                            <input 
                                type="number" 
                                value={lectura.tratada.ph}
                                onChange={(e) => setLectura({...lectura, tratada: {...lectura.tratada, ph: Number(e.target.value)}})}
                                className={`w-full bg-transparent border-none p-0 text-xl font-black focus:ring-0 ${getStatusColor(lectura.tratada.ph, 'ph')}`}
                            />
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl relative overflow-hidden group">
                            <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Cloro Residual</div>
                            <input 
                                type="number" 
                                value={lectura.tratada.cloroResidual}
                                onChange={(e) => setLectura({...lectura, tratada: {...lectura.tratada, cloroResidual: Number(e.target.value)}})}
                                className={`w-full bg-transparent border-none p-0 text-xl font-black focus:ring-0 ${getStatusColor(lectura.tratada.cloroResidual, 'cloro')}`}
                            />
                            <span className="text-[8px] font-bold text-emerald-600 absolute bottom-2 right-4">mg/L</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-between items-center px-8">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-600 text-[14px]">history</span>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Última actualización: {lectura.hora}</span>
                </div>
                <button className="text-[9px] font-black text-sky-400 uppercase tracking-widest hover:text-sky-300 transition-colors">
                    Ver Historial Completo
                </button>
            </div>
        </div>
    );
}
