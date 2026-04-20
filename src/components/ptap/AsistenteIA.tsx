import { useState, useRef, useEffect } from 'react'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: string[]
}

export default function AsistenteIA() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hola, soy el Asistente de Inteligencia Operativa de la PTAP Portachuelo. He sido entrenado con los manuales ISO y procedimientos técnicos de la unidad D. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const suggestedQuestions = [
        "¿Cuáles son los parámetros pH según ISO?",
        "¿Protocolo para No Conformidad NC-11?",
        "¿Manual de producción de agua potable?",
        "¿Frecuencia de limpieza de sedimentadores?"
    ]

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

            if (!response.ok) throw new Error('Error en la comunicación con el núcleo de IA')

            const data = await response.json()
            
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer,
                timestamp: new Date(),
                sources: data.sources || ["Base de conocimiento ISO"]
            }
            setMessages(prev => [...prev, assistantMsg])
        } catch (error: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Lo siento, ha habido un problema de conexión con mi núcleo de procesamiento. Por favor, verifica que el servidor esté activo y la API Key sea válida.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] bg-[#0f172a]/40 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in">
            {/* Header del Chat */}
            <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
                            <span className="material-symbols-outlined text-white text-2xl">psychology</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#0f172a] rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">RAG Engine Portachuelo</h3>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Nucleo de Inteligencia ISO</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Conectado a Drive D:\</span>
                </div>
            </div>

            {/* Area de Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}>
                        <div className={`max-w-[80%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-5 rounded-[1.8rem] text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20 rounded-tr-sm' 
                                : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-sm'
                            }`}>
                                {msg.content}
                            </div>
                            
                            {msg.sources && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {msg.sources.map((s, i) => (
                                        <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-slate-400">
                                            <span className="material-symbols-outlined text-xs">description</span>
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-2">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-800/50 p-4 rounded-2xl flex gap-1">
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input y Sugerencias */}
            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                <div className="flex flex-wrap gap-2 mb-4">
                    {suggestedQuestions.map((q, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleSend(q)}
                            className="text-[10px] font-bold text-slate-400 bg-slate-900/40 border border-white/5 px-4 py-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-95 text-left"
                        >
                            {q}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                        placeholder="Pregunta sobre manuales ISO, NCs o procedimientos..."
                        className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all shadow-inner"
                    />
                    <button 
                        onClick={() => handleSend(input)}
                        className="absolute right-2 top-2 w-10 h-10 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                </div>
                <p className="text-[9px] text-center text-slate-600 mt-4 font-black uppercase tracking-widest">
                    AI Core: Qwen (Alibaba Cloud) — RAG ENGINE V2.1 PTAP Portachuelo
                </p>
            </div>
        </div>
    )
}
