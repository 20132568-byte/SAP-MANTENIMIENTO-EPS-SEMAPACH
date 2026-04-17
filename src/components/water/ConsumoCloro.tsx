import { useState } from 'react';

interface ConsumoCloroData {
    hora: string;
    caudal: number;
    rotametroLectura: number;
    dosisReal: number;
    pesoCilindroActual: number;
    pesoCilindroAnterior: number;
}

export default function ConsumoCloro() {
    const [data, setData] = useState<ConsumoCloroData>({
        hora: '08:00',
        caudal: 70,
        rotametroLectura: 32.9,
        dosisReal: 33.0,
        pesoCilindroActual: 850,
        pesoCilindroAnterior: 910
    });

    const calcularConsumo = () => {
        return Math.max(0, data.pesoCilindroAnterior - data.pesoCilindroActual);
    };

    const consumoKg = calcularConsumo();

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm shadow-premium-lg">
            <div className="p-6 border-b border-slate-700/50 bg-slate-950/20">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">gas_meter</span>
                    Control de Consumo de Cloro
                </h4>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Lectura Rotámetro (Kg/h)</label>
                        <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 group focus-within:border-emerald-500/50 transition-all">
                            <input 
                                type="number" 
                                value={data.rotametroLectura}
                                onChange={(e) => setData({...data, rotametroLectura: Number(e.target.value)})}
                                className="flex-1 bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0"
                            />
                            <span className="material-symbols-outlined text-emerald-500/50">speed</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Caudal del Sistema (L/S)</label>
                        <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3">
                            <input 
                                type="number" 
                                value={data.caudal}
                                onChange={(e) => setData({...data, caudal: Number(e.target.value)})}
                                className="flex-1 bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0"
                            />
                            <span className="text-[8px] font-black text-slate-600">L/S</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-3xl">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Control de Peso Cilindro</div>
                        <div className="space-y-6">
                            <div>
                                <div className="text-[7px] font-black text-slate-600 uppercase mb-2">Peso Inicial (Kg)</div>
                                <input 
                                    type="number" 
                                    value={data.pesoCilindroAnterior}
                                    onChange={(e) => setData({...data, pesoCilindroAnterior: Number(e.target.value)})}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-slate-400 focus:ring-1 focus:ring-emerald-500/30"
                                />
                            </div>
                            <div>
                                <div className="text-[7px] font-black text-slate-600 uppercase mb-2">Peso Actual (Kg)</div>
                                <input 
                                    type="number" 
                                    value={data.pesoCilindroActual}
                                    onChange={(e) => setData({...data, pesoCilindroActual: Number(e.target.value)})}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white focus:ring-1 focus:ring-emerald-500/30"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-emerald-500 text-2xl">balance</span>
                        </div>
                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Consumo Calculado</div>
                        <div className="text-4xl font-black text-white tracking-tighter">{consumoKg.toFixed(1)}</div>
                        <div className="text-[8px] font-bold text-emerald-600 uppercase mt-1">Kilogramos Netos</div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-emerald-500/5 border-t border-slate-800">
                <p className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-widest text-center italic flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    Relación teórica: 3.6 Kg de cloro por cada 1 mg/L de dosis a 1000m3
                </p>
            </div>
        </div>
    );
}
