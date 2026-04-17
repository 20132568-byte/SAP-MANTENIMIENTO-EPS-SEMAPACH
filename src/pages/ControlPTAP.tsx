import { useState } from 'react';
import ControlProceso from '../components/ptap/ControlProceso';
import ConsumoCloro from '../components/ptap/ConsumoCloro';
import CalculadoraDosis from '../components/ptap/CalculadoraDosis';
import CronogramaSemanal from '../components/ptap/CronogramaSemanal';

import DashboardPTAP from '../components/ptap/DashboardPTAP';

type TabType = 'proceso' | 'dashboard' | 'cloro' | 'dosis' | 'cronograma';

export default function ControlPTAP() {
    const [activeTab, setActiveTab] = useState<TabType>('proceso');

    const tabs = [
        { id: 'proceso', label: 'Control Fisicoquímico', icon: 'biotech' },
        { id: 'dashboard', label: 'Dashboard Diario', icon: 'analytics' },
        { id: 'cloro', label: 'Consumo Cloro', icon: 'gas_meter' },
        { id: 'dosis', label: 'Calculadora', icon: 'calculate' },
        { id: 'cronograma', label: 'Cronograma', icon: 'event_note' },
    ] as const;

    return (
        <div className="animate-fade-in-up space-y-8 min-h-screen text-slate-100 p-4 md:p-8">
            {/* CABECERA PRINCIPAL */}
            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl mb-10 shadow-premium-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
                        <span className="material-symbols-outlined text-white text-4xl">precision_manufacturing</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Control PTAP Portachuelo</h2>
                        <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mt-1 italic">Planta de Tratamiento de Agua Potable — EPS SEMAPACH</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Estado: Operativo</span>
                    </div>
                    <div className="px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                        <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Caudal: 70 L/S</span>
                    </div>
                </div>
            </div>

            {/* NAVEGACIÓN DE PESTAÑAS */}
            <div className="bg-slate-800/50 border border-slate-700 p-2 rounded-3xl shadow-premium-xl">
                <div className="flex flex-wrap gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENIDO DE PESTAÑAS */}
            <div className="space-y-8">
                {activeTab === 'proceso' && (
                    <div className="animate-fade-in-up">
                        <ControlProceso />
                    </div>
                )}

                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in-up">
                        <DashboardPTAP />
                    </div>
                )}

                {activeTab === 'cloro' && (
                    <div className="animate-fade-in-up">
                        <ConsumoCloro />
                    </div>
                )}

                {activeTab === 'dosis' && (
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <CalculadoraDosis />
                            <CronogramaSemanal />
                        </div>
                    </div>
                )}

                {activeTab === 'cronograma' && (
                    <div className="animate-fade-in-up">
                        <CronogramaSemanal />
                    </div>
                )}
            </div>

            {/* PANEL INFORMATIVO */}
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl shadow-premium-xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    Parámetros de Referencia
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">pH Óptimo</div>
                        <div className="text-lg font-black text-slate-200">6.5 - 8.5</div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cloro Residual</div>
                        <div className="text-lg font-black text-slate-200">0.5 - 2.0 mg/L</div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Turbiedad Máx</div>
                        <div className="text-lg font-black text-slate-200">5.0 NTU</div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Caudal Nominal</div>
                        <div className="text-lg font-black text-slate-200">60-80 L/S</div>
                    </div>
                </div>
            </div>
        </div>
    );
}