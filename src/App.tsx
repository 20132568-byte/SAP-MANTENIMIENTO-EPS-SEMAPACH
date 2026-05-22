import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssetTypeProvider } from './contexts/AssetTypeContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { MainLayout, ProtectedRoute } from './components/Layout'

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } }
})

const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const HomeModules = lazy(() => import('./pages/HomeModules'))
const DashboardOperativo = lazy(() => import('./pages/DashboardOperativo'))
const DashboardGerencial = lazy(() => import('./pages/DashboardGerencial'))
const MaestroActivos = lazy(() => import('./pages/MaestroActivos'))
const DiagnosticoInicial = lazy(() => import('./pages/DiagnosticoInicial'))
const RegistroDiario = lazy(() => import('./pages/RegistroDiario'))
const RegistroFallas = lazy(() => import('./pages/RegistroFallas'))
const GestionPreventivos = lazy(() => import('./pages/GestionPreventivos'))
const Catalogos = lazy(() => import('./pages/Catalogos'))
const Reportes = lazy(() => import('./pages/Reportes'))
const MotorInteligencia = lazy(() => import('./pages/MotorInteligencia'))
const APMDesempenio = lazy(() => import('./pages/APMDesempenio'))
const MonitoreoAgua = lazy(() => import('./pages/MonitoreoAgua'))
const ControlPTAP = lazy(() => import('./pages/ControlPTAP'))
const EstacionesHidricas = lazy(() => import('./pages/EstacionesHidricas'))
const MantenimientoIntegrado = lazy(() => import('./pages/MantenimientoIntegrado'))
const PlanMantenimiento2026 = lazy(() => import('./pages/PlanMantenimiento2026'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const MiPerfil = lazy(() => import('./pages/MiPerfil'))

function PageLoader() {
    return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando...</span>
            </div>
        </div>
    )
}

export default function App() {
    return (
        <ThemeProvider>
            <NotificationProvider>
            <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AssetTypeProvider>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<AuthPage />} />
                            <Route path="/register" element={<AuthPage />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />

                            <Route path="/home" element={
                                <ProtectedRoute>
                                    <HomeModules />
                                </ProtectedRoute>
                            } />

                            <Route path="/*" element={
                                <ProtectedRoute>
                                    <MainLayout>
                                        <Suspense fallback={<PageLoader />}>
                                            <Routes>
                                                <Route path="/dashboard" element={<DashboardOperativo />} />
                                                <Route path="/activos" element={<MaestroActivos />} />
                                                <Route path="/diagnostico" element={<DiagnosticoInicial />} />
                                                <Route path="/operacion-diaria" element={<RegistroDiario />} />
                                                <Route path="/fallas" element={<RegistroFallas />} />
                                                <Route path="/preventivos" element={<GestionPreventivos />} />
                                                <Route path="/dashboard-gerencial" element={<DashboardGerencial />} />
                                                <Route path="/inteligencia" element={<MotorInteligencia />} />
                                                <Route path="/apm" element={<APMDesempenio />} />
                                                <Route path="/monitoreo-agua/*" element={<MonitoreoAgua />} />
                                                <Route path="/control-ptap/*" element={<ControlPTAP />} />
                                                <Route path="/estaciones" element={<EstacionesHidricas />} />
                                                <Route path="/mantenimiento" element={<MantenimientoIntegrado />} />
                                                <Route path="/plan-2026" element={<PlanMantenimiento2026 />} />
                                                <Route path="/user-management" element={<ProtectedRoute reqRole="gerencia"><UserManagement /></ProtectedRoute>} />
                                                <Route path="/mi-perfil" element={<MiPerfil />} />
                                                <Route path="/catalogos" element={<Catalogos />} />
                                                <Route path="/reportes" element={<Reportes />} />
                                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                            </Routes>
                                        </Suspense>
                                    </MainLayout>
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </Suspense>
                </AssetTypeProvider>
            </BrowserRouter>
            </QueryClientProvider>
            </NotificationProvider>
        </ThemeProvider>
    )
}
