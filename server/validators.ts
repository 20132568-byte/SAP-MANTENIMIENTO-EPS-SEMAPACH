import { body, validationResult } from 'express-validator'
import type { Request, Response, NextFunction } from 'express'

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    next()
}

export const validateRegister = [
    body('username').trim().notEmpty().withMessage('Usuario es requerido')
        .isLength({ min: 3, max: 50 }).withMessage('Usuario debe tener entre 3 y 50 caracteres'),
    body('dni').trim().notEmpty().withMessage('DNI es requerido')
        .matches(/^\d{8}$/).withMessage('DNI debe tener 8 dígitos'),
    body('email').trim().isEmail().withMessage('Correo electrónico inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('Contraseña es requerida')
        .isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
    body('role').trim().notEmpty().withMessage('Rol es requerido'),
    handleValidationErrors,
]

export const validateLogin = [
    body('identifier').trim().notEmpty().withMessage('Usuario o DNI es requerido'),
    body('password').notEmpty().withMessage('Contraseña es requerida'),
    handleValidationErrors,
]

export const validateAsset = [
    body('codigo_patrimonial').trim().notEmpty().withMessage('Código patrimonial es requerido'),
    body('tipo_unidad').trim().notEmpty().withMessage('Tipo de unidad es requerido'),
    handleValidationErrors,
]

export const validateDailyRecord = [
    body('fecha').notEmpty().withMessage('Fecha es requerida'),
    body('asset_id').isInt().withMessage('Asset ID debe ser un número entero'),
    handleValidationErrors,
]

export const validateFailure = [
    body('fecha').notEmpty().withMessage('Fecha es requerida'),
    body('asset_id').isInt().withMessage('Asset ID debe ser un número entero'),
    body('descripcion').trim().notEmpty().withMessage('Descripción es requerida'),
    handleValidationErrors,
]

export const validateStation = [
    body('codigo').trim().notEmpty().withMessage('Código es requerido'),
    body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
    handleValidationErrors,
]

export const validateChangePassword = [
    body('currentPassword').notEmpty().withMessage('Contraseña actual es requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres'),
    handleValidationErrors,
]
