import React, { useState, useEffect } from 'react'

interface User {
    id: number
    username: string
    email: string
    role: string
    status: string
    created_at: string
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<number | null>(null)

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/auth/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            const data = await res.json()
            setUsers(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleResetPassword = async (userId: number) => {
        if (!window.confirm('¿Estás seguro de resetear la contraseña de este usuario a "Semapach2026!"?')) return
        setActionLoading(userId)
        try {
            const res = await fetch(`/api/auth/reset-password/${userId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ newPassword: 'Semapach2026!' })
            })
            if (res.ok) {
                alert('🔑 Contraseña reseteada con éxito a: Semapach2026!')
            } else {
                const err = await res.json()
                alert(`Error: ${err.message}`)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleAction = async (userId: number, status: 'approved' | 'rejected') => {
        setActionLoading(userId)
        try {
            const res = await fetch(`/api/auth/approve/${userId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ status })
            })
            if (res.ok) {
                fetchUsers()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) return <div className="p-8 text-center animate-pulse text-cyan-400 font-bold">CARGANDO PERSONAL...</div>

    return (
        <div className="space-y-8 animate-reveal">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">GESTIÓN DE PERSONAL</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Control de Accesos y Permisos</p>
                </div>
                <div className="px-4 py-2 bg-gold-500/10 border border-gold-500/20 rounded-full flex items-center gap-2">
                    <span className="material-symbols-outlined text-gold-500 text-sm">security</span>
                    <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">Nivel de Seguridad: Gerencial</span>
                </div>
            </div>

            <div className="premium-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800/50">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Puesto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                            {users.map(user => (
                                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-sm">{user.username}</span>
                                            <span className="text-xs text-slate-500">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                            user.role === 'gerencia' ? 'bg-amber-500/10 text-amber-500' :
                                            user.role === 'jefatura' ? 'bg-cyan-500/10 text-cyan-500' :
                                            'bg-slate-700/30 text-slate-400'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-xs text-slate-400 font-medium font-mono">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                user.status === 'approved' ? 'bg-emerald-500 animate-pulse' :
                                                user.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                                            }`}></span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                user.status === 'approved' ? 'text-emerald-400' :
                                                user.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {user.status === 'approved' ? 'ACTIVO' : 
                                                 user.status === 'pending' ? 'PENDIENTE' : 'BLOQUEADO'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Botón de Reset de Contraseña */}
                                            <button 
                                                onClick={() => handleResetPassword(user.id)}
                                                disabled={actionLoading === user.id}
                                                className="p-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                                                title="Resetear Contraseña"
                                            >
                                                <span className="material-symbols-outlined text-sm">key</span>
                                            </button>

                                            {user.status === 'pending' ? (
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleAction(user.id, 'approved')}
                                                        disabled={actionLoading === user.id}
                                                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                                                        title="Aprobar Usuario"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(user.id, 'rejected')}
                                                        disabled={actionLoading === user.id}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                                        title="Rechazar Usuario"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleAction(user.id, user.status === 'approved' ? 'rejected' : 'approved')}
                                                    disabled={actionLoading === user.id}
                                                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                                                        user.status === 'approved' ? 'border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white' :
                                                        'border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                    }`}
                                                >
                                                    {user.status === 'approved' ? 'Inhabilitar' : 'Habilitar'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default UserManagement
