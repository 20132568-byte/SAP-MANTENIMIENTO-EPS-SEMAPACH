import { useCallback } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import { ApiError } from '../api/client'

export function useApi() {
    const { notify } = useNotification()

    const handleError = useCallback((err: unknown) => {
        if (err instanceof ApiError) {
            notify('error', err.message)
        } else if (err instanceof Error) {
            notify('error', err.message)
        } else {
            notify('error', 'Error inesperado')
        }
    }, [notify])

    const wrap = useCallback(<T>(promise: Promise<T>, successMsg?: string): Promise<T> => {
        return promise
            .then(result => {
                if (successMsg) notify('success', successMsg)
                return result
            })
            .catch(err => {
                handleError(err)
                throw err
            })
    }, [notify, handleError])

    return { wrap, handleError, notify }
}
