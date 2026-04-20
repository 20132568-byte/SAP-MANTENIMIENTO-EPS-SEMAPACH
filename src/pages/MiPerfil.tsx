import React, { useState } from 'react'

const MiPerfil: React.FC = () => {
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            alert('Las contraseñas nuevas no coinciden')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            })
            const data = await res.json()
            if (res.ok) {
                setToast('Contraseña actualizada con éxito')
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setTimeout(() => setToast(null), 3000)
            } else {
                alert(data.message || 'Error al cambiar contraseña')
            }
        } catch (err) {
            console.error(err)
            alert('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-reveal py-4 sm:py-10">
            <header className="space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">MI PERFIL</h2>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Configuración de Cuenta de Usuario</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* INFO CARD */}
                <div className="md:col-span-1 space-y-4">
                    <div className="premium-card p-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-gold-gradient rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4 border-4 border-white/5">
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <h3 className="text-lg font-black text-white uppercase truncate w-full">{user?.username}</h3>
                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-1">{user?.role}</p>
                    </div>
                    
                    <div className="premium-card p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-500 text-sm">badge</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {user?.id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-500 text-sm">verified_user</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Estado: Activo</span>
                        </div>
                    </div>
                </div>

                {/* CHANGE PASSWORD FORM */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSubmit} className="premium-card p-8 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-gold-500">lock_reset</span>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Cambiar Contraseña</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña Actual</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock</span>
                                    <input 
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                                        placeholder="Ingrese su clave actual"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-800/50 my-2"></div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">shield</span>
                                        <input 
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all text-sm font-mono"
                                            placeholder="Nueva clave"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Nueva</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">done_all</span>
                                        <input 
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all text-sm font-mono"
                                            placeholder="Repetir clave"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gold-gradient text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-gold-900/40 hover:shadow-gold-900/60 transition-all active:scale-[0.98] disabled:opacity-50 text-[11px] flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Actualizando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in-up">
                    <span className="material-symbols-outlined">verified</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{toast}</span>
                </div>
            )}
        </div>
    )
}

export default MiPerfil
