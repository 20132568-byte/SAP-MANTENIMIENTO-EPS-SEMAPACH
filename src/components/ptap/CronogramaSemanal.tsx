const OPERACION_REGULAR = [
    { dia: 'Lunes', actividades: '*Limpieza y desinfeccion del desarenador\n*Retrolavado de filtros (1 y 2)' },
    { dia: 'Martes', actividades: 'Retrolavado de filtros (9, 10, 11 y 12)' },
    { dia: 'Miércoles', actividades: 'Retrolavado de filtros (6, 7, 8)' },
    { dia: 'Jueves', actividades: 'Retrolavado de filtros (3, 4 y 5)' },
    { dia: 'Viernes', actividades: 'Retrolavado de filtros (1 y 2)' },
    { dia: 'Sábado', actividades: 'Retrolavado de filtros (10, 11 y 12)' },
];

export default function CronogramaSemanal() {
    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-slate-700/50 bg-slate-950/20">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">event_note</span>
                    Programa de Operación Semanal (Referencia Excel)
                </h4>
            </div>

            <div className="p-2">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                            <th className="p-4">Día</th>
                            <th className="p-4">Actividades Programadas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {OPERACION_REGULAR.map((item) => (
                            <tr key={item.dia} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4">
                                    <span className="text-[10px] font-black text-slate-200 uppercase">{item.dia}</span>
                                </td>
                                <td className="p-4">
                                    <div className="text-[10px] text-slate-400 font-medium whitespace-pre-line leading-relaxed">
                                        {item.actividades}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-amber-500/5 border-t border-slate-800">
                <p className="text-[8px] font-bold text-amber-500/60 uppercase tracking-widest text-center italic">
                    Referencia: Plan Maestro de Procesos 2026
                </p>
            </div>
        </div>
    );
}