import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useAssetType, type AssetTypeFilter } from '../contexts/AssetTypeContext'
import { useTheme } from '../contexts/ThemeContext'

const menuItems = [
    {
        section: 'Mantenimiento Executive', items: [
            { path: '/dashboard', label: 'Monitor Operativo', icon: 'dashboard', appliesTo: 'all' },
            { path: '/activos', label: 'Maestro de Activos', icon: 'inventory_2', appliesTo: 'all' },
            { path: '/diagnostico', label: 'Diagnostico Inicial', icon: 'assignment', appliesTo: 'all' },
            { path: '/operacion-diaria', label: 'Operación Diaria', icon: 'edit_calendar', appliesTo: 'all' },
            { path: '/fallas', label: 'Registro de Fallas', icon: 'report_problem', appliesTo: 'all' },
            { path: '/preventivos', label: 'Planes Preventivos', icon: 'construction', appliesTo: 'all' },
            { path: '/mantenimiento', label: 'Ordenes de Trabajo', icon: 'engineering', appliesTo: 'all' },
            { path: '/apm', label: 'Salud del Activo (APM)', icon: 'health_and_safety', appliesTo: 'all' },
        ]
    },
    {
        section: 'Operación y Proyectos', items: [
            { path: '/monitoreo-agua', label: 'Control Hídrico', icon: 'water_drop', appliesTo: 'stations' },
            { path: '/control-ptap', label: 'PTAP Portachuelo', icon: 'settings_input_component', appliesTo: 'stations' },
            { path: '/estaciones', label: 'Maestro Estaciones', icon: 'location_on', appliesTo: 'stations' },
        ]
    },
    {
        section: 'Administración', items: [
            { path: '/user-management', label: 'Gestión de Personal', icon: 'manage_accounts', appliesTo: 'all', roles: ['gerencia'] },
        ]
    },
    {
        section: 'Mi Cuenta', items: [
            { path: '/mi-perfil', label: 'Configuración Perfil', icon: 'person_settings', appliesTo: 'all' },
        ]
    }
]

const ptapMenuItems = [
    {
        section: 'Módulo Portachuelo', items: [
            { path: '/control-ptap/proceso', label: 'Control Fisicoquímico', icon: 'biotech', appliesTo: 'all' },
            { path: '/control-ptap/dashboard', label: 'Dashboard Diario', icon: 'analytics', appliesTo: 'all' },
            {path: '/control-ptap/dosis', label: 'Calculadora de Dosis', icon: 'calculate', appliesTo: 'all' },
            { path: '/control-ptap/cronograma', label: 'Cronograma Semanal', icon: 'event_note', appliesTo: 'all' },
            { path: '/control-ptap/ia', label: 'Asistente IA (RAG)', icon: 'psychology', appliesTo: 'all' },
        ]
    }
]

const waterMenuItems = [
    {
        section: 'Control Hídrico', items: [
            { path: '/monitoreo-agua/operacion', label: 'Operación Diaria', icon: 'edit_calendar', appliesTo: 'all' },
            { path: '/monitoreo-agua/dashboard', label: 'Dashboard Análisis', icon: 'analytics', appliesTo: 'all' },
            { path: '/monitoreo-agua/consolidado', label: 'Reporte Consolidado', icon: 'table_view', appliesTo: 'all' },
        ]
    }
]

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button onClick={toggleTheme} title="Cambiar Tema"
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group">
            <span className="material-symbols-outlined text-base sm:text-lg text-slate-400 group-hover:text-amber-400 transition-colors">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
}

export function AssetTypeFilterBtn() {
    const { assetType, setAssetType } = useAssetType()
    const types: { key: AssetTypeFilter; label: string; icon: string }[] = [
        { key: 'fleet', label: 'Flota', icon: 'directions_car' },
        { key: 'stations', label: 'Estaciones', icon: 'location_on' },
    ]
    return (
        <div className="flex bg-slate-900/80 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0 shadow-lg gap-0.5 sm:gap-1">
            {types.map(t => (
                <button key={t.key} onClick={() => setAssetType(t.key)} title={t.label}
                    className={`flex items-center justify-center px-2 sm:px-4 h-7 sm:h-8 rounded-lg transition-all text-[8px] sm:text-[9.5px] font-black uppercase tracking-tighter sm:tracking-widest min-w-[65px] sm:min-w-[100px] ${assetType === t.key ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                    <span className="material-symbols-outlined text-[13px] sm:text-[15px] mr-1 sm:mr-2">{t.icon}</span>
                    <span className="hidden xs:inline">{t.label}</span>
                </button>
            ))}
        </div>
    )
}

export function ProtectedRoute({ children, reqRole }: { children: React.ReactNode, reqRole?: string }) {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    if (!token) return <Navigate to="/" replace />

    if (reqRole && user?.role !== reqRole) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

import { Navigate } from 'react-router-dom'
import FloatingChat from './FloatingChat'

export function MainLayout({ children }: { children: React.ReactNode }) {
    const [sidebarActive, setSidebarActive] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const { assetType } = useAssetType()
    const location = useLocation()
    const navigate = useNavigate()
    const hoverTimeout = useRef<any>(null)

    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    const isPTAPModule = location.pathname.startsWith('/control-ptap')
    const isWaterModule = location.pathname.startsWith('/monitoreo-agua')

    const isMaintenanceModule = !isPTAPModule && !isWaterModule && (
        location.pathname.includes('/dashboard') ||
        location.pathname.includes('/activos') ||
        location.pathname.includes('/fallas') ||
        location.pathname.includes('/operacion') ||
        location.pathname.includes('/preventivos') ||
        location.pathname.includes('/diagnostico') ||
        location.pathname.includes('/apm') ||
        location.pathname.includes('/mantenimiento')
    )

    const isAdminUser = user?.username === 'DanielAdmin' || user?.role === 'gerencia';

    let currentMenu = [...menuItems];
    if (isPTAPModule) currentMenu = [...ptapMenuItems];
    else if (isWaterModule) currentMenu = [...waterMenuItems];

    if (isAdminUser && !currentMenu.some(s => s.section === 'Administración')) {
        const adminSection = menuItems.find(s => s.section === 'Administración');
        if (adminSection) currentMenu.push({
            ...adminSection,
            items: adminSection.items.map(i => ({ ...i, roles: undefined }))
        });
    }

    const visibleItems = currentMenu.map(section => ({
        ...section,
        items: (section.items as any[]).filter(item => {
            if (!isPTAPModule && !isWaterModule) {
                if (isMaintenanceModule) {
                    return section.section === 'Mantenimiento Executive' ||
                        (section.section === 'Estrategia & Admin' && !item.roles) ||
                        (item.roles && user && item.roles.includes(user.role))
                }
                if (location.pathname === '/estaciones') {
                    return section.section === 'Estrategia & Admin' && (!item.roles || (user && item.roles.includes(user.role)))
                }
                const matchAsset = item.appliesTo === 'all' || item.appliesTo === assetType
                const matchRole = !item.roles || (user && item.roles.includes(user.role))
                return matchAsset && matchRole
            }
            return true
        }),
    })).filter(section => section.items.length > 0)

    const currentLabel = [...menuItems, ...ptapMenuItems, ...waterMenuItems].flatMap(s => s.items).find(i => i.path === location.pathname)?.label || 'Panel de Gestión'

    const handleLogout = () => {
        const currentTheme = localStorage.getItem('app-theme');
        localStorage.clear();
        if (currentTheme) localStorage.setItem('app-theme', currentTheme);
        window.location.href = '/'
    }

    const isExpanded = sidebarActive || isHovered

    return (
        <div className="flex bg-[#030712] text-slate-200 h-[100dvh] overflow-hidden font-body">

            <aside
                onMouseEnter={() => { clearTimeout(hoverTimeout.current); setIsHovered(true) }}
                onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setIsHovered(false), 150) }}
                className={`flex flex-col flex-shrink-0 fixed lg:relative inset-y-0 left-0 z-[60] lg:z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-slate-900/50 bg-[#05080f]/95 lg:bg-[#05080f]/80 backdrop-blur-xl ${isExpanded ? 'w-72 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}`}>

                <div className="h-20 flex items-center px-5 gap-3 border-b border-slate-900/30 flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center rounded-xl flex-shrink-0 shadow-lg shadow-cyan-900/20">
                        <span className="material-symbols-outlined text-white text-xl">water_drop</span>
                    </div>
                    {isExpanded && (
                        <div className="overflow-hidden whitespace-nowrap animate-reveal">
                            <h1 className="text-sm font-black tracking-tight text-white leading-none uppercase">EPS SEMAPACH</h1>
                            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">Gerencia Op.</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
                    {visibleItems.map((section) => (
                        <div key={section.section} className="mb-6">
                            {isExpanded && (
                                <div className="px-3 py-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] animate-reveal">{section.section}</div>
                            )}
                            {section.items.map((item) => (
                                <NavLink key={item.path} to={item.path}
                                    className={({ isActive }) => `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-200'}`}>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isExpanded ? '' : 'group-hover:bg-cyan-500/10'}`}>
                                        <span className={`material-symbols-outlined text-[20px] ${isExpanded ? '' : 'group-hover:text-cyan-400'}`}>{item.icon}</span>
                                    </div>
                                    {isExpanded && <span className="text-sm truncate animate-reveal">{item.label}</span>}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-900/30">
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        {isExpanded && <span className="text-xs font-bold uppercase tracking-widest">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-14 sm:h-16 flex items-center justify-between px-2 sm:px-8 bg-[#05080f]/80 backdrop-blur-xl border-b border-slate-900/50 sticky top-0 z-40">
                    <div className="flex items-center gap-1.5 sm:gap-4 overflow-hidden shrink-0">
                        <button onClick={() => setSidebarActive(!sidebarActive)}
                            className="lg:hidden flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/50 rounded-xl border border-slate-700 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-sm sm:text-base text-cyan-400">{sidebarActive ? 'close' : 'menu'}</span>
                        </button>

                        <button onClick={() => navigate(-1)}
                            className="flex flex-shrink-0 items-center justify-center w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group">
                            <span className="material-symbols-outlined text-sm sm:text-lg text-slate-400 group-hover:text-cyan-400">arrow_back</span>
                            <span className="hidden sm:block text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest ml-2">Atrás</span>
                        </button>

                        <button onClick={() => navigate('/home')}
                            className="flex flex-shrink-0 items-center justify-center w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group">
                            <span className="material-symbols-outlined text-sm sm:text-lg text-slate-400 group-hover:text-cyan-400">home</span>
                            <span className="hidden sm:block text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest ml-2">Inicio</span>
                        </button>

                        <ThemeToggle />

                        <div className="hidden md:flex flex-col min-w-0 ml-2">
                            <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest leading-none mb-1 opacity-60">Módulo</span>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[200px]">{currentLabel}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-8 justify-end min-w-0">
                        {isMaintenanceModule && <div className="flex-shrink-0 scale-95 sm:scale-100"><AssetTypeFilterBtn /></div>}

                        <div className="hidden xs:flex items-center gap-2 sm:gap-3 glass-morphism px-2 sm:px-4 py-1 sm:py-1.5 rounded-full border-cyan-500/10 shrink-0">
                            <div className="w-6 h-6 sm:w-6 sm:h-6 bg-gold-gradient rounded-full flex-shrink-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white">
                                {user?.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="hidden sm:flex flex-col text-right">
                                <span className="text-[9px] font-black text-white leading-none uppercase">{user?.username}</span>
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">{user?.role}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar bg-mesh-premium">
                    <div id="export-canvas" className="w-full max-w-[1500px] mx-auto pb-10">
                        {children}
                    </div>
                </div>

                {sidebarActive && (
                    <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setSidebarActive(false)}></div>
                )}

                <FloatingChat />

                <footer className="flex h-10 items-center justify-between px-4 sm:px-8 bg-[#05080f] border-t border-slate-900 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Status:</span>
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.4)]"></div>
                        <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-tighter">v1.9 Ultra Premium</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">EPS SEMAPACH — 2026</span>
                </footer>
            </main>
        </div>
    )
}
