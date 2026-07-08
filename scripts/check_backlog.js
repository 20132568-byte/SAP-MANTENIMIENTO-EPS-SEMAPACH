import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL.split('?')[0],
    ssl: { rejectUnauthorized: false }
})

async function run() {
    await client.connect()
    try {
        const res = await client.query(`
            SELECT COUNT(*) as count
            FROM assets a
            JOIN preventive_config pc ON (pc.asset_id = a.id OR (pc.asset_id IS NULL AND pc.tipo_unidad = a.tipo_unidad))
            WHERE a.activo = 1
        `)
        console.log('Result backlog count:', res.rows[0].count)
    } catch (e) {
        console.error('Error:', e)
    }
    await client.end()
}

run()
