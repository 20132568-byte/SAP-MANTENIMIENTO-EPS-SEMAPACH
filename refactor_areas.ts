import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true', ssl: { rejectUnauthorized: false } })

async function run() {
    try {
        const res = await pool.query('SELECT id, name FROM inventario.areas')
        console.table(res.rows)

        const validNames = ['Producción', 'Distribución y Pérdidas', 'Electromecánica y Flota Operaciones', 'Logística']
        const keepIds = new Set<string>()

        for (const validName of validNames) {
            // Keep the first one that matches the name
            const matching = res.rows.find(r => r.name.toLowerCase() === validName.toLowerCase() || 
                                              r.name.toLowerCase().includes(validName.substring(0, 5).toLowerCase()))
            if (matching) {
                keepIds.add(matching.id)
                console.log(`Manteniendo: ${matching.name} (${matching.id}) -> mapeado a ${validName}`)
                await pool.query('UPDATE inventario.areas SET name = $1 WHERE id = $2', [validName, matching.id])
            } else {
                console.log(`Falta área: ${validName}, insertando...`)
                const insertRes = await pool.query('INSERT INTO inventario.areas (name, code) VALUES ($1, $2) RETURNING id', [validName, validName.substring(0, 3).toUpperCase()])
                keepIds.add(insertRes.rows[0].id)
            }
        }

        // Migrate users from duplicate areas to valid ones
        const validAreasRes = await pool.query('SELECT id, name FROM inventario.areas WHERE id = ANY($1)', [[...keepIds]])
        const validAreas = validAreasRes.rows

        for (const row of res.rows) {
            if (!keepIds.has(row.id)) {
                console.log(`Borrando duplicado/basura: ${row.name} (${row.id})`)
                // Find closest valid area to map users to
                let targetArea = validAreas[0].id // Default to first area
                for (const va of validAreas) {
                    if (row.name.toLowerCase().includes(va.name.substring(0, 4).toLowerCase()) || 
                        va.name.toLowerCase().includes(row.name.substring(0, 4).toLowerCase())) {
                        targetArea = va.id
                        break;
                    }
                }
                
                console.log(`  Migrando dependencias de ${row.id} a ${targetArea}`)
                // Mapear dependencias
                await pool.query('UPDATE inventario.users SET area_id = $1 WHERE area_id = $2', [targetArea, row.id])
                await pool.query('UPDATE users SET area_id = $1 WHERE area_id = $2', [targetArea, row.id])
                await pool.query('UPDATE inventario.requests SET origin_area_id = $1 WHERE origin_area_id = $2', [targetArea, row.id])
                await pool.query('UPDATE inventario.requests SET dest_area_id = $1 WHERE dest_area_id = $2', [targetArea, row.id])
                await pool.query('UPDATE inventario.requests SET current_area_id = $1 WHERE current_area_id = $2', [targetArea, row.id])
                
                // Borrar
                await pool.query('DELETE FROM inventario.areas WHERE id = $1', [row.id])
            }
        }
        console.log('--- DB LIMPIA ---')
    } catch (e) {
        console.error(e)
    } finally {
        process.exit(0)
    }
}
run()
