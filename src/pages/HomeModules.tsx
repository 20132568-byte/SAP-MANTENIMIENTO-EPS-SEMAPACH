import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggleSmall() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button onClick={toggleTheme} title="Cambiar Tema"
            className="flex-shrink-0 w-9 h-9 border border-slate-700/50 hover:bg-slate-700/30 text-slate-400 flex items-center justify-center rounded-xl transition-all">
            <span className="material-symbols-outlined text-base">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
    );
}

export default function HomeModules() {
    const navigate = useNavigate()
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    const modules = [
        {
            id: 'mantenimiento',
            title: 'Gestión de Mantenimiento',
            subtitle: 'Flota + Estaciones Hídricas',
            icon: 'engineering',
            description: 'Control integral de mantenimiento preventivo y correctivo.',
            color: 'from-sky-500 to-blue-600',
            shadow: 'shadow-sky-900/40',
            route: '/dashboard'
        },
        {
            id: 'ptap',
            title: 'PTAP Portachuelo',
            subtitle: 'Planta de Tratamiento',
            icon: 'settings_input_component',
            description: 'Monitoreo de parámetros de calidad de agua.',
            color: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-900/40',
            route: '/control-ptap'
        },
        {
            id: 'presion',
            title: 'Presión y Continuidad',
            subtitle: 'Red de Distribución',
            icon: 'water_pressure',
            description: 'Control de presión y horas de servicio.',
            color: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-900/40',
            route: '/monitoreo-agua'
        }
    ]

    const handleLogout = () => {
        const currentTheme = localStorage.getItem('app-theme');
        localStorage.clear();
        if (currentTheme) localStorage.setItem('app-theme', currentTheme);
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-mesh-premium flex flex-col items-center justify-center relative overflow-hidden px-4">

            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-500/5 rounded-full blur-[120px]"></div>

            <header className="fixed top-0 left-0 w-full p-4 flex items-center justify-between z-50 bg-[#030712]/90 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40">
                        <span className="material-symbols-outlined text-white text-lg">water_drop</span>
                    </div>
                    <div className="hidden xs:block">
                        <h1 className="text-xs font-black tracking-tighter text-white uppercase leading-none">EPS SEMAPACH</h1>
                        <p className="text-[7px] text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Sistemas</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {user && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 max-w-[120px] sm:max-w-none">
                            <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0">
                                {user.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[9px] font-black text-white uppercase truncate">{user.username}</span>
                        </div>
                    )}
                    <ThemeToggleSmall />
                    <button onClick={handleLogout} className="w-9 h-9 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 flex items-center justify-center rounded-xl transition-all">
                        <span className="material-symbols-outlined text-lg">logout</span>
                    </button>
                </div>
            </header>

            <div className="max-w-5xl w-full text-center z-10 pt-24 pb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/5 border border-cyan-500/20 mb-6 animate-reveal">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Inteligencia Operativa 2026</span>
                </div>

                <h2 className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-4 animate-reveal">
                    GERENCIA DE <br />
                    <span className="gold-gradient-text">OPERACIONES</span>
                </h2>

                <p className="text-xs sm:text-lg text-slate-400 font-medium max-w-lg mx-auto mb-8 animate-reveal">
                    Selecciona el sistema al que deseas ingresar
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto animate-reveal" style={{ animationDelay: '0.8s' }}>
                    {modules.map((module) => (
                        <button
                            key={module.id}
                            onClick={() => navigate(module.route)}
                            className="group relative bg-[#0f172a]/40 backdrop-blur-xl border border-slate-800/50 hover:border-cyan-500/30 rounded-[2.5rem] p-8 text-left transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-700"></div>
                            <div className="absolute top-6 right-8 opacity-[0.05] group-hover:opacity-10 transition-all duration-500">
                                <span className="material-symbols-outlined text-6xl text-white select-none pointer-events-none">
                                    {module.id === 'mantenimiento' ? 'precision_manufacturing' : module.id === 'ptap' ? 'water_full' : 'water_pressure'}
                                </span>
                            </div>

                            <div className={`relative w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center shadow-2xl ${module.shadow} mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="material-symbols-outlined text-white text-3xl">{module.icon}</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-widest bg-gradient-to-r ${module.color} text-white mb-4 shadow-lg shadow-black/20`}>
                                        {module.id === 'mantenimiento' ? 'Flota + Estaciones' : module.subtitle.split(' ')[0]}
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-cyan-400 transition-colors">
                                        {module.title}
                                    </h3>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium group-hover:text-slate-400 transition-colors duration-300">
                                    {module.description}
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                                    <span className={`bg-gradient-to-r ${module.color} bg-clip-text text-transparent`}>Explorar Módulo</span>
                                    <span className="material-symbols-outlined text-base text-cyan-500 group-hover:translate-x-2 transition-transform duration-300">arrow_forward</span>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                    <div className="w-4 h-1 rounded-full bg-cyan-600"></div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-12 mb-8 w-full text-center animate-reveal">
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">
                    Eficiencia & Poder Tecnológico en Gestión de Agua
                </p>
            </div>

            <div className="absolute bottom-[-50px] left-0 w-full h-[150px] bg-gradient-to-t from-[#030712] to-transparent z-0"></div>
        </div>
    )
}
