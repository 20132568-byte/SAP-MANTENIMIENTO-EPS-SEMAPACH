import { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, ReferenceLine, LabelList
} from 'recharts';
import CalculadoraDosis from '../components/water/CalculadoraDosis';
import CronogramaSemanal from '../components/water/CronogramaSemanal';
import ControlProceso from '../components/water/ControlProceso';
import ConsumoCloro from '../components/water/ConsumoCloro';

const DISTRITOS = [
    'Chincha Alta', 'Grocio Prado', 'Alto Larán', 'Sunampe',
    'Tambo de Mora', 'Chincha Baja', 'Pueblo Nuevo'
];
const ZONAS = ['Alta', 'Media', 'Baja'];

type TabType = 'captura' | 'estadisticas' | 'consolidado';

export default function MonitoreoAgua() {
    const location = useLocation();
    
    // Determinar qué componente mostrar basado en la URL
    const isOperacion = location.pathname.includes('/operacion');
    const isEstadisticas = location.pathname.includes('/dashboard');
    const isConsolidado = location.pathname.includes('/consolidado');

    // Si estamos en la ruta base /monitoreo-agua, redirigir a la primera pestaña
    if (location.pathname === '/monitoreo-agua' || location.pathname === '/monitoreo-agua/') {
        return <Navigate to="/monitoreo-agua/operacion" replace />;
    }

    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [filtroDistrito, setFiltroDistrito] = useState('Todos');

    const [readings, setReadings] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [showDataEntry, setShowDataEntry] = useState(false);

    const initGrid = () => {
        const grid: any[] = [];
        DISTRITOS.forEach(d => {
            ZONAS.forEach(z => {
                grid.push({ fecha, distrito: d, zona: z, presion: '', continuidad: '' });
            });
        });
        return grid;
    };

    const loadData = async () => {
        setLoading(true);
        setStats(null);
        try {
            const data = await api.getWaterReadings({ fecha });
            const baseGrid = initGrid();
            const merged = baseGrid.map(item => {
                const found = data.find((r: any) => r.distrito === item.distrito && r.zona === item.zona);
                return found ? { ...found } : item;
            });
            setReadings(merged);

            const year = parseInt(fecha.substring(0, 4));
            const month = parseInt(fecha.substring(5, 7));
            const lastDay = new Date(year, month, 0).getDate();

            const mesInicio = `${fecha.substring(0, 7)}-01`;
            const mesFin = `${fecha.substring(0, 7)}-${String(lastDay).padStart(2, '0')}`;

            const dataStats = await api.getWaterStats(mesInicio, mesFin);
            setStats(dataStats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData() }, [fecha]);

    const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

    const handleCellChange = (index: number, field: string, value: string | number) => {
        const next = [...readings];
        next[index][field] = value;
        setReadings(next);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const toSave = readings.filter(r => r.presion !== '' && r.continuidad !== '');
            if (toSave.length === 0) {
                notify('No hay datos válidos para guardar');
                return;
            }
            await api.bulkCreateWaterReadings(toSave);
            notify('Datos guardados correctamente');
            loadData();
        } catch (err: any) {
            notify(err.message || 'Error al guardar datos');
        } finally {
            setSaving(false);
        }
    };

    const filteredReadings = filtroDistrito === 'Todos'
        ? readings
        : readings.filter(r => r.distrito === filtroDistrito);

    return (
        <div className="animate-fade-in-up space-y-6 min-h-screen text-slate-100 p-4 md:p-8">
            {/* CABECERA PRINCIPAL - ESTILO PREMIUM */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-900/40">
                            <span className="material-symbols-outlined text-white text-3xl">water_drop</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Monitoreo de Agua</h2>
                            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mt-1">Control de Continuidad y Presiones</p>
                        </div>
                    </div>


                </div>
            </div>

            {/* SELECCIÓN DE PERIODO */}
            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl flex flex-wrap items-center justify-between gap-8 mb-12">
                <div className="flex flex-wrap items-center gap-10">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Periodo de Análisis</span>
                        <div className="flex items-center bg-slate-900/50 px-6 py-3.5 rounded-2xl border border-slate-700 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-slate-900">
                            <span className="material-symbols-outlined text-sky-500 text-[22px] flex-shrink-0">calendar_month</span>
                            <div className="h-6 w-px bg-slate-700 mx-4"></div>
                            {isOperacion ? (
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-slate-100 text-xs font-black focus:ring-0 p-0 placeholder:text-slate-600 appearance-none"
                                />
                            ) : (
                                <input
                                    type="month"
                                    value={fecha.substring(0, 7)}
                                    onChange={e => setFecha(`${e.target.value}-01`)}
                                    className="flex-1 bg-transparent border-none text-slate-100 text-xs font-black focus:ring-0 p-0 placeholder:text-slate-600 appearance-none"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {isOperacion && (
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowDataEntry(!showDataEntry)}
                            className={`${showDataEntry ? 'bg-slate-700 text-slate-100' : 'bg-sky-600 text-white'} text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-3xl transition-all flex items-center gap-3 shadow-xl active:scale-95`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{showDataEntry ? 'visibility' : 'add_task'}</span>
                            {showDataEntry ? 'Ver Gráficos' : 'Ingresar Datos'}
                        </button>
                        {showDataEntry && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest px-10 py-5 rounded-3xl transition-all flex items-center gap-3 shadow-xl shadow-emerald-900/40 disabled:opacity-50 hover:-translate-y-1 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">{saving ? 'sync' : 'cloud_done'}</span>
                                {saving ? 'Sincronizando...' : 'Guardar Cambios'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* CONTENIDO DINÁMICO SEGÚN RUTA */}
            <div className="space-y-12">
                {/* 1. SECCIÓN OPERACIÓN */}
                {isOperacion && (
                    <>
                        {!showDataEntry ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
                                {/* Gráfico de Presión Diaria */}
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-8 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-sky-500">water_drop</span>
                                        Presión Media Hoy (MCA)
                                    </h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={DISTRITOS.map(d => ({
                                                distrito: d,
                                                avg_presion: readings.filter(r => r.distrito === d).reduce((acc, curr) => acc + (parseFloat(curr.presion) || 0), 0) / (readings.filter(r => r.distrito === d).length || 1)
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="distrito" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" angle={-45} textAnchor="end" height={60} />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip
                                                    cursor={{ fill: '#1e293b' }}
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }}
                                                />
                                                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" />
                                                <Bar dataKey="avg_presion" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Gráfico de Continuidad Diaria */}
                                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-8 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-emerald-500">schedule</span>
                                        Continuidad Media Hoy (HRS)
                                    </h3>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={DISTRITOS.map(d => ({
                                                distrito: d,
                                                avg_continuidad: readings.filter(r => r.distrito === d).reduce((acc, curr) => acc + (parseFloat(curr.continuidad) || 0), 0) / (readings.filter(r => r.distrito === d).length || 1)
                                            }))}>
                                                <defs>
                                                    <linearGradient id="gradDaily" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="distrito" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" angle={-45} textAnchor="end" height={60} />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                                <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="5 5" />
                                                <Area type="monotone" dataKey="avg_continuidad" stroke="#10b981" fill="url(#gradDaily)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-xl animate-fade-in-up">
                                <div className="p-8 border-b border-slate-700 bg-slate-950/20 flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                                        Ingreso de Datos Operativos
                                    </h3>
                                    <select
                                        value={filtroDistrito}
                                        onChange={e => setFiltroDistrito(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-slate-100 text-[11px] font-black rounded-xl px-4 py-2 focus:ring-sky-500"
                                    >
                                        <option value="Todos">Todos los Distritos</option>
                                        {DISTRITOS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-950/20 border-b border-slate-700">
                                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector / Zona</th>
                                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Presión (MCA)</th>
                                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Continuidad (Hrs)</th>
                                                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {filteredReadings.map((r, idx) => {
                                                const globalIdx = readings.findIndex(item => item.distrito === r.distrito && item.zona === r.zona);
                                                return (
                                                    <tr key={`${r.distrito}-${r.zona}`} className="hover:bg-slate-800/20 transition-colors">
                                                        <td className="p-6">
                                                            <div className="font-black text-slate-100 text-sm tracking-tight uppercase">{r.distrito}</div>
                                                            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">Zona {r.zona}</div>
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <input
                                                                type="number"
                                                                value={r.presion}
                                                                onChange={e => handleCellChange(globalIdx, 'presion', e.target.value)}
                                                                className={`w-24 text-center text-sm font-mono font-black bg-slate-900 border border-slate-700 rounded-xl py-2 focus:ring-sky-500 ${parseFloat(r.presion) < 10 ? 'text-rose-400' : 'text-slate-100'}`}
                                                            />
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <input
                                                                type="number"
                                                                value={r.continuidad}
                                                                onChange={e => handleCellChange(globalIdx, 'continuidad', e.target.value)}
                                                                className={`w-24 text-center text-sm font-mono font-black bg-slate-900 border border-slate-700 rounded-xl py-2 focus:ring-sky-500 ${parseFloat(r.continuidad) < 12 ? 'text-amber-400' : 'text-slate-100'}`}
                                                            />
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <div className="flex justify-center gap-2">
                                                                <div className={`w-3 h-3 rounded-full ${parseFloat(r.presion) < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                                                <div className={`w-3 h-3 rounded-full ${parseFloat(r.continuidad) < 12 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN DE REFERENCIA Y PARÁMETROS PTAP */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-12 animate-fade-in-up">
                            <ControlProceso />
                            <ConsumoCloro />
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8 animate-fade-in-up">
                            <CalculadoraDosis />
                            <CronogramaSemanal />
                        </div>
                    </>
                )}

                {/* 2. SECCIÓN DASHBOARD */}
                {isEstadisticas && (
                    <div className="animate-fade-in-up space-y-12">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl">
                                <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-1">Presión Media</span>
                                <h3 className="text-4xl font-black text-slate-100 tracking-tighter">{stats?.resumenGeneral?.avg_presion?.toFixed(2) || '---'}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Metros Columna Agua</p>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Continuidad Media</span>
                                <h3 className="text-4xl font-black text-slate-100 tracking-tighter">{stats?.resumenGeneral?.avg_continuidad?.toFixed(2) || '---'}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Horas / Día Promedio</p>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl">
                                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Alertas Presión</span>
                                <h3 className="text-4xl font-black text-rose-500 tracking-tighter">{stats?.resumenGeneral?.criticos_presion || '0'}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Sectores bajo 10 MCA</p>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-premium-xl">
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Baja Continuidad</span>
                                <h3 className="text-4xl font-black text-amber-500 tracking-tighter">{stats?.resumenGeneral?.criticos_continuidad || '0'}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Sectores bajo 12 HRS</p>
                            </div>
                        </div>

                        {/* Gráficos Mensuales */}
                        <div className="grid grid-cols-1 gap-12">
                            <div className="bg-slate-800/50 border border-slate-700 p-10 rounded-3xl shadow-premium-xl">
                                <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-10">Análisis de Presión Mensual</h3>
                                <div className="h-[500px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.porDistrito || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="distrito" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} fontWeight="900" />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                            <Bar dataKey="avg_presion" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 p-10 rounded-3xl shadow-premium-xl">
                                <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-10">Curva de Continuidad Mensual</h3>
                                <div className="h-[500px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.porDistrito || []}>
                                            <defs>
                                                <linearGradient id="gradDash" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="distrito" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} fontWeight="900" />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} fontWeight="900" />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} />
                                            <Area type="monotone" dataKey="avg_continuidad" stroke="#10b981" fill="url(#gradDash)" strokeWidth={4} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. SECCIÓN CONSOLIDADO */}
                {isConsolidado && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-xl animate-fade-in-up">
                        <div className="p-8 border-b border-slate-700 bg-slate-950/20 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                <span className="material-symbols-outlined text-sky-500">table_chart</span>
                                Reporte Ejecutivo de Gestión
                            </h3>
                            <button className="bg-slate-900 border border-slate-700 text-slate-100 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all">
                                Exportar Reporte
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950/20 border-b border-slate-700">
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Demarcación</th>
                                        <th className="p-6 text-[10px] font-black text-sky-400 uppercase tracking-widest text-center">P. Media</th>
                                        <th className="p-6 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">C. Media</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado de Red</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {(stats?.porDistrito || []).map((d: any) => (
                                        <tr key={d.distrito} className="hover:bg-slate-800/20 transition-all">
                                            <td className="p-6">
                                                <span className="text-sm font-black text-slate-100 uppercase">{d.distrito}</span>
                                            </td>
                                            <td className="p-6 text-center text-sm font-mono font-black text-sky-400">
                                                {d.avg_presion.toFixed(2)}
                                            </td>
                                            <td className="p-6 text-center text-sm font-mono font-black text-emerald-400">
                                                {d.avg_continuidad.toFixed(2)}
                                            </td>
                                            <td className="p-6 text-center">
                                                {d.avg_presion >= 10 && d.avg_continuidad >= 12 ? (
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black uppercase border border-emerald-500/20">Óptimo</span>
                                                ) : d.avg_presion < 10 && d.avg_continuidad < 8 ? (
                                                    <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[9px] font-black uppercase border border-rose-500/20">Crítico</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black uppercase border border-amber-500/20">Alerta</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* TOAST SYSTEM */}
            {toast && (
                <div className="fixed bottom-12 right-12 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-5 animate-fade-in-up border-l-4 border-sky-500">
                    <span className="material-symbols-outlined text-sky-500">water_drop</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{toast}</span>
                </div>
            )}
        </div>
    );
}
