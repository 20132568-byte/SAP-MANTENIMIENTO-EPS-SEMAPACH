import { useState } from 'react';

const DOSIS_TABLE = [
    { ntu: 0, d60: 12.2, d70: 14.2, d80: 16.3, r60: 28.2, r70: 32.9, r80: 37.6 },
    { ntu: 25, d60: 12.2, d70: 14.2, d80: 16.3, r60: 28.2, r70: 32.9, r80: 37.6 },
    { ntu: 100, d60: 14.1, d70: 16.5, d80: 18.8, r60: 32.7, r70: 38.2, r80: 43.6 },
    { ntu: 200, d60: 17.0, d70: 19.9, d80: 22.7, r60: 39.3, r70: 45.9, r80: 52.4 },
    { ntu: 300, d60: 19.7, d70: 23.0, d80: 26.3, r60: 45.9, r70: 53.3, r80: 61.0 },
    { ntu: 400, d60: 22.5, d70: 26.2, d80: 30.0, r60: 52.6, r70: 60.6, r80: 69.3 },
    { ntu: 500, d60: 25.3, d70: 29.5, d80: 33.7, r60: 59.2, r70: 68.3, r80: 78.1 },
    { ntu: 600, d60: 28.1, d70: 32.7, d80: 37.4, r60: 65.7, r70: 75.6, r80: 86.4 },
    { ntu: 700, d60: 30.8, d70: 35.9, d80: 41.0, r60: 72.3, r70: 82.9, r80: 94.7 },
    { ntu: 800, d60: 33.6, d70: 39.2, d80: 44.8, r60: 78.9, r70: 90.7, r80: 103.6 },
    { ntu: 900, d60: 36.3, d70: 42.4, d80: 48.5, r60: 85.4, r70: 98.0, r80: 112.0 },
    { ntu: 1000, d60: 39.2, d70: 45.7, d80: 52.2, r60: 92.3, r70: 105.7, r80: 120.7 },
    { ntu: 1100, d60: 42.0, d70: 48.9, d80: 55.9, r60: 98.8, r70: 113.0, r80: 129.1 },
    { ntu: 1200, d60: 44.8, d70: 52.0, d80: 59.5, r60: 105.3, r70: 120.3, r80: 137.5 },
    { ntu: 1300, d60: 47.7, d70: 55.4, d80: 63.3, r60: 112.3, r70: 128.1, r80: 146.4 },
    { ntu: 1400, d60: 50.4, d70: 58.6, d80: 66.9, r60: 118.7, r70: 135.4, r80: 154.7 },
    { ntu: 1500, d60: 53.1, d70: 61.7, d80: 70.5, r60: 125.0, r70: 142.7, r80: 163.1 },
];

export default function CalculadoraDosis() {
    const [ntu, setNtu] = useState<number>(0);
    const [caudal, setCaudal] = useState<number>(60);
    
    const findDosis = () => {
        const row = DOSIS_TABLE.reduce((prev, curr) => {
            return (Math.abs(curr.ntu - ntu) < Math.abs(prev.ntu - ntu) ? curr : prev);
        });
        
        if (caudal === 60) return { dosis: row.d60, rotametro: row.r60 };
        if (caudal === 70) return { dosis: row.d70, rotametro: row.r70 };
        return { dosis: row.d80, rotametro: row.r80 };
    };

    const result = findDosis();

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-sm">
            <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">calculate</span>
                Calculadora de Dosis (Referencia Excel)
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Turbiedad (NTU)</label>
                    <input 
                        type="number" 
                        value={ntu}
                        onChange={(e) => setNtu(Number(e.target.value))}
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-white focus:ring-1 focus:ring-sky-500/50 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Caudal (L/S)</label>
                    <select 
                        value={caudal}
                        onChange={(e) => setCaudal(Number(e.target.value))}
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-white focus:ring-1 focus:ring-sky-500/50 transition-all"
                    >
                        <option value={60}>60 L/S</option>
                        <option value={70}>70 L/S</option>
                        <option value={80}>80 L/S</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1 bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl">
                    <div className="text-[8px] font-black text-sky-400 uppercase tracking-widest mb-1">Dosis mg/L</div>
                    <div className="text-xl font-black text-white">{result.dosis.toFixed(1)}</div>
                </div>
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                    <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Rotámetro Kg/h</div>
                    <div className="text-xl font-black text-white">{result.rotametro.toFixed(1)}</div>
                </div>
            </div>
        </div>
    );
}
