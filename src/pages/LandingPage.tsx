import React from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage: React.FC = () => {
    const navigate = useNavigate()

    React.useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) navigate('/home')
    }, [navigate])

    const features = [
        {
            title: 'Mantenimiento Inteligente',
            desc: 'Control total sobre la flota vehicular y equipos electromecánicos en estaciones hídricas.',
            icon: 'engineering',
            color: 'text-blue-400'
        },
        {
            title: 'Calidad de Agua (PTAP)',
            desc: 'Monitoreo en tiempo real de la Planta de Tratamiento Portachuelo para un agua 100% segura.',
            icon: 'biotech',
            color: 'text-emerald-400'
        },
        {
            title: 'Red de Distribución',
            desc: 'Optimización de presión y continuidad del servicio mediante análisis de datos por distritos.',
            icon: 'hub',
            color: 'text-purple-400'
        },
        {
            title: 'Análisis Predictivo AI',
            desc: 'Motor inteligente que anticipa fallas y optimiza el consumo energético de la operación.',
            icon: 'psychology',
            color: 'text-cyan-400'
        }
    ]

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 selection:bg-cyan-500/30 font-body overflow-x-hidden">
            
            {/* BACKGROUND DECORATION */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.1]"></div>
            </div>

            {/* HEADER */}
            <header className="relative z-50 h-24 flex items-center justify-between px-8 md:px-16 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/40 transform hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-white text-3xl">water_drop</span>
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-xl font-black tracking-tighter text-white leading-none">EPS SEMAPACH</h1>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">Gerencia de Operaciones</p>
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="relative z-10 pt-20 pb-32 px-8 max-w-7xl mx-auto flex flex-col items-center">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-800 mb-12 animate-reveal">
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">Plataforma Operacional 2026</span>
                </div>

                <div className="text-center space-y-6 max-w-4xl">
                    <h2 className="text-5xl md:text-[5.5rem] font-black tracking-[ -0.04em] leading-[0.9] text-white animate-reveal" style={{ animationDelay: '0.2s' }}>
                        LA SIGUIENTE ERA DE <br />
                        <span className="gold-gradient-text">GESTIÓN HÍDRICA</span>
                    </h2>
                    <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed animate-reveal" style={{ animationDelay: '0.4s' }}>
                        Integración total de mantenimiento, calidad de agua y control de red en una sola plataforma inteligente para la Gerencia de Operaciones.
                    </p>
                </div>

                <div className="mt-16 flex flex-wrap justify-center gap-4 animate-reveal" style={{ animationDelay: '0.6s' }}>
                    <button onClick={() => navigate('/login')} className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-1 transition-all duration-300 group">
                        <span className="flex items-center gap-3">
                            Empezar Ahora
                            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
                        </span>
                    </button>
                    <a href="#about" className="px-10 py-5 bg-slate-900/50 border border-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 hover:text-white transition-all duration-300">
                        Conocer más
                    </a>
                </div>
            </section>

            {/* FEATURES GRID */}
            <section id="about" className="relative z-10 py-32 px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="group p-8 bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-[2.5rem] hover:border-cyan-500/30 transition-all duration-500 animate-reveal" style={{ animationDelay: `${0.8 + (i * 0.1)}s` }}>
                            <div className={`w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center mb-8 border border-slate-800 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 ${f.color}`}>
                                <span className="material-symbols-outlined text-3xl transition-colors">{f.icon}</span>
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 tracking-tight">{f.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium group-hover:text-slate-400 transition-colors">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* MISSION SECTION */}
            <section className="relative z-10 py-32 px-8 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
                    <div className="flex-1 space-y-8 animate-reveal" style={{ animationDelay: '1.2s' }}>
                        <h4 className="text-cyan-400 font-black uppercase tracking-[0.4em] text-xs">Misión del Proyecto</h4>
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                            Garantizando la Continuidad del Servicio con Datos en <span className="text-cyan-400">Tiempo Real</span>.
                        </h2>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            Este proyecto nace de la necesidad de unificar todos los frentes operacionales de EPS SEMAPACH. 
                            Desde el mantenimiento preventivo de un motor en Chincha Baja, hasta la turbiedad registrada en la 
                            PTAP Portachuelo, cada dato cuenta para asegurar un servicio eficiente y de calidad para la comunidad.
                        </p>
                        <ul className="space-y-4">
                            {['Estandarización de Procesos', 'Reportabilidad Gerencial Inmediata', 'Reducción de Costos Operativos'].map((item, i) => (
                                <li key={i} className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-cyan-400 text-sm">check</span>
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 relative animate-reveal" style={{ animationDelay: '1.4s' }}>
                        <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-slate-900 to-[#030712] border border-slate-800 p-2 overflow-hidden shadow-2xl relative">
                            <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay"></div>
                            <img 
                                src="/images/landing-industrial.png" 
                                alt="Industrial Management" 
                                className="w-full h-full object-cover rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-1000"
                            />
                        </div>
                        {/* STATS OVERLAY */}
                        <div className="absolute -bottom-10 -left-10 bg-slate-900/90 backdrop-blur-2xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
                            <div className="text-4xl font-black text-cyan-400 leading-none mb-1">24/7</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoreo Activo</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="relative z-10 py-16 px-8 border-t border-slate-900/50 bg-[#020610]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <div className="text-lg font-black text-white tracking-tighter">EPS SEMAPACH</div>
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mt-1">Sistemas de Control Avanzado © 2026</p>
                    </div>
                    <div className="flex gap-10">
                        {['Soporte', 'Documentación', 'Seguridad'].map(link => (
                            <a key={link} href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-cyan-400 transition-colors">{link}</a>
                        ))}
                    </div>
                </div>
            </footer>

            {/* LOWER GRADIENT EFFECT */}
            <div className="fixed bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-[#030712] to-transparent pointer-events-none"></div>
        </div>
    )
}

export default LandingPage
