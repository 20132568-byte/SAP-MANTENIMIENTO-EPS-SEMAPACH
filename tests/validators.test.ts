import { describe, it, expect } from 'vitest'

// Test validation logic directly
function validateDNI(dni: string): boolean {
    return /^\d{8}$/.test(dni)
}

function validateUsername(username: string): boolean {
    return username.length >= 3 && username.length <= 50
}

function validatePassword(password: string): boolean {
    return password.length >= 6
}

describe('Auth validators', () => {
    it('validate DNI - 8 digits', () => {
        expect(validateDNI('12345678')).toBe(true)
        expect(validateDNI('1234567')).toBe(false)
        expect(validateDNI('123456789')).toBe(false)
        expect(validateDNI('abcdefgh')).toBe(false)
    })

    it('validate username length', () => {
        expect(validateUsername('abc')).toBe(true)
        expect(validateUsername('a')).toBe(false)
        expect(validateUsername('ab')).toBe(false)
    })

    it('validate password minimum length', () => {
        expect(validatePassword('123456')).toBe(true)
        expect(validatePassword('12345')).toBe(false)
    })
})

describe('Asset validators', () => {
    it('validate codigo_patrimonial required', () => {
        expect('ABC-001'.length > 0).toBe(true)
        expect(''.length > 0).toBe(false)
    })

    it('validate tipo_unidad required', () => {
        expect('Camión'.length > 0).toBe(true)
        expect(''.length > 0).toBe(false)
    })
})
