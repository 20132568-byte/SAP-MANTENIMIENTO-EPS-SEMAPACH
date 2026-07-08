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
            SELECT DISTINCT tipo_unidad, COUNT(*) as count
            FROM preventive_config
            GROUP BY tipo_unidad
        `)
        console.log('Configs in preventive_config by tipo_unidad:')
        res.rows.forEach(r => {
            console.log(`- ${r.tipo_unidad}: ${r.count}`)
        })

        const assetsRes = await client.query(`
            SELECT DISTINCT tipo_unidad, categoria, COUNT(*) as count
            FROM assets
            WHERE activo = 1
            GROUP BY tipo_unidad, categoria
        `)
        console.log('\nAssets in DB by tipo_unidad and categoria:')
        assetsRes.rows.forEach(r => {
            console.log(`- [${r.categoria}] ${r.tipo_unidad}: ${r.count}`)
        })
    } catch (e) {
        console.error('Error:', e)
    }
    await client.end()
}

run()
