import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export default function ChatIA() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '¡Hola! Soy el asistente de inteligencia operativa de EPS SEMAPACH. Puedes preguntarme sobre activos, fallas, producción, PTAP Portachuelo, estaciones hídricas, mantenimiento y más.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await api.chatIA(text)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Asistente IA</h1>
        <p className="text-sm text-[var(--text-secondary)]">Chat con inteligencia operativa sobre todos los módulos</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4 mb-4 scroll-smooth rounded-xl border-2 border-black/20 bg-[var(--bg-card)]/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
                  Fuentes: {m.sources.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta..."
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-none"
        />
        <button
          onClick={handleSend} disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">send</span>
        </button>
      </div>
    </div>
  )
}
