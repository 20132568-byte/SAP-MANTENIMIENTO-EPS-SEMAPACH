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

    const handleDownload = (fileName: string) => {
        window.location.href = `/api/ia/download?file=${encodeURIComponent(fileName)}`
    }

    const renderMessageContent = (content: string) => {
        const evidenceMatch = content.match(/\[EVIDENCIA\]([\s\S]*)/i)
        if (evidenceMatch) {
            const text = content.replace(/\[EVIDENCIA\][\s\S]*/i, '').trim()
            const evidence = evidenceMatch[1].trim()
            
            return (
                <div className="space-y-4">
                    <div className="whitespace-pre-wrap">{text}</div>
                    <div className="bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 overflow-x-auto shadow-inner">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-cyan-400 text-sm">verified</span>
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Evidencia técnica extraída</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300 leading-relaxed font-bold">
                            {evidence}
                        </div>
                    </div>
                </div>
            )
        }
        return <div className="whitespace-pre-wrap">{content}</div>
    }

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] bg-[#0f172a]/40 backdrop-blur-2xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Header del Chat */}
            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
                            <span className="material-symbols-outlined text-white text-lg">psychology</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-white">RAG Portachuelo</h3>
                        <p className="text-[9px] text-slate-500 font-medium">Nucleo de Inteligencia ISO</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/60 rounded-lg border border-white/5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-[8px] font-semibold text-emerald-500 uppercase tracking-wider">Drive D:\</span>
                </div>
            </div>

            {/* Area de Mensajes */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}>
                        <div className={`${msg.role === 'user' ? 'max-w-[88%] sm:max-w-[80%]' : 'max-w-[95%] sm:max-w-[88%]'}`}>
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20 rounded-tr-md' 
                                : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-md'
                            }`}>
                                {renderMessageContent(msg.content)}
                            </div>
                            
                            {msg.sources && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {msg.sources.map((s, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleDownload(s)}
                                            className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[8px] font-semibold text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all active:scale-95 group"
                                        >
                                            <span className="material-symbols-outlined text-[10px] group-hover:animate-bounce">download</span>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

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

            {/* Input y Sugerencias */}
            <div className="p-3 border-t border-white/5 bg-white/[0.01] flex-shrink-0">
                <div className="flex overflow-x-auto gap-1.5 mb-2 no-scrollbar scroll-smooth">
                    {suggestedQuestions.map((q, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleSend(q)}
                            className="text-[9px] font-medium text-slate-400 bg-slate-900/40 border border-white/5 px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-95 text-left whitespace-nowrap flex-shrink-0"
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
                        className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all shadow-inner"
                    />
                    <button 
                        onClick={() => handleSend(input)}
                        className="absolute right-1.5 top-1.5 w-8 h-8 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg flex items-center justify-center transition-all shadow-lg active:scale-90"
                    >
                        <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                </div>
                <p className="text-[8px] text-center text-slate-600 mt-2 font-medium uppercase tracking-wider">
                    AI Core: Qwen — RAG ENGINE V2.1 PTAP Portachuelo
                </p>
            </div>
        </div>
    )
}

