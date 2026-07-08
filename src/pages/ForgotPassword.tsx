import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.forgotPassword(identifier)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Error al enviar solicitud')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-2xl text-[var(--color-success)]">check</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Correo Enviado</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Si el usuario existe, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link to="/login" className="text-sm text-[var(--accent)] hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Recuperar Contraseña</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Ingresa tu usuario o email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-sm text-[var(--color-error)]">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Usuario o Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Enviando...' : 'Enviar Enlace'}
          </button>
        </form>
      </div>
    </div>
  )
}
