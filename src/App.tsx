import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AssetTypeProvider } from './contexts/AssetTypeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { MainLayout, ProtectedRoute } from './components/Layout'
import LandingPage from './pages/LandingPage'

const LazyLoad = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
    <Component />
  </Suspense>
)

const DashboardOperativo = lazy(() => import('./pages/DashboardOperativo'))
const DashboardGerencial = lazy(() => import('./pages/DashboardGerencial'))
const MaestroActivos = lazy(() => import('./pages/MaestroActivos'))
const DiagnosticoInicial = lazy(() => import('./pages/DiagnosticoInicial'))
const RegistroDiario = lazy(() => import('./pages/RegistroDiario'))
const RegistroFallas = lazy(() => import('./pages/RegistroFallas'))
const GestionPreventivos = lazy(() => import('./pages/GestionPreventivos'))
const MantenimientoIntegrado = lazy(() => import('./pages/MantenimientoIntegrado'))
const APMDesempenio = lazy(() => import('./pages/APMDesempenio'))
const MonitoreoAgua = lazy(() => import('./pages/MonitoreoAgua'))
const ControlPTAP = lazy(() => import('./pages/ControlPTAP'))
const EstacionesHidricas = lazy(() => import('./pages/EstacionesHidricas'))
const ProduccionOPAPTAR = lazy(() => import('./pages/ProduccionOPAPTAR'))
const Catalogos = lazy(() => import('./pages/Catalogos'))
const Reportes = lazy(() => import('./pages/Reportes'))
const MotorInteligencia = lazy(() => import('./pages/MotorInteligencia'))
const PlanMantenimiento2026 = lazy(() => import('./pages/PlanMantenimiento2026'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const MiPerfil = lazy(() => import('./pages/MiPerfil'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const HomeModules = lazy(() => import('./pages/HomeModules'))
const InventarioPedidos = lazy(() => import('./pages/InventarioPedidos'))

export default function App() {
  return (
    <ThemeProvider>
      <AssetTypeProvider>
        <NotificationProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/home"
                element={<ProtectedRoute><MainLayout>{LazyLoad(HomeModules)}</MainLayout></ProtectedRoute>}
              />

              {/* Mantenimiento */}
              <Route path="/dashboard" element={<ProtectedRoute><MainLayout>{LazyLoad(DashboardOperativo)}</MainLayout></ProtectedRoute>} />
              <Route path="/dashboard-gerencial" element={<ProtectedRoute><MainLayout>{LazyLoad(DashboardGerencial)}</MainLayout></ProtectedRoute>} />
              <Route path="/activos" element={<ProtectedRoute><MainLayout>{LazyLoad(MaestroActivos)}</MainLayout></ProtectedRoute>} />
              <Route path="/diagnostico" element={<ProtectedRoute><MainLayout>{LazyLoad(DiagnosticoInicial)}</MainLayout></ProtectedRoute>} />
              <Route path="/operacion-diaria" element={<ProtectedRoute><MainLayout>{LazyLoad(RegistroDiario)}</MainLayout></ProtectedRoute>} />
              <Route path="/fallas" element={<ProtectedRoute><MainLayout>{LazyLoad(RegistroFallas)}</MainLayout></ProtectedRoute>} />
              <Route path="/preventivos" element={<ProtectedRoute><MainLayout>{LazyLoad(GestionPreventivos)}</MainLayout></ProtectedRoute>} />
              <Route path="/mantenimiento" element={<ProtectedRoute><MainLayout>{LazyLoad(MantenimientoIntegrado)}</MainLayout></ProtectedRoute>} />
              <Route path="/apm" element={<ProtectedRoute><MainLayout>{LazyLoad(APMDesempenio)}</MainLayout></ProtectedRoute>} />

              {/* Operación */}
              <Route path="/monitoreo-agua/*" element={<ProtectedRoute><MainLayout>{LazyLoad(MonitoreoAgua)}</MainLayout></ProtectedRoute>} />
              <Route path="/control-ptap/*" element={<ProtectedRoute><MainLayout>{LazyLoad(ControlPTAP)}</MainLayout></ProtectedRoute>} />
              <Route path="/estaciones" element={<ProtectedRoute><MainLayout>{LazyLoad(EstacionesHidricas)}</MainLayout></ProtectedRoute>} />
              <Route path="/produccion-opaptar/*" element={<ProtectedRoute><MainLayout>{LazyLoad(ProduccionOPAPTAR)}</MainLayout></ProtectedRoute>} />

              {/* Gestión */}
              <Route path="/catalogos" element={<ProtectedRoute><MainLayout>{LazyLoad(Catalogos)}</MainLayout></ProtectedRoute>} />
              <Route path="/reportes" element={<ProtectedRoute><MainLayout>{LazyLoad(Reportes)}</MainLayout></ProtectedRoute>} />
              <Route path="/motor-inteligencia" element={<ProtectedRoute><MainLayout>{LazyLoad(MotorInteligencia)}</MainLayout></ProtectedRoute>} />
              <Route path="/plan-2026" element={<ProtectedRoute><MainLayout>{LazyLoad(PlanMantenimiento2026)}</MainLayout></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/user-management" element={<ProtectedRoute><MainLayout>{LazyLoad(UserManagement)}</MainLayout></ProtectedRoute>} />
              <Route path="/mi-perfil" element={<ProtectedRoute><MainLayout>{LazyLoad(MiPerfil)}</MainLayout></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute><MainLayout>{LazyLoad(InventarioPedidos)}</MainLayout></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AssetTypeProvider>
    </ThemeProvider>
  )
}
