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
            SELECT COUNT(DISTINCT a.id) as unique_assets, a.categoria
            FROM assets a
            JOIN preventive_config pc ON (pc.asset_id = a.id OR (pc.asset_id IS NULL AND pc.tipo_unidad = a.tipo_unidad))
            WHERE a.activo = 1
            GROUP BY a.categoria
        `)
        console.log('Unique assets with backlog by category:')
        res.rows.forEach(r => {
            console.log(`- ${r.categoria}: ${r.unique_assets}`)
        })
    } catch (e) {
        console.error('Error:', e)
    }
    await client.end()
}

run()
