import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function ResetPassword() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    if (!token) {
        return (
            <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
                <div className="glass-morphism rounded-3xl p-8 max-w-[450px] w-full text-center">
                    <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">link_off</span>
                    <h2 className="text-xl font-black text-white mb-2">ENLACE INVÁLIDO</h2>
                    <p className="text-slate-400 text-sm mb-6">El enlace no contiene un token de recuperación válido.</p>
                    <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-widest">Solicitar nuevo enlace</Link>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)
        setError('')
        setMessage('')

        try {
            const data = await api.resetPassword(token, newPassword)
            setMessage(data.message)
            setDone(true)
        } catch (err: any) {
            setError(err.message || 'Error al restablecer la contraseña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[450px] animate-reveal">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">NUEVA CONTRASEÑA</h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Crea una contraseña segura</p>
                </div>

                <div className="glass-morphism rounded-3xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-tight text-center">{error}</div>
                    )}
                    {message && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-tight text-center">{message}</div>
                    )}

                    {!done ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                <input
                                    type="password" required minLength={6}
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                <input
                                    type="password" required minLength={6}
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    placeholder="Repite la contraseña"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <button disabled={loading} className="w-full btn-premium btn-premium-cyan mt-4 disabled:opacity-50">
                                {loading ? 'GUARDANDO...' : 'RESTABLECER CONTRASEÑA'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <span className="material-symbols-outlined text-5xl text-emerald-400 mb-4 block">check_circle</span>
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">Contraseña actualizada correctamente.</p>
                            <Link to="/login"
                                className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                            >INICIAR SESIÓN</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
