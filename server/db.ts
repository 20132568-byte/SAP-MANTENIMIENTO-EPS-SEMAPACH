import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
    console.error('[DB] FATAL: DATABASE_URL no está definida en las variables de entorno.')
    process.exit(1)
}

const cleanPgUrl = DATABASE_URL.split('?')[0]

console.log('[DB] Inicializando Pool...')

const pool = new pg.Pool({
    connectionString: cleanPgUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
    console.error('[DB] Error inesperado en el pool:', err)
})

export function getDb() { return pool }

function transformQuery(sql: string): string {
    let index = 1
    return sql.replace(/\?/g, () => `$${index++}`)
}

export async function dbAll(sql: string, ...params: any[]): Promise<any[]> {
    const pgSql = transformQuery(sql)
    const res = await pool.query(pgSql, params)
    return res.rows
}

export async function dbGet(sql: string, ...params: any[]): Promise<any | undefined> {
    const rows = await dbAll(sql, ...params)
    return rows[0]
}

export async function dbRun(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const pgSql = transformQuery(sql)
    const res = await pool.query(pgSql, params)
    return { lastInsertRowid: res.rows[0]?.id || 0, changes: res.rowCount || 0 }
}
