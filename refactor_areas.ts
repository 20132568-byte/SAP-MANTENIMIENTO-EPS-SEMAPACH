import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true', ssl: { rejectUnauthorized: false } })

async function run() {
    try {
        console.log('--- Iniciando Refactorización Estructural de Áreas y Roles ---')
        
        // 1. Asegurar las 4 áreas oficiales (Producción, Distribución y Pérdidas, Electromecánica y Flota Operaciones, Logística)
        const areaNames = [
            'Producción',
            'Distribución y Pérdidas',
            'Electromecánica y Flota Operaciones',
            'Logística'
        ]
        
        const areaIds: Record<string, string> = {}

        for (const name of areaNames) {
            let res = await pool.query('SELECT id FROM inventario.areas WHERE name = $1 LIMIT 1', [name])
            if (res.rows.length === 0) {
                // Generar UUID aleatorio en postgres
                const insertRes = await pool.query('INSERT INTO inventario.areas (name, code) VALUES ($1, $2) RETURNING id', [name, name.substring(0, 3).toUpperCase()])
                areaIds[name] = insertRes.rows[0].id
                console.log(`[Áreas] Creada área: ${name}`)
            } else {
                areaIds[name] = res.rows[0].id
                console.log(`[Áreas] Ya existe área: ${name}`)
            }
        }

        // 2. Mapear los usuarios actuales hacia los 4 roles (operario, jefatura, gerencia, admin)
        // y asignarles su área lógica
        
        // Drop constraint in inventario.users
        try {
            await pool.query('ALTER TABLE inventario.users DROP CONSTRAINT users_role_check')
            console.log('[Roles] Constraint users_role_check eliminado.')
        } catch (e) {
            console.log('[Roles] No se pudo eliminar constraint o ya no existe.')
        }

        const mapRoles = async (oldRoles: string[], newRole: string, newAreaName?: string) => {
            const areaIdQuery = newAreaName ? `, area_id = '${areaIds[newAreaName]}'` : ''
            for (const oldRole of oldRoles) {
                const query = `UPDATE users SET role = $1 ${areaIdQuery} WHERE role = $2`
                await pool.query(query, [newRole, oldRole])
                
                const queryInv = `UPDATE inventario.users SET role = $1 ${areaIdQuery} WHERE role = $2`
                await pool.query(queryInv, [newRole, oldRole])
            }
        }

        console.log('[Roles] Migrando usuarios a los nuevos roles...')
        // almacenero -> operario (Logística)
        await mapRoles(['almacenero'], 'operario', 'Logística')
        // jefe logística -> jefatura (Logística)
        await mapRoles(['jefatura_logistica', 'jefe_logistica'], 'jefatura', 'Logística')
        // jefe producción -> jefatura (Producción)
        await mapRoles(['jefatura_produccion', 'jefe_produccion'], 'jefatura', 'Producción')
        // jefe distribución -> jefatura (Distribución y Pérdidas)
        await mapRoles(['jefatura_distribucion', 'jefe_distribucion'], 'jefatura', 'Distribución y Pérdidas')
        // operador, mantenimiento, trabajador -> operario
        await mapRoles(['operador', 'mantenimiento', 'trabajador'], 'operario')

        console.log('[Migración] ✅ Roles y áreas actualizadas exitosamente en la BD.')
        
    } catch (e: any) {
        console.error('ERROR AL MIGRAR:', e)
    } finally {
        process.exit(0)
    }
}
run();
