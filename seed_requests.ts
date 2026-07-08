import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true', ssl: { rejectUnauthorized: false } })

async function runSeed() {
    console.log('[SEED] Iniciando inyección masiva de solicitudes y ajuste de stock...');

    try {
        // 1. Quitar el "rojo" (Subir stock)
        await pool.query('UPDATE inventario.stock SET quantity = quantity + 1000');
        console.log('[SEED] ✅ Stock actualizado masivamente (+1000 a todo)');

        // 2. Obtener datos base para las solicitudes
        const users = await pool.query("SELECT id FROM inventario.users LIMIT 1");
        if (users.rows.length === 0) {
            throw new Error("No hay usuarios en la tabla inventario.users. Corre el seed principal primero.");
        }
        const worker_id = users.rows[0].id;

        const areas = await pool.query("SELECT id FROM inventario.areas LIMIT 2");
        const area_id = areas.rows[0].id;
        const dest_area_id = areas.rows.length > 1 ? areas.rows[1].id : area_id;

        const products = await pool.query("SELECT id FROM inventario.products LIMIT 2");
        if (products.rows.length === 0) {
            throw new Error("No hay productos en la BD para crear requests.");
        }

        const statuses = [
            'CARGADO', 'VALIDADO', 'PREPARANDO', 'PREPARADO',
            'ENTREGA_PENDIENTE', 'ENTREGADO', 'ANULADO',
            'RECHAZADO', 'PENDIENTE_APROBACION', 'APROBADO',
            'TRANSFERIDO', 'CONFIRMADO'
        ];

        let refCounter = 1000;

        for (const status of statuses) {
            for (let i = 1; i <= 5; i++) {
                refCounter++;
                const reqRes = await pool.query(
                    `INSERT INTO inventario.requests (reference, request_type, status, worker_id, area_id, origin_area_id, dest_area_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [`REQ-${status}-${refCounter}`, 'SALIDA', status, worker_id, area_id, area_id, dest_area_id]
                );
                const reqId = reqRes.rows[0].id;

                // Insertar items (1 item por request para no inflar la DB innecesariamente)
                await pool.query(
                    `INSERT INTO inventario.request_items (request_id, product_id, quantity) VALUES ($1, $2, $3)`,
                    [reqId, products.rows[0].id, (Math.random() * 5 + 1).toFixed(0)]
                );
            }
            console.log(`[SEED] ✅ 5 solicitudes insertadas en estado: ${status}`);
        }

        console.log('[SEED] 🎉 Inyección masiva completada.');
    } catch (e: any) {
        console.error('[SEED ERROR]', e.message);
    } finally {
        process.exit(0);
    }
}

runSeed();
