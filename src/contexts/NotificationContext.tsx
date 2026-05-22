import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Notification {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
}

interface NotificationContextType {
    notifications: Notification[]
    notify: (type: Notification['type'], message: string) => void
    dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    notify: () => {},
    dismiss: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const notify = useCallback((type: Notification['type'], message: string) => {
        const id = Date.now().toString()
        setNotifications(prev => [...prev, { id, type, message }])
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, 5000)
    }, [])

    const dismiss = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    return (
        <NotificationContext.Provider value={{ notifications, notify, dismiss }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
                {notifications.map(n => (
                    <div key={n.id}
                        className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 cursor-pointer transition-all animate-reveal ${
                            n.type === 'error' ? 'bg-red-900/80 border-red-700/50 text-red-200' :
                            n.type === 'success' ? 'bg-emerald-900/80 border-emerald-700/50 text-emerald-200' :
                            n.type === 'warning' ? 'bg-amber-900/80 border-amber-700/50 text-amber-200' :
                            'bg-blue-900/80 border-blue-700/50 text-blue-200'
                        }`}
                        onClick={() => dismiss(n.id)}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {n.type === 'error' ? 'error' : n.type === 'success' ? 'check_circle' : n.type === 'warning' ? 'warning' : 'info'}
                        </span>
                        <span className="text-sm font-medium">{n.message}</span>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    )
}

export function useNotification() {
    return useContext(NotificationContext)
}
