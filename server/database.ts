import { getDb } from './db.js'
import { runMigrations } from './migrations.js'
import { runSeeds } from './seed.js'

export async function initDb() {
    try {
        const pool = getDb()
        const client = await pool.connect()
        console.log('[DB] Conexión exitosa a PostgreSQL (Supabase)')
        client.release()

        await runMigrations()
        await runSeeds()
    } catch (err: any) {
        console.error('[DB] Error de conexión inicial:', err.message)
    }
    return getDb()
}

export { getDb, dbAll, dbGet, dbRun } from './db.js'
