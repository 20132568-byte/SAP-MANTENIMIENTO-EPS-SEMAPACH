import { useNavigate } from 'react-router-dom'
import { useAssetType } from '../contexts/AssetTypeContext'

const modules = [
  { section: 'Mantenimiento', items: [
    { path: '/dashboard', label: 'Monitor Operativo', icon: 'grid_view', desc: 'KPIs en tiempo real y estado de activos' },
    { path: '/dashboard-gerencial', label: 'Dashboard Gerencial', icon: 'monitoring', desc: 'Vista ejecutiva de indicadores' },
    { path: '/activos', label: 'Maestro de Activos', icon: 'inventory_2', desc: 'Gestión de flota y estaciones' },
    { path: '/operacion-diaria', label: 'Operación Diaria', icon: 'edit_calendar', desc: 'Registro de jornada y km' },
    { path: '/fallas', label: 'Registro de Fallas', icon: 'warning', desc: 'Eventos correctivos y costos' },
    { path: '/preventivos', label: 'Planes Preventivos', icon: 'construction', desc: 'Mantenimiento programado' },
    { path: '/apm', label: 'Salud del Activo', icon: 'monitor_heart', desc: 'APM y análisis de desempeño' },
  ]},
  { section: 'Operación', items: [
    { path: '/monitoreo-agua/operacion', label: 'Control Hídrico', icon: 'water_drop', desc: 'Presión y caudal por distrito' },
    { path: '/control-ptap/proceso', label: 'PTAP Portachuelo', icon: 'precision_manufacturing', desc: 'Planta de tratamiento' },
    { path: '/estaciones', label: 'Estaciones Hídricas', icon: 'location_on', desc: 'Equipos y mantenimientos' },
    { path: '/produccion-opaptar/operacion', label: 'Producción OPAPTAR', icon: 'factory', desc: 'Pozos y surtidores' },
  ]},
  { section: 'Gestión', items: [
    { path: '/catalogos', label: 'Catálogos', icon: 'list_alt', desc: 'Configuración del sistema' },
    { path: '/reportes', label: 'Reportes', icon: 'description', desc: 'Exportación de datos' },
    { path: '/motor-inteligencia', label: 'Motor de Inteligencia', icon: 'psychology', desc: 'Alertas y recomendaciones' },
    { path: '/plan-2026', label: 'Plan 2026', icon: 'calendar_month', desc: 'Plan de mantenimiento anual' },
  ]},
]

export default function HomeModules() {
  const navigate = useNavigate()
  const { label } = useAssetType()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Panel Principal</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {label} &mdash; selecciona un módulo para comenzar
        </p>
      </div>

      {modules.map((section) => (
        <div key={section.section}>
          <h2 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
            {section.section}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {section.items.map((m) => (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-base text-[var(--accent)]">{m.icon}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">{m.label}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
