import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ username: '', identifier: '', password: '', dni: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) navigate('/home', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (isLogin) {
        const data = await api.login({ identifier: form.identifier, password: form.password })
        login(data.token, data.user)
        navigate('/home')
      } else {
        if (form.dni.length !== 8) {
          throw new Error('El DNI debe tener exactamente 8 dígitos.')
        }
        const data = await api.register({ username: form.username, dni: form.dni, email: form.email, password: form.password })
        setMessage(data.message || 'Registro exitoso. Espera la aprobación.')
        setForm({ username: '', identifier: '', password: '', dni: '', email: '' })
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
      
      {/* Lado Izquierdo: Presentación Ejecutiva */}
      <div className="lg:col-span-7 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-8 sm:p-16 flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[45vh] lg:min-h-screen">
        
        {/* Glows de fondo */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        
        {/* Top Header */}
        <div className="flex flex-col items-center gap-2 relative z-10">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-950/40">
            <span className="material-symbols-outlined text-base text-[var(--text-inverse)] animate-pulse">water_drop</span>
          </div>
          <div className="leading-tight">
            <p className="text-base font-black uppercase tracking-wider text-slate-100">EPS SEMAPACH</p>
            <p className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">Gerencia de Operaciones</p>
          </div>
        </div>

        {/* Hero & Pilares */}
        <div className="my-auto py-8 relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.25em] mb-3">Plataforma Operacional 2026</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-[1.1] mb-5">
            Inteligencia Operativa <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-400">y Mantenimiento</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mb-8">
            Portal unificado para el monitoreo en tiempo real, control de activos y optimización del tratamiento de agua potable.
          </p>

          {/* Pilares en Grid de 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {[
              { title: 'Gestión de Activos y Flota', desc: 'Planes correctivos, preventivos y control técnico de vehículos y equipos.', icon: 'local_shipping', color: 'text-sky-400' },
              { title: 'Planta Portachuelo & Calidad', desc: 'Monitoreo físico-químico continuo de parámetros y dosificación de cloro.', icon: 'water_pump', color: 'text-emerald-400' },
              { title: 'Producción OPAPTAR', desc: 'Control diario de pozos y monitoreo del caudal del Río San Juan.', icon: 'factory', color: 'text-purple-400' },
              { title: 'Asistente de Inteligencia IA', desc: 'Búsqueda semántica y respuestas operativas a través de OPAPTARCITO.', icon: 'smart_toy', color: 'text-amber-400' }
            ].map((p, idx) => (
              <div key={idx} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm hover:bg-white/[0.04] transition-all">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
                  <span className={`material-symbols-outlined ${p.color} text-[22px]`}>{p.icon}</span>
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide">{p.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-500 uppercase tracking-widest relative z-10 pt-4 text-center">
          © {new Date().getFullYear()} EPS SEMAPACH · Plataforma de Control v2.0
        </div>
      </div>

      {/* Lado Derecho: Formulario de Acceso Integrado */}
      <div className="lg:col-span-5 bg-[var(--bg-card)]/30 backdrop-blur-xl border-l border-[var(--border)] flex items-center justify-center p-8 sm:p-16 min-h-[60vh] lg:min-h-screen">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {isLogin ? 'Iniciar Sesión' : 'Solicitar Acceso'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {isLogin ? 'Ingresa tus credenciales autorizadas' : 'Regístrate para solicitar una cuenta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-sm text-[var(--color-error)]">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-sm text-[var(--color-success)]">
                {message}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Usuario</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                  placeholder="Ej. juan.perez"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {isLogin ? 'Usuario o Email' : 'Email Institucional'}
              </label>
              <input
                type={isLogin ? 'text' : 'email'}
                value={isLogin ? form.identifier : form.email}
                onChange={(e) => setForm(isLogin ? { ...form, identifier: e.target.value } : { ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                placeholder={isLogin ? 'usuario@email.com' : 'juan.perez@semapach.com'}
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">DNI</label>
                <input
                  type="text"
                  value={form.dni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                    setForm({ ...form, dni: val })
                  }}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                  placeholder="DNI de 8 dígitos"
                  maxLength={8}
                  required
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">Contraseña</label>
                {isLogin && (
                  <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-[var(--accent)] hover:underline">
                    ¿La olvidaste?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-gradient-to-r from-sky-600 to-blue-600 text-[var(--text-inverse)] text-xs font-bold uppercase tracking-widest rounded-lg hover:opacity-95 active:scale-95 transition-all shadow-md disabled:opacity-40"
            >
              {loading ? 'Procesando...' : isLogin ? 'Ingresar' : 'Enviar Solicitud'}
            </button>
          </form>

          <div className="text-center mt-6 text-xs text-[var(--text-secondary)]">
            {isLogin ? (
              <>
                ¿No tienes cuenta?{' '}
                <button onClick={() => { setIsLogin(false); setError(''); setMessage(''); }} className="text-[var(--accent)] font-semibold hover:underline">
                  Solicitar Acceso
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta?{' '}
                <button onClick={() => { setIsLogin(true); setError(''); setMessage(''); }} className="text-[var(--accent)] font-semibold hover:underline">
                  Volver al Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
