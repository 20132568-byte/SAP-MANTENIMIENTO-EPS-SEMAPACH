import { useState, useEffect } from 'react';
import { api } from '../../api/client';

// Tipado exhaustivo basado en el Excel de Portachuelo
interface ProcesoLectura {
    hora: string;
    caudal: number;
    dosis: {
        aluminio: number;
        anionico: number;
    };
    apertura: {
        aluminio: number;
        anionico: number;
    };
    ingreso: {
        turbiedad: number;
        conductividad: number;
        color: number;
        alcalinidad: number;
        ph: number;
        aluminio: number;
        dureza: number;
        ovl: number;
    };
    decantador: {
        turbiedad: number;
        color: number;
        ph: number;
    };
    filtros: {
        ingreso: { turbiedad: number; color: number; ph: number; };
        salida: { turbiedad: number; color: number; ph: number; };
    };
    tratada: {
        turbiedad: number;
        conductividad: number;
        color: number;
        ph: number;
        aluminioResidual: number;
        cloroResidual: number;
        dureza: number;
        ovl: number;
    };
}

const PARAMETROS_LIMITES = {
    ph: { min: 6.5, max: 8.5 },
    cloro: { min: 0.5, max: 2.0 },
    turbiedad: { max: 5.0 },
    color: { max: 15 },
    aluminio: { max: 0.2 }
};

export default function ControlProceso() {
    const [lectura, setLectura] = useState<ProcesoLectura>({
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        caudal: 70,
        dosis: { aluminio: 33.1, anionico: 0.5 },
        apertura: { aluminio: 14.2, anionico: 5.0 },
        ingreso: { turbiedad: 27.2, conductividad: 348, color: 45, alcalinidad: 120, ph: 8.14, aluminio: 0.5, dureza: 240, ovl: 0.1 },
        decantador: { turbiedad: 12.5, color: 20, ph: 7.9 },
        filtros: {
            ingreso: { turbiedad: 10.2, color: 15, ph: 7.85 },
            salida: { turbiedad: 4.8, color: 8, ph: 7.8 }
        },
        tratada: { turbiedad: 4.3, conductividad: 350, color: 5, ph: 7.8, aluminioResidual: 0.12, cloroResidual: 1.2, dureza: 235, ovl: 0.05 }
    });

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDailyData = async () => {
            try {
                setLoading(true);
                // Fetch daily readings for selected date
                const res = await api.getPTAPDaily(selectedDate);
                // If there are readings, grab the latest one (or first one depending on how we handle daily logs)
                // Assuming operator wants to see the last reading of that day, or we could handle multiple hours. 
                // Let's populate with the latest reading if it exists.
                if (res && res.length > 0) {
                    const lastReading = res[res.length - 1]; // Toma la última toma del día
                    setLectura({
                        hora: lastReading.hora,
                        caudal: lastReading.caudal,
                        dosis: { aluminio: lastReading.dosis_aluminio, anionico: lastReading.dosis_anionico },
                        apertura: { aluminio: lastReading.apertura_aluminio, anionico: lastReading.apertura_anionico },
                        ingreso: {
                            turbiedad: lastReading.ingreso_turbiedad, conductividad: lastReading.ingreso_conductividad,
                            color: lastReading.ingreso_color, alcalinidad: lastReading.ingreso_alcalinidad,
                            ph: lastReading.ingreso_ph, aluminio: lastReading.ingreso_aluminio,
                            dureza: lastReading.ingreso_dureza, ovl: lastReading.ingreso_ovl
                        },
                        decantador: { turbiedad: lastReading.decantador_turbiedad, color: lastReading.decantador_color, ph: lastReading.decantador_ph },
                        filtros: {
                            ingreso: { turbiedad: lastReading.filtros_ing_turb, color: lastReading.filtros_ing_col, ph: lastReading.filtros_ing_ph },
                            salida: { turbiedad: lastReading.filtros_sal_turb, color: lastReading.filtros_sal_col, ph: lastReading.filtros_sal_ph }
                        },
                        tratada: {
                            turbiedad: lastReading.tratada_turbiedad, conductividad: lastReading.tratada_conductividad,
                            color: lastReading.tratada_color, ph: lastReading.tratada_ph,
                            aluminioResidual: lastReading.tratada_aluminioReal, cloroResidual: lastReading.tratada_cloro,
                            dureza: lastReading.tratada_dureza, ovl: lastReading.tratada_ovl
                        }
                    });
                } else {
                    // Reset to defaults or keep last known state with current hour
                    setLectura(prev => ({
                        ...prev,
                        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }));
                }
            } catch (error) {
                console.error("Error fetching daily data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDailyData();
    }, [selectedDate]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const dataToSave = {
                ...lectura,
                fecha: selectedDate, // Usa la fecha seleccionada en vez de forzar hoy
                operador: 'Operador Logueado'
            };
            await api.savePTAPReading(dataToSave);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
            alert('Error al guardar el registro');
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (val: number, type: keyof typeof PARAMETROS_LIMITES) => {
        const limits = PARAMETROS_LIMITES[type] as any;
        if (!limits) return 'text-white';
        if (limits.max !== undefined && val > limits.max) return 'text-rose-400';
        if (limits.min !== undefined && val < limits.min) return 'text-amber-400';
        return 'text-emerald-400';
    };

    const InputField = ({ label, value, unit, type, onChange }: any) => {
        const [localValue, setLocalValue] = useState(value.toFixed(2));

        useEffect(() => {
            setLocalValue(value.toFixed(2));
        }, [value]);

        const handleChange = (val: string) => {
            setLocalValue(val);
            const num = parseFloat(val);
            if (!isNaN(num)) {
                const rounded = Math.round(num * 100) / 100;
                onChange(rounded);
            }
        };

        const handleBlur = () => {
            const num = parseFloat(localValue);
            if (!isNaN(num)) {
                setLocalValue(num.toFixed(2));
            }
        };

        return (
            <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-2xl relative overflow-hidden group hover:border-sky-500/30 transition-all duration-300">
                <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5 opacity-80">{label}</div>
                <div className="flex items-center gap-1.5">
                    <input
                        type="number"
                        step="0.01"
                        value={localValue}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleBlur}
                        className={`w-full bg-transparent border-none p-0 text-lg font-black focus:ring-0 leading-none ${type ? getStatusColor(value, type) : 'text-slate-100'}`}
                    />
                    {unit && <span className="text-[8px] font-bold text-slate-600 uppercase italic flex-shrink-0">{unit}</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="pb-32 px-4 md:px-0"> {/* Padding inferior para navegación */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
                    {/* Header Refinado y Responsivo */}
                    <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-900/40 flex-shrink-0">
                                <span className="material-symbols-outlined text-white text-2xl">water_ec</span>
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white uppercase tracking-tight">PTAP Portachuelo</h4>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <p className="text-[9px] font-bold text-sky-400 uppercase tracking-[0.15em]">Monitoreo Operativo en Tiempo Real</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                            <div className="bg-slate-800/50 border border-white/5 px-4 py-2.5 rounded-2xl flex flex-col min-w-[140px]">
                                <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">Fecha</label>
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent border-none text-white text-xs font-black focus:ring-0 p-0"
                                />
                            </div>
                            <div className="bg-slate-800/50 border border-white/5 px-4 py-2.5 rounded-2xl hidden lg:flex flex-col min-w-[120px]">
                                <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Caudal L/S</div>
                                <div className="text-sm font-black text-white">{lectura.caudal.toFixed(1)}</div>
                            </div>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className={`${success ? 'bg-emerald-600' : 'bg-sky-600'} text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 flex-1 md:flex-none justify-center`}
                            >
                                {loading ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span> : 
                                 <span className="material-symbols-outlined text-sm">{success ? 'done' : 'send'}</span>}
                                {saving ? '...' : success ? 'OK' : 'Enviar Datos'}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-10">
                        {/* SECCIÓN: DOSIFICACIÓN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h5 className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                    <div className="w-1 h-3 bg-amber-500 rounded-full"></div>
                                    Dosificación (mg/L)
                                </h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Aluminio" value={lectura.dosis.aluminio} unit="mg/L" onChange={(v:any) => setLectura({...lectura, dosis: {...lectura.dosis, aluminio: v}})} />
                                    <InputField label="Aniónico" value={lectura.dosis.anionico} unit="mg/L" onChange={(v:any) => setLectura({...lectura, dosis: {...lectura.dosis, anionico: v}})} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h5 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                    <div className="w-1 h-3 bg-amber-400 rounded-full opacity-60"></div>
                                    Apertura (%)
                                </h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Aluminio %" value={lectura.apertura.aluminio} unit="%" onChange={(v:any) => setLectura({...lectura, apertura: {...lectura.apertura, aluminio: v}})} />
                                    <InputField label="Aniónico %" value={lectura.apertura.anionico} unit="%" onChange={(v:any) => setLectura({...lectura, apertura: {...lectura.apertura, anionico: v}})} />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN: AGUA DE INGRESO */}
                        <div className="space-y-4">
                            <h5 className="text-[9px] font-black text-sky-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                <div className="w-1 h-3 bg-sky-500 rounded-full"></div>
                                Caracterización Agua Cruda
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                <InputField label="Turbiedad" value={lectura.ingreso.turbiedad} unit="NTU" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, turbiedad: v}})} />
                                <InputField label="Conduct." value={lectura.ingreso.conductividad} unit="uS" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, conductividad: v}})} />
                                <InputField label="Color" value={lectura.ingreso.color} unit="UPC" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, color: v}})} />
                                <InputField label="Alcal." value={lectura.ingreso.alcalinidad} unit="mg/L" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, alcalinidad: v}})} />
                                <InputField label="pH" value={lectura.ingreso.ph} unit="PH" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, ph: v}})} />
                                <InputField label="Aluminio" value={lectura.ingreso.aluminio} unit="mg/L" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, aluminio: v}})} />
                                <InputField label="Dureza" value={lectura.ingreso.dureza} unit="mg/L" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, dureza: v}})} />
                                <InputField label="OVL" value={lectura.ingreso.ovl} unit="uL" onChange={(v:any) => setLectura({...lectura, ingreso: {...lectura.ingreso, ovl: v}})} />
                            </div>
                        </div>

                        {/* SECCIÓN: PROCESO INTERMEDIO */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                     <h5 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest pl-2 border-l-2 border-indigo-500">Decantador</h5>
                                     <span className="material-symbols-outlined text-indigo-500/40 text-sm">waves</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <InputField label="Turb." value={lectura.decantador.turbiedad} unit="NTU" onChange={(v:any) => setLectura({...lectura, decantador: {...lectura.decantador, turbiedad: v}})} />
                                    <InputField label="Color" value={lectura.decantador.color} unit="UPC" onChange={(v:any) => setLectura({...lectura, decantador: {...lectura.decantador, color: v}})} />
                                    <InputField label="pH" value={lectura.decantador.ph} unit="PH" onChange={(v:any) => setLectura({...lectura, decantador: {...lectura.decantador, ph: v}})} />
                                </div>
                            </div>

                            <div className="space-y-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                     <h5 className="text-[8px] font-black text-emerald-400 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">Filtración</h5>
                                     <span className="material-symbols-outlined text-emerald-500/40 text-sm">filter_list</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        <InputField label="Turb. In" value={lectura.filtros.ingreso.turbiedad} unit="NTU" onChange={(v:any) => setLectura({...lectura, filtros: {...lectura.filtros, ingreso: {...lectura.filtros.ingreso, turbiedad: v}}})} />
                                        <InputField label="Turb. Out" value={lectura.filtros.salida.turbiedad} unit="NTU" onChange={(v:any) => setLectura({...lectura, filtros: {...lectura.filtros, salida: {...lectura.filtros.salida, turbiedad: v}}})} />
                                        <InputField label="pH Out" value={lectura.filtros.salida.ph} unit="pH" onChange={(v:any) => setLectura({...lectura, filtros: {...lectura.filtros, salida: {...lectura.filtros.salida, ph: v}}})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                        {/* SECCIÓN: AGUA TRATADA */}
                        <div className="space-y-4">
                            <h5 className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                                Calidad Agua Tratada
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                <InputField label="Turbiedad" value={lectura.tratada.turbiedad} unit="NTU" type="turbiedad" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, turbiedad: v}})} />
                                <InputField label="Conduct." value={lectura.tratada.conductividad} unit="uS" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, conductividad: v}})} />
                                <InputField label="Color" value={lectura.tratada.color} unit="UPC" type="color" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, color: v}})} />
                                <InputField label="pH" value={lectura.tratada.ph} unit="PH" type="ph" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, ph: v}})} />
                                <InputField label="Alu. Res." value={lectura.tratada.aluminioResidual} unit="mg/L" type="aluminio" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, aluminioResidual: v}})} />
                                <InputField label="Cloro Res." value={lectura.tratada.cloroResidual} unit="mg/L" type="cloro" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, cloroResidual: v}})} />
                                <InputField label="Dureza" value={lectura.tratada.dureza} unit="mg/L" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, dureza: v}})} />
                                <InputField label="OVL" value={lectura.tratada.ovl} unit="uL" onChange={(v:any) => setLectura({...lectura, tratada: {...lectura.tratada, ovl: v}})} />
                            </div>
                        </div>
                    </div>

                    {/* Footer Profesional */}
                    <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center px-10">
                        <div className="flex items-center gap-4">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                Última Actualización: {lectura.hora}
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Norma OK</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Fuera de Rango</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}