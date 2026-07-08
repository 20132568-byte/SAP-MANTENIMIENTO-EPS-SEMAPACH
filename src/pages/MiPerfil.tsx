import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function MiPerfil() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'email' | 'password'>('info')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getMe().then((u) => { setUser(u); setEmail(u.email || ''); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleUpdateEmail = async () => {
    if (!email.includes('@')) { setToast('Email inválido'); setTimeout(() => setToast(null), 2500); return }
    setSaving(true)
    try { await api.updateEmail(email); setToast('Email actualizado'); setUser({ ...user, email }); setTab('info') }
    catch (e: any) { setToast(e.message) }
    setSaving(false); setTimeout(() => setToast(null), 2500)
  }

  const handleChangePassword = async () => {
    if (!currentPassword || newPassword.length < 6) { setToast('Completa todos los campos. Mín 6 caracteres.'); setTimeout(() => setToast(null), 2500); return }
    setSaving(true)
    try { await api.changePassword(currentPassword, newPassword); setToast('Contraseña actualizada'); setTab('info'); setCurrentPassword(''); setNewPassword('') }
    catch (e: any) { setToast(e.message) }
    setSaving(false); setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">No se pudo cargar el perfil</div>
  }

  const infoFields = [
    { label: 'Usuario', value: user.username },
    { label: 'Email', value: user.email || '—' },
    { label: 'Rol', value: user.role },
    { label: 'Estado', value: user.status },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-[var(--text-inverse)]">{user.username?.charAt(0).toUpperCase() || 'U'}</span>
        </div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">{user.username}</h1>
        <p className="text-sm text-[var(--text-secondary)] capitalize">{user.role}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-tertiary)] p-1">
        {(['info', 'email', 'password'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'info' ? 'Datos' : t === 'email' ? 'Email' : 'Contraseña'}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] divide-y divide-[var(--border)]">
          {infoFields.map((f) => (
            <div key={f.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{f.label}</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'email' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">Actualiza tu correo electrónico</p>
          <input
            type="email" placeholder="nuevo@correo.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button onClick={handleUpdateEmail} disabled={saving} className="w-full py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Email'}
          </button>
        </div>
      )}

      {tab === 'password' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">Cambia tu contraseña</p>
          <input
            type="password" placeholder="Contraseña actual" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="password" placeholder="Nueva contraseña (mín 6 caracteres)" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button onClick={handleChangePassword} disabled={saving} className="w-full py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Guardando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-sm text-[var(--text-primary)] animate-in">{toast}</div>
      )}
    </div>
  )
}
