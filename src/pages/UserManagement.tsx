import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { formatDateDMY } from '../utils/date'
import { useAuth } from '../hooks/useAuth'

const roles = ['gerencia', 'jefatura_produccion', 'jefatura_distribucion', 'jefatura_logistica', 'operador', 'mantenimiento']

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [resetPwd, setResetPwd] = useState<{ id: number; username: string } | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [roleMenu, setRoleMenu] = useState<number | null>(null)

  if (user?.username !== 'DanielAdmin') {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
          <h2 className="font-bold">Acceso Restringido</h2>
          <p className="text-sm">Esta sección está estrictamente limitada a la administración del sistema.</p>
        </div>
      </div>
    )
  }

  const load = () => {
    setLoading(true)
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    try { await api.approveUser(id, 'approved'); setToast('Usuario aprobado'); load() }
    catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const reject = async (id: number) => {
    if (!confirm('¿Rechazar este usuario?')) return
    try { await api.approveUser(id, 'rejected'); setToast('Usuario rechazado'); load() }
    catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const changeRole = async (id: number, role: string) => {
    try { await api.updateUserRole(id, role); setToast(`Rol cambiado a ${role}`); setRoleMenu(null); load() }
    catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleResetPwd = async () => {
    if (!resetPwd || !newPwd || newPwd.length < 6) return
    try { await api.adminResetPassword(resetPwd.id, newPwd); setToast('Contraseña reseteada'); setResetPwd(null); setNewPwd('') }
    catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
      case 'rejected': return 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
      case 'active': return 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
      case 'inactive': return 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
      case 'pending': return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Gestión de Usuarios</h1>
        <p className="text-sm text-[var(--text-secondary)]">{users.length} usuarios registrados</p>
      </div>

      {users.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">Sin usuarios</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-3">Usuario</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">DNI</th>
                <th className="text-left p-3">Rol</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Registro</th>
                <th className="text-right p-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="p-3 text-[var(--text-primary)] font-medium">{u.username}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{u.email || '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{u.dni || '—'}</td>
                  <td className="p-3 relative">
                    <button
                      onClick={() => setRoleMenu(roleMenu === u.id ? null : u.id)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize cursor-pointer hover:opacity-80 ${
                        u.role === 'gerencia' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' :
                        u.role.startsWith('jefatura') ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' :
                        u.role === 'mantenimiento' ? 'bg-[var(--color-purple-bg)] text-[var(--color-purple)]' :
                        'bg-[var(--color-info-bg)] text-[var(--color-info)]'
                      }`}
                    >
                      {u.role.replace(/_/g, ' ')} ▼
                    </button>
                    {roleMenu === u.id && (
                      <div className="absolute top-full left-3 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-[140px]">
                        {roles.map((r) => (
                          <button
                            key={r}
                            onClick={() => changeRole(u.id, r)}
                            className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)] capitalize ${
                              r === u.role ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {r.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${getStatusColor(u.status)}`}>
                      {u.status === 'approved' ? 'activo' : u.status === 'rejected' ? 'rechazado' : u.status === 'pending' ? 'pendiente' : u.status}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-muted)]">{formatDateDMY(u.created_at)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.status === 'pending' && (
                        <>
                          <button onClick={() => approve(u.id)} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] hover:bg-[var(--color-success-bg)] transition-colors">Aprobar</button>
                          <button onClick={() => reject(u.id)} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-[var(--color-error-bg)] text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors">Rechazar</button>
                        </>
                      )}
                      {(u.status === 'approved' || u.status === 'active') && (
                        <button onClick={() => setResetPwd({ id: u.id, username: u.username })} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Reset Pwd</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)]" onClick={() => { setResetPwd(null); setNewPwd('') }}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Resetear contraseña</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Usuario: <strong>{resetPwd.username}</strong></p>
            <input
              type="password" placeholder="Nueva contraseña (mín 6 caracteres)"
              value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResetPwd(null); setNewPwd('') }} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Cancelar</button>
              <button onClick={handleResetPwd} disabled={newPwd.length < 6} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-error)] text-[var(--color-white)] hover:bg-[var(--color-danger-hover)] transition-colors disabled:opacity-50">Resetear</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-sm text-[var(--text-primary)] animate-in">{toast}</div>
      )}
    </div>
  )
}
