import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const { login } = useAuth()

  const [form, setForm] = useState({ username: '', identifier: '', password: '', dni: '', email: '', role: 'operario' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
        setForm({ username: '', identifier: '', password: '', dni: '', email: '', role: 'operario' })
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {isLogin ? 'Ingresa tus credenciales' : 'Solicita tu cuenta de acceso'}
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

          {isLogin ? (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Usuario o Email</label>
              <input
                type="text" name="identifier"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                placeholder="usuario@email.com"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Usuario</label>
                <input
                  type="text" name="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">DNI</label>
                <input
                  type="text" name="dni"
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
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                <input
                  type="email" name="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Contraseña</label>
            <input
              type="password" name="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Procesando...' : isLogin ? 'Ingresar' : 'Solicitar Registro'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {isLogin ? (
            <>
              <Link to="/forgot-password" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
              <span className="mx-3 text-[var(--text-muted)]">·</span>
              <Link to="/register" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                Registrarse
              </Link>
            </>
          ) : (
            <Link to="/login" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
