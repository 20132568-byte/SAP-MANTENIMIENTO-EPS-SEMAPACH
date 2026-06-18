import { describe, it, expect } from 'vitest'

// Test the calcDuracion logic extracted from the service
function calcDuracion(horaInicio: string, horaFin: string, duracionDefault: number): number {
    if (horaInicio && horaFin) {
        const [h1, m1] = horaInicio.split(':').map(Number)
        const [h2, m2] = horaFin.split(':').map(Number)
        let d = (h2 + m2 / 60) - (h1 + m1 / 60)
        if (d < 0) d += 24
        return Math.round(d * 100) / 100
    }
    return duracionDefault || 0
}

describe('FailureService - calcDuracion', () => {
    it('calculates duration within same day', () => {
        expect(calcDuracion('08:00', '16:00', 0)).toBe(8)
    })

    it('calculates duration across midnight', () => {
        expect(calcDuracion('22:00', '06:00', 0)).toBe(8)
    })

    it('calculates partial hours', () => {
        expect(calcDuracion('08:30', '12:45', 0)).toBe(4.25)
    })

    it('returns default when no times provided', () => {
        expect(calcDuracion('', '', 5)).toBe(5)
        expect(calcDuracion('', '', 0)).toBe(0)
    })

    it('handles single hour intervals', () => {
        expect(calcDuracion('09:00', '10:00', 0)).toBe(1)
        expect(calcDuracion('09:00', '09:30', 0)).toBe(0.5)
    })
})
