import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true', ssl: { rejectUnauthorized: false } })

async function run() {
    try {
        console.log('Renombrando "Electromecánica y Flota Operaciones" a "Electromecánica y Flota"...')
        await pool.query("UPDATE inventario.areas SET name = 'Electromecánica y Flota' WHERE name = 'Electromecánica y Flota Operaciones'")
        
        console.log('Creando el área "Operaciones" si no existe...')
        const opRes = await pool.query("SELECT id FROM inventario.areas WHERE name = 'Operaciones'")
        if (opRes.rows.length === 0) {
            await pool.query("INSERT INTO inventario.areas (name, code) VALUES ('Operaciones', 'OPE')")
        }
        
        console.log('--- ÁREAS FINALES ---')
        const final = await pool.query('SELECT name FROM inventario.areas')
        console.table(final.rows)
        
    } catch (e) {
        console.error(e)
    } finally {
        process.exit(0)
    }
}
run()


