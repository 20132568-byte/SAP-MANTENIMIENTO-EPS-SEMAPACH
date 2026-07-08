import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import rateLimit from 'express-rate-limit'
import { dbGet, dbRun, dbAll } from '../database.js'
import { validateRegister, validateLogin, validateChangePassword } from '../validators.js'

export const authRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    console.error('[AUTH] FATAL: JWT_SECRET no está definido en las variables de entorno.')
    process.exit(1)
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
})

// Configuración de Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Middleware para verificar token
export const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'No token provided' })

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Invalid token' })
        req.user = user
        next()
    })
}

// POST /register
authRouter.post('/register', validateRegister, async (req, res) => {
    const { username, dni, email, password, role } = req.body

    try {
        const existing = await dbGet('SELECT id FROM users WHERE dni = ? OR username = ?', dni, username)
        if (existing) return res.status(400).json({ message: 'Usuario o DNI ya existe' })

        const hashedPassword = await bcrypt.hash(password, 10)

        await dbRun(
            'INSERT INTO users (username, dni, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            username, dni, email || '', hashedPassword, role, 'pending'
        )

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO,
            subject: 'Nueva Solicitud de Acceso',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #00a3ff;">Nueva Solicitud de Registro</h2>
                    <p>Un nuevo usuario se ha registrado:</p>
                    <ul>
                        <li><strong>Usuario:</strong> ${username}</li>
                        <li><strong>DNI:</strong> ${dni}</li>
                        <li><strong>Email:</strong> ${email || 'No proporcionado'}</li>
                        <li><strong>Puesto:</strong> ${role.toUpperCase()}</li>
                    </ul>
                    <p>Ingresa al sistema para aprobar o rechazar esta solicitud.</p>
                </div>
            `
        }

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO) {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.error('[EMAIL ERROR]', error)
                else console.log('[EMAIL SENT]', info.response)
            })
        } else {
            console.log('[DEV] Solicitud de registro recibida para:', username, '(Notificación por email omitida por falta de configuración)')
        }

        res.status(201).json({ message: 'Usuario registrado. Esperando aprobación.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /login (con rate limiting)
authRouter.post('/login', loginLimiter, validateLogin, async (req, res) => {
    const { identifier, password } = req.body  // identifier puede ser username o DNI

    try {
        const user = await dbGet('SELECT * FROM public.users WHERE username = ? OR dni = ?', identifier, identifier)
        if (!user) return res.status(401).json({ message: 'Credenciales inválidas' })

        if (user.status !== 'approved') {
            return res.status(403).json({ message: 'Tu cuenta aún no ha sido aprobada por administración.' })
        }

        const validPassword = await bcrypt.compare(password, user.password_hash)
        if (!validPassword) return res.status(401).json({ message: 'Credenciales inválidas' })

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, status: user.status } })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// GET /me
authRouter.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = await dbGet('SELECT id, username, dni, email, role, status FROM public.users WHERE id = ?', req.user.id)
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
        res.json({ id: user.id, username: user.username, email: user.email, role: user.role, status: user.status })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// PATCH /me/email (actualiza correo del usuario logueado)
authRouter.patch('/me/email', authenticateToken, async (req: any, res) => {
    const { email } = req.body
    if (!email || !email.includes('@')) return res.status(400).json({ message: 'Correo electrónico inválido' })

    try {
        await dbRun('UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', email, req.user.id)
        res.json({ message: 'Correo actualizado correctamente' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// === RUTAS DE ADMINISTRACIÓN ===

// GET /users (solo admin)
authRouter.get('/users', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia') return res.status(403).json({ message: 'No autorizado' })
    try {
        const users = await dbAll('SELECT id, username, dni, role, status, created_at FROM users ORDER BY created_at DESC')
        res.json(users)
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /approve/:id
authRouter.post('/approve/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia') return res.status(403).json({ message: 'No autorizado' })
    const { status } = req.body // approved or rejected
    try {
        await dbRun('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', status, req.params.id)
        res.json({ message: `Usuario ${status === 'approved' ? 'aprobado' : 'rechazado'} exitosamente.` })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /forgot-password (genera token de reseteo y envía email)
authRouter.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' } }), async (req, res) => {
    const { identifier } = req.body
    if (!identifier) return res.status(400).json({ message: 'Ingresa tu usuario o DNI' })

    try {
        const user = await dbGet('SELECT id, username, dni, email FROM public.users WHERE username = ? OR dni = ? OR email = ?', identifier, identifier, identifier)
        if (!user) return res.status(404).json({ message: 'No se encontró una cuenta con ese usuario, DNI o email' })
        if (!user.email) return res.status(400).json({ message: 'Esta cuenta no tiene un correo electrónico registrado. Contacta al administrador.' })

        const resetToken = jwt.sign(
            { id: user.id, purpose: 'password_reset' },
            JWT_SECRET,
            { expiresIn: '1h' }
        )

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Recuperación de Contraseña — EPS SEMAPACH',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #00a3ff;">Recuperación de Contraseña</h2>
                        <p>Has solicitado restablecer tu contraseña para el usuario <strong>${user.username}</strong>.</p>
                        <p>Haz clic en el siguiente enlace para crear una nueva contraseña. Este enlace expira en 1 hora:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}"
                               style="background: #00a3ff; color: white; padding: 14px 28px; border-radius: 8px;
                                      text-decoration: none; font-weight: bold; display: inline-block;">
                                Restablecer Contraseña
                            </a>
                        </div>
                        <p style="color: #777; font-size: 12px;">Si no solicitaste este cambio, ignora este mensaje.</p>
                        <hr />
                        <p style="font-size: 12px; color: #777;">EPS SEMAPACH — Sistema de Gestión de Mantenimiento</p>
                    </div>
                `
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.error('[EMAIL ERROR]', error)
                else console.log('[EMAIL SENT]', info.response)
            })

            res.json({ message: 'Revisa tu correo electrónico. Recibirás un enlace para restablecer tu contraseña.' })
        } else {
            console.log('\n[DEVELOPMENT] === ENLACE DE RESTABLECIMIENTO ===')
            console.log(resetUrl)
            console.log('===============================================\n')
            res.json({ 
                message: 'Modo Desarrollo: Enlace generado y mostrado en la consola del servidor (credenciales de email no configuradas en .env).' 
            })
        }
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /reset-password (usa token para cambiar contraseña sin autenticación)
authRouter.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body
    if (!token) return res.status(400).json({ message: 'Token requerido' })
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET)
        if (decoded.purpose !== 'password_reset') return res.status(400).json({ message: 'Token inválido' })

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, decoded.id)
        res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' })
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') return res.status(400).json({ message: 'El enlace ha expirado. Solicita uno nuevo.' })
        res.status(400).json({ message: 'Token inválido o expirado' })
    }
})

// POST /emergency-reset (solo si MASTER_RESET_CODE está configurado)
authRouter.post('/emergency-reset', async (req, res) => {
    const { code, username, newPassword } = req.body
    const masterCode = process.env.MASTER_RESET_CODE
    if (!masterCode) return res.status(404).json({ message: 'Endpoint no disponible' })
    if (code !== masterCode) return res.status(403).json({ message: 'Código inválido' })
    if (!username || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Usuario y nueva contraseña (mín 6 caracteres) requeridos' })
    }

    try {
        const user = await dbGet('SELECT id FROM users WHERE username = ?', username)
        if (!user) return res.status(404).json({ message: `Usuario "${username}" no encontrado` })

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun('UPDATE users SET password_hash = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, 'approved', user.id)
        res.json({ message: `Contraseña de "${username}" reseteada exitosamente.` })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /change-password (cualquier usuario logueado)
authRouter.post('/change-password', authenticateToken, validateChangePassword, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', req.user.id)
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash)
        if (!validPassword) return res.status(401).json({ message: 'Contraseña actual incorrecta' })

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, req.user.id)
        res.json({ message: 'Contraseña actualizada correctamente.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /reset-password/:id (solo admin)
authRouter.post('/reset-password/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia' && req.user.username !== 'DanielAdmin') return res.status(403).json({ message: 'No autorizado' })
    const { newPassword } = req.body
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, req.params.id)
        res.json({ message: 'Contraseña reseteada exitosamente.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /update-role/:id (solo admin)
authRouter.post('/update-role/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia' && req.user.username !== 'DanielAdmin') return res.status(403).json({ message: 'No autorizado' })
    const { role } = req.body
    
    // Lista de roles/puestos válidos
    const validRoles = ['operario', 'jefatura', 'gerencia', 'admin']
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Puesto o rol inválido' })
    }

    try {
        if (role === 'jefatura') {
            const existing = await dbGet(`
                SELECT u.id FROM users u
                WHERE u.role = 'jefatura' AND u.id != ? AND u.status = 'approved'
                AND (SELECT area_id FROM users WHERE id = ?) = u.area_id
            `, req.params.id, req.params.id)
            if (existing) {
                return res.status(400).json({ message: `Cargo ocupado: Ya existe un jefe activo en esta área.` })
            }
        }
        await dbRun('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', role, req.params.id)
        
        // Sincronizar con base de datos de inventario si ya existe
        const { getPgPool } = await import('../database.js')
        const pool = getPgPool()
        await pool.query('UPDATE inventario.users SET role = $1 WHERE id = $2', [role, req.params.id])
        
        res.json({ message: `Puesto actualizado a ${role.replace(/_/g, ' ')} con éxito.` })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /update-area/:id (solo admin)
authRouter.post('/update-area/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia' && req.user.username !== 'DanielAdmin') return res.status(403).json({ message: 'No autorizado' })
    const { area_id } = req.body

    try {
        await dbRun('UPDATE users SET area_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', area_id, req.params.id)
        
        // Sincronizar con base de datos de inventario
        const { getPgPool } = await import('../database.js')
        const pool = getPgPool()
        await pool.query('UPDATE inventario.users SET area_id = $1 WHERE id = $2', [area_id, req.params.id])

        res.json({ message: 'Área actualizada con éxito.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})
