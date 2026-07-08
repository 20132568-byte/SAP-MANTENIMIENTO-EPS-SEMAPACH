import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, Navigate, useNavigate, Link } from 'react-router-dom'
import { useAssetType, type AssetTypeFilter } from '../contexts/AssetTypeContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../hooks/useAuth'
import ChatWidget from './ChatWidget'

/* ===== Menú unificado ===== */
const menuSections = [
  {
    label: 'Mantenimiento',
    items: [
      { path: '/dashboard', label: 'Monitor', icon: 'grid_view' },
      { path: '/dashboard-gerencial', label: 'Dashboard Gerencial', icon: 'monitoring' },
      { path: '/activos', label: 'Activos', icon: 'inventory_2' },
      { path: '/diagnostico', label: 'Diagnóstico', icon: 'assignment' },
      { path: '/operacion-diaria', label: 'Operación Diaria', icon: 'edit_calendar' },
      { path: '/fallas', label: 'Fallas', icon: 'warning' },
      { path: '/preventivos', label: 'Preventivos', icon: 'construction' },
      { path: '/mantenimiento', label: 'Ordenes Trabajo', icon: 'engineering' },
      { path: '/apm', label: 'Salud del Activo', icon: 'monitor_heart' },
    ],
  },
  {
    label: 'Operación',
    items: [
      { path: '/monitoreo-agua/operacion', label: 'Control Hídrico', icon: 'water_drop' },
      { path: '/control-ptap/proceso', label: 'PTAP Portachuelo', icon: 'precision_manufacturing' },
      { path: '/estaciones', label: 'Estaciones', icon: 'location_on' },
      { path: '/produccion-opaptar/operacion', label: 'Producción', icon: 'factory' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/catalogos', label: 'Catálogos', icon: 'list_alt' },
      { path: '/reportes', label: 'Reportes', icon: 'description' },
      { path: '/motor-inteligencia', label: 'Inteligencia', icon: 'psychology' },
      { path: '/plan-2026', label: 'Plan 2026', icon: 'calendar_month' },
      { path: '/inventario', label: 'Gestión de Inventario', icon: 'inventory' },
    ],
  },
]

/* ===== Theme Toggle ===== */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-all duration-300"
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      <span className="material-symbols-outlined text-lg text-[var(--text-secondary)]">
        {theme === 'dark' ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  )
}

/* ===== Asset Type Filter ===== */
function AssetTypeFilter() {
  const { assetType, setAssetType } = useAssetType()
  const types: { key: AssetTypeFilter; label: string; icon: string }[] = [
    { key: 'fleet', label: 'Flota', icon: 'directions_car' },
    { key: 'stations', label: 'Estaciones', icon: 'location_on' },
  ]
  return (
    <div className="inline-flex items-center gap-1 bg-[var(--bg-tertiary)] p-0.5 rounded-lg border border-[var(--border)]">
      {types.map((t) => (
        <button
          key={t.key}
          onClick={() => setAssetType(t.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            assetType === t.key
              ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ===== Protected Route ===== */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = sessionStorage.getItem('token')
  if (!token) return <Navigate to="/" replace />
  return <>{children}</>
}

/* ===== Main Layout ===== */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()
  const { assetType } = useAssetType()

  const isHome = location.pathname === '/home'
  const assetPagePrefixes = ['/home', '/dashboard', '/dashboard-gerencial', '/activos', '/diagnostico', '/operacion-diaria', '/fallas', '/preventivos', '/mantenimiento', '/apm', '/reportes']
  const showAssetFilter = assetPagePrefixes.some((p) => location.pathname.startsWith(p))

  const currentLabel = menuSections
    .flatMap((s) => s.items)
    .find((i) => location.pathname.startsWith(i.path))?.label || ''

  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Redirección para roles exclusivos de inventario/logística
  useEffect(() => {
    const role = user?.role
    if ((role === 'jefe_logistica' || role === 'almacenero') && location.pathname !== '/inventario') {
      navigate('/inventario', { replace: true })
    }
  }, [user, location.pathname, navigate])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--bg-overlay)] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border)] transition-transform duration-500 var(--ease-fluid) ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <Link 
          to="/home" 
          className="h-16 flex items-center px-5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
        >
          <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-sm text-[var(--text-inverse)]">water_drop</span>
          </div>
          <div className="ml-3">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              EPS SEMAPACH
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              Operaciones
            </p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Enlaces Generales / Globales */}
          <div className="space-y-1">
            {user?.role !== 'jefe_logistica' && user?.role !== 'almacenero' && (
              <NavLink
                to="/home"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`
                }
              >
                <span className="material-symbols-outlined text-lg">home</span>
                <span>Panel Principal</span>
              </NavLink>
            )}

            {user?.username === 'DanielAdmin' && (
              <NavLink
                to="/user-management"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`
                }
              >
                <span className="material-symbols-outlined text-lg">manage_accounts</span>
                <span>Gestión de Usuarios</span>
              </NavLink>
            )}
          </div>

          {menuSections.map((section) => {
            // Filtrar los items de la sección según el rol del usuario
            const visibleItems = section.items.filter((item) => {
              const role = user?.role;

              // Roles exclusivos de inventario/logística sólo ven inventario
              if (role === 'jefe_logistica' || role === 'almacenero') {
                return item.path === '/inventario';
              }

              // Cualquier otro rol (incluyendo admin y mantenimiento) ve todos sus items + inventario
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                  {section.label}
                </p>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`
                    }
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-[var(--border)]">
          <NavLink
            to="/mi-perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`
            }
          >
            <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-[var(--text-inverse)]">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {user?.username || 'Usuario'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate uppercase">
                {user?.role || '—'}
              </p>
            </div>
            <span className="material-symbols-outlined text-base text-[var(--text-muted)]">settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-[var(--border)] bg-[var(--bg-header)] backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-all"
            >
              <span className="material-symbols-outlined text-lg text-[var(--text-secondary)]">menu</span>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-all"
            >
              <span className="material-symbols-outlined text-lg text-[var(--text-secondary)]">arrow_back</span>
            </button>

            {currentLabel && (
              <div className="hidden md:flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                  Sección
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {currentLabel}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-6 bg-[var(--border)] mx-1" />
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-all"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-lg text-[var(--text-secondary)]">logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {showAssetFilter && <div className="mb-4"><AssetTypeFilter /></div>}
          <div className="max-w-[1440px] mx-auto animate-in">{children}</div>
        </div>
      </main>

      <ChatWidget />
    </div>
  )
}
