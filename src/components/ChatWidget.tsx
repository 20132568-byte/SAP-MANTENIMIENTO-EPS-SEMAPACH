import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '¡Hola! Soy OPAPTARCITO. Preguntame sobre activos, fallas, producción, PTAP, estaciones o mantenimiento.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

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
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--text-inverse)] flex items-center justify-center shadow-lg hover:opacity-90 transition-all active:scale-95"
        title="Chat IA"
      >
        <span className="material-symbols-outlined text-xl">{open ? 'close' : 'smart_toy'}</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 sm:w-96 h-[480px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl flex flex-col overflow-hidden animate-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">OPAPTARCITO</span>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                    : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]'
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.sources && m.sources.length > 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">Fuentes: {m.sources.join(', ')}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-[var(--border)] flex gap-2">
            <input
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Escribe..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleSend} disabled={!input.trim() || loading}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
