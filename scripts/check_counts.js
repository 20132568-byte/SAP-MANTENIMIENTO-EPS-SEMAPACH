import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL.split('?')[0],
    ssl: { rejectUnauthorized: false }
})

async function run() {
    await client.connect()
    const tables = [
        'assets',
        'failures',
        'daily_records',
        'preventive_config',
        'preventive_events',
        'ptap_readings',
        'water_stations',
        'station_equipment',
        'maintenance_activities',
        'station_maintenance_log',
        'maintenance_records',
        'initial_diagnosis',
        'operators',
        'catalogs',
        'weekly_snapshots',
        'produccion_bd',
        'produccion_surtidor',
        'produccion_rsanjuan',
        'produccion_metas',
        'users'
    ]

    console.log('--- CONTEO DE REGISTROS POR TABLA ---')
    let totalCombined = 0
    for (const table of tables) {
        try {
            const res = await client.query(`SELECT COUNT(*) as count FROM ${table}`)
            const count = parseInt(res.rows[0].count, 10)
            console.log(`- ${table}: ${count}`)
            totalCombined += count
        } catch (e) {
            console.log(`- ${table}: Error (${e.message})`)
        }
    }
    console.log(`\nTotal combinado de todas las tablas: ${totalCombined}`)
    await client.end()
}

run()
