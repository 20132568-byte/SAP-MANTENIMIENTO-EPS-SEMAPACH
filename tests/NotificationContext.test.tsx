import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationProvider, useNotification } from '../src/contexts/NotificationContext'

function TestComponent() {
    const { notify } = useNotification()
    return (
        <div>
            <button onClick={() => notify('success', 'Operación exitosa')}>
                Mostrar éxito
            </button>
            <button onClick={() => notify('error', 'Error crítico')}>
                Mostrar error
            </button>
        </div>
    )
}

describe('NotificationContext', () => {
    it('shows success notification when triggered', () => {
        render(
            <NotificationProvider>
                <TestComponent />
            </NotificationProvider>
        )
        fireEvent.click(screen.getByText('Mostrar éxito'))
        expect(screen.getByText('Operación exitosa')).toBeInTheDocument()
    })

    it('shows error notification when triggered', () => {
        render(
            <NotificationProvider>
                <TestComponent />
            </NotificationProvider>
        )
        fireEvent.click(screen.getByText('Mostrar error'))
        expect(screen.getByText('Error crítico')).toBeInTheDocument()
    })

    it('dismisses notification on click', () => {
        render(
            <NotificationProvider>
                <TestComponent />
            </NotificationProvider>
        )
        fireEvent.click(screen.getByText('Mostrar éxito'))
        const notification = screen.getByText('Operación exitosa')
        expect(notification).toBeInTheDocument()
        fireEvent.click(notification)
        expect(notification).not.toBeInTheDocument()
    })
})
