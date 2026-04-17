import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const AuthPage: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const isLogin = location.pathname === '/login'

    const [formData, setFormData] = useState({
        username: '',
        dni: '',
        identifier: '',  // Para login: puede ser username o DNI
        password: '',
        role: 'operario'
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        const url = isLogin ? '/api/auth/login' : '/api/auth/register'

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isLogin
                    ? { identifier: formData.identifier, password: formData.password }
                    : { username: formData.username, dni: formData.dni, password: formData.password, role: formData.role }
                )
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Error en la solicitud')
                return
            }

            if (isLogin) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                window.location.href = '/home' // Redirigir al Home de módulos
            } else {
                setMessage(data.message)
                setFormData({ username: '', dni: '', identifier: '', password: '', role: 'operario' })
            }
        } catch (err) {
            setError('Error de conexión con el servidor')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">

            {/* Fondo Decorativo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[450px] animate-reveal">
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                        <span className="material-symbols-outlined text-cyan-400">arrow_back</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Volver al Inicio</span>
                    </Link>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        {isLogin ? 'BIENVENIDO' : 'ÚNETE AL EQUIPO'}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
                        {isLogin ? 'Ingresa tus credenciales' : 'Registra tu nueva cuenta'}
                    </p>
                </div>

                <div className="glass-morphism rounded-3xl p-8 shadow-2xl relative">
                    {/* Indicador de Estado */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-tight text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-tight text-center">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isLogin ? (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuario o DNI</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    placeholder="Ingresa tu usuario o DNI"
                                    value={formData.identifier}
                                    onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de Usuario</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    placeholder="ej. dmax_19"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        )}

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">DNI</label>
                                <input
                                    type="text" required
                                    maxLength={12}
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    placeholder="Ingrese su número de DNI"
                                    value={formData.dni}
                                    onChange={e => setFormData({ ...formData, dni: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                            <input
                                type="password" required
                                className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Puesto / Rol</label>
                                <select
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none appearance-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="operario">Operario de Mantenimiento</option>
                                    <option value="jefatura">Jefatura de Operaciones</option>
                                    <option value="gerencia">Gerencia General / Admin</option>
                                </select>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full btn-premium btn-premium-cyan mt-4 disabled:opacity-50"
                        >
                            {loading ? 'PROCESANDO...' : isLogin ? 'INICIAR SESIÓN' : 'REGISTRARME'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                            <Link
                                to={isLogin ? '/register' : '/login'}
                                className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                {isLogin ? 'Solicita Registro' : 'Inicia Sesión'}
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center opacity-30">
                    <p className="text-[8px] font-black text-white uppercase tracking-[0.5em]">EPS SEMAPACH - Seguridad Nivel 4</p>
                </div>
            </div>
        </div>
    )
}

export default AuthPage
