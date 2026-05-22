/**
 * Script para resetear la contraseña del administrador
 * Uso: DATABASE_URL="tu_url_de_supabase" tsx scripts/reset_admin_password.ts
 */
import pg from 'pg'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(question: string): Promise<string> {
    return new Promise(resolve => rl.question(question, resolve))
}

async function main() {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        console.error('ERROR: Debes definir DATABASE_URL')
        console.error('Ejecuta: DATABASE_URL="postgresql://..." tsx scripts/reset_admin_password.ts')
        process.exit(1)
    }

    const pool = new pg.Pool({ connectionString: dbUrl.split('?')[0], ssl: { rejectUnauthorized: false } })

    try {
        const users = (await pool.query("SELECT id, username, dni, email, role, status FROM users WHERE role = 'gerencia' OR username ILIKE '%admin%' ORDER BY id")).rows

        if (users.length === 0) {
            console.log('No se encontraron usuarios administradores.')
            const allUsers = (await pool.query('SELECT id, username, role, status FROM users ORDER BY id')).rows
            if (allUsers.length === 0) {
                console.log('No hay usuarios en la base de datos.')
            } else {
                console.log('\nUsuarios disponibles:')
                allUsers.forEach(u => console.log(`  ${u.id}. ${u.username} (${u.role}) - ${u.status}`))
            }
            return
        }

        console.log('\nUsuarios administradores encontrados:\n')
        users.forEach(u => console.log(`  ${u.id}. ${u.username} (${u.role}) - ${u.status}${u.email ? ` - ${u.email}` : ' - sin email'}`))

        const choice = await ask('\nNúmero del usuario a resetear (o 0 para salir): ')
        const id = parseInt(choice)
        if (!id) { console.log('Cancelado.'); return }

        const user = users.find(u => u.id === id)
        if (!user) { console.log('Opción inválida.'); return }

        const newPassword = await ask('Nueva contraseña (mín 6 caracteres): ')
        if (newPassword.length < 6) { console.log('La contraseña debe tener al menos 6 caracteres.'); return }

        const hash = await bcrypt.hash(newPassword, 10)
        await pool.query('UPDATE users SET password_hash = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [hash, 'approved', id])
        console.log(`\n✅ Contraseña de "${user.username}" actualizada correctamente.`)
        console.log('   Ya puedes iniciar sesión.')
    } catch (err: any) {
        console.error('Error:', err.message)
    } finally {
        await pool.end()
        rl.close()
    }
}

main()
