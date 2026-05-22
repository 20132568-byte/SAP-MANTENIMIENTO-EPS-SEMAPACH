import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            const data = await api.forgotPassword(identifier)
            setMessage(data.message)
            setSent(true)
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[450px] animate-reveal">
                <div className="text-center mb-10">
                    <Link to="/login" className="inline-flex items-center gap-2 mb-6 group">
                        <span className="material-symbols-outlined text-cyan-400">arrow_back</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Volver al Login</span>
                    </Link>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">RECUPERAR ACCESO</h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Recibe un enlace para restablecer tu contraseña</p>
                </div>

                <div className="glass-morphism rounded-3xl p-8 shadow-2xl relative">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-tight text-center">{error}</div>
                    )}
                    {message && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-tight text-center">{message}</div>
                    )}

                    {!sent ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuario o DNI</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    placeholder="Ingresa tu usuario o DNI registrado"
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                />
                            </div>
                            <button disabled={loading} className="w-full btn-premium btn-premium-cyan mt-4 disabled:opacity-50">
                                {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <span className="material-symbols-outlined text-5xl text-emerald-400 mb-4 block">mark_email_unread</span>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Revisa tu correo electrónico. Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
