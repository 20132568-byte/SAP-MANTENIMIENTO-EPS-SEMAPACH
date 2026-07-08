import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getDb } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function runMigrations() {
    const pool = getDb()

    const migrationsDir = join(__dirname, 'migrations')
    const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()

    for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8')
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0)

        for (const stmt of statements) {
            try {
                await pool.query(stmt)
            } catch (e: any) {
                if (!e.message.includes('already exists') && !e.message.includes('does not exist')) {
                    console.log(`[MIGRATION] ${file}: ${e.message}`)
                }
            }
        }
        console.log(`[MIGRATION] ${file} aplicada`)
    }
    console.log('[DB] Migraciones aplicadas')
}
