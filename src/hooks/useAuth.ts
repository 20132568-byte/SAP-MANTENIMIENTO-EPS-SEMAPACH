import { useState, useEffect, useCallback } from 'react'
import type { User } from '../models/types'

function getStoredUser(): User | null {
    try {
        const raw = sessionStorage.getItem('user')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(getStoredUser)
    const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'))

    useEffect(() => {
        const handler = () => {
            setUser(getStoredUser())
            setToken(sessionStorage.getItem('token'))
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    }, [])

    const login = useCallback((tokenVal: string, userVal: User) => {
        sessionStorage.setItem('token', tokenVal)
        sessionStorage.setItem('user', JSON.stringify(userVal))
        setToken(tokenVal)
        setUser(userVal)
    }, [])

    const logout = useCallback(() => {
        sessionStorage.clear()
        setToken(null)
        setUser(null)
    }, [])

    const isAdmin = user?.username === 'DanielAdmin' || user?.role === 'gerencia'

    return { user, token, isAdmin, login, logout }
}
