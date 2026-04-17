import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Legend
} from 'recharts';

export default function DashboardPTAP() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputFecha, setInputFecha] = useState(new Date().toISOString().split('T')[0]);
    const [fecha, setFecha] = useState(inputFecha);

    useEffect(() => {
        setLoading(true);
        api.getPTAPDashboard(fecha)
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [fecha]);

    const KPICard = ({ label, value, unit, icon, color }: any) => (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-md shadow-xl transition-all hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color.bg}`}>
                <span className={`material-symbols-outlined ${color.text} text-2xl`}>{icon}</span>
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
            <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white tracking-tighter">{value || '---'}</div>
                {unit && <div className="text-xs font-bold text-slate-600 uppercase">{unit}</div>}
            </div>
        </div>
    );

    if (loading) return <div className="p-20 text-center text-xs font-black text-slate-500 uppercase animate-pulse">Analizando tendencias operativas...</div>;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Cabecera de Dashboard Ultra-Premium */}
            <div className="bg-slate-900/60 border border-slate-700/50 p-10 rounded-[2.5rem] shadow-premium-2xl backdrop-blur-xl relative overflow-hidden group">
                {/* Efecto de luz de fondo */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] group-hover:bg-sky-500/20 transition-all duration-700"></div>
                
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-sky-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-sky-900/40 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <span className="material-symbols-outlined text-white text-4xl">analytics</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2">Análisis Operativo</h3>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    Sistema Sincronizado
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Periodo de Consulta</span>
                            <div className="flex items-center bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-700/50 shadow-inner min-w-[200px] focus-within:border-sky-500/50 transition-all">
                                <span className="material-symbols-outlined text-sky-500 text-2xl mr-4">calendar_today</span>
                                <input 
                                    type="date" 
                                    value={inputFecha} 
                                    onChange={e => setInputFecha(e.target.value)}
                                    className="bg-transparent border-none text-slate-100 text-sm font-black focus:ring-0 p-0 w-full"
                                />
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setFecha(inputFecha)}
                            className="w-full sm:w-auto mt-auto h-16 px-10 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 shadow-xl shadow-sky-900/30 group/btn"
                        >
                            <span className="material-symbols-outlined text-2xl group-hover/btn:rotate-12 transition-transform">edit_calendar</span>
                            Ver Operación
                        </button>
                    </div>
                </div>

                {/* Línea decorativa inferior */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent"></div>
            </div>

            {/* KPIs del Día */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                    label="Máx Turbiedad" 
                    value={stats.length > 0 ? Math.max(...stats.map(s => s.turb_ing)) : '---'} 
                    unit="NTU" 
                    icon="water_drop" 
                    color={{ bg: 'bg-amber-500/10', text: 'text-amber-400' }}
                />
                <KPICard 
                    label="Promedio Cloro" 
                    value={stats.length > 0 ? (stats.reduce((acc, s) => acc + s.cloro, 0) / stats.length).toFixed(2) : '---'} 
                    unit="mg/L" 
                    icon="sanitizer" 
                    color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400' }}
                />
                <KPICard 
                    label="Caudal Promedio" 
                    value={stats.length > 0 ? (stats.reduce((acc, s) => acc + s.caudal, 0) / stats.length).toFixed(1) : '---'} 
                    unit="L/S" 
                    icon="fluid_med" 
                    color={{ bg: 'bg-sky-500/10', text: 'text-sky-400' }}
                />
                <KPICard 
                    label="Registros Hoy" 
                    value={stats.length} 
                    icon="history" 
                    color={{ bg: 'bg-purple-500/10', text: 'text-purple-400' }}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Gráfico de Turbiedad */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <div className="w-1 h-4 bg-sky-500 rounded-full"></div>
                        Tendencia de Turbiedad (NTU)
                    </h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats}>
                                <defs>
                                    <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="hora" stroke="#475569" fontSize={10} fontWeight="bold" />
                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px' }}
                                    itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="turb_ing" name="Ingreso Crudo" stroke="#f59e0b" fillOpacity={1} fill="url(#colorIng)" strokeWidth={3} />
                                <Area type="monotone" dataKey="turb_sal" name="Salida Agua Tratada" stroke="#10b981" fillOpacity={1} fill="url(#colorSal)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Cloro */}
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                        Estabilidad de Cloro Residual (mg/L)
                    </h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="hora" stroke="#475569" fontSize={10} fontWeight="bold" />
                                <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px' }}
                                    itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                                />
                                <Bar dataKey="cloro" name="Cloro Residual" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* Tabla de Registros del Día */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Bitácora de Mediciones</h4>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stats.length} mediciones registradas hoy</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-950/50">
                            <tr>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase">Hora</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase text-center">T. Ingreso</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase text-center">T. Tratada</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase text-center">Cloro</th>
                                <th className="p-4 text-[9px] font-black text-slate-500 uppercase text-center">Caudal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {stats.map((s, i) => (
                                <tr key={i} className="hover:bg-sky-500/5 transition-colors">
                                    <td className="p-4 font-black text-white text-xs">{s.hora}</td>
                                    <td className="p-4 font-bold text-amber-400 text-xs text-center">{s.turb_ing} NTU</td>
                                    <td className="p-4 font-bold text-emerald-400 text-xs text-center">{s.turb_sal} NTU</td>
                                    <td className="p-4 font-bold text-sky-400 text-xs text-center">{s.cloro} mg/L</td>
                                    <td className="p-4 font-bold text-slate-300 text-xs text-center">{s.caudal} L/S</td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-[10px] font-black text-slate-600 uppercase">No hay registros para esta fecha</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
