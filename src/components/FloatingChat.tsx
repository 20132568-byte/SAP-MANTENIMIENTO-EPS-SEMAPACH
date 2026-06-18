import { useState, useRef, useEffect } from 'react'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: string[]
}

export default function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hola, soy el asistente de EPS SEMAPACH. ¿En qué puedo ayudarte?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = async (content: string) => {
        if (!content.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: content,
            timestamp: new Date()
        }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        try {
            const response = await fetch('/api/ia/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: content })
            })
            if (!response.ok) throw new Error('Error')
            const data = await response.json()
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer,
                timestamp: new Date(),
                sources: data.sources || ["Base de conocimiento ISO"]
            }
            setMessages(prev => [...prev, assistantMsg])
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Lo siento, hubo un problema de conexión. Intenta de nuevo.",
                timestamp: new Date()
            }])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex flex-col items-end ${isOpen ? 'gap-3' : ''}`}>
            {isOpen && (
                <div className="w-[360px] sm:w-[400px] h-[520px] bg-[#0f172a] border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-lg">psychology</span>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">Asistente EPS</div>
                                <div className="text-[8px] font-medium text-slate-500">IA — RAG Engine</div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`${msg.role === 'user' ? 'max-w-[85%]' : 'max-w-[92%]'}`}>
                                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                                        msg.role === 'user'
                                        ? 'bg-cyan-600 text-white rounded-tr-md'
                                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-md'
                                    }`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                    <div className="text-[7px] font-medium text-slate-600 mt-0.5 px-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-slate-800/50 p-3 rounded-2xl flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-slate-800 bg-slate-900/30 flex-shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                                placeholder="Pregunta algo..."
                                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl py-2.5 pl-3.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                            />
                            <button onClick={() => handleSend(input)}
                                className="absolute right-1.5 top-1.5 w-7 h-7 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg flex items-center justify-center transition-all active:scale-90">
                                <span className="material-symbols-outlined text-base">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'w-10 h-10' : 'w-14 h-14'} bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-full shadow-lg shadow-cyan-900/30 flex items-center justify-center transition-all active:scale-90 hover:scale-105`}>
                <span className={`material-symbols-outlined ${isOpen ? 'text-xl' : 'text-2xl'}`}>{isOpen ? 'close' : 'chat'}</span>
            </button>
        </div>
    )
}
