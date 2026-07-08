import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true', ssl: { rejectUnauthorized: false } })

async function runInventorySeed() {
    console.log('[SEED] Iniciando inyección de stock de demostración...');

    try {
        const areasToInsert = [
            { name: 'Área de Producción', code: 'PRD' },
            { name: 'Área de Distribución', code: 'DST' },
            { name: 'Logística', code: 'LOG' }
        ];
        
        const areaMap: Record<string, string> = {};
        for (const a of areasToInsert) {
            let res = await pool.query('SELECT id, code FROM inventario.areas WHERE code = $1', [a.code]);
            if (res.rows.length === 0) {
                res = await pool.query('INSERT INTO inventario.areas (name, code) VALUES ($1, $2) RETURNING id, code', [a.name, a.code]);
            }
            areaMap[res.rows[0].code] = res.rows[0].id;
        }

        // 2. Asegurar categorías y proveedores base
        const cats = [
            { name: 'Electromecánico', area: 'PRD' }, 
            { name: 'Hidráulico', area: 'DST' }, 
            { name: 'Seguridad y EPP', area: 'LOG' }, 
            { name: 'Herramientas', area: 'LOG' }
        ];
        for (const c of cats) {
            let res = await pool.query('SELECT id FROM inventario.categories WHERE name = $1', [c.name]);
            if (res.rows.length === 0) await pool.query('INSERT INTO inventario.categories (name, area_id) VALUES ($1, $2)', [c.name, areaMap[c.area]]);
        }

        const catIds: any = {};
        const catsDb = await pool.query(`SELECT id, name FROM inventario.categories`);
        catsDb.rows.forEach(r => catIds[r.name] = r.id);

        // 3. Crear Productos sin supplier_id
        const products = [
            { sku: 'BMB-001', name: 'Bomba Centrífuga 30HP', desc: 'Para captación en pozos profundos', unit: 'unidad', cat: 'Electromecánico', areaCode: 'PRD' },
            { sku: 'MTR-002', name: 'Motor Eléctrico 50HP', desc: 'Trifásico, uso continuo OPAPTAR', unit: 'unidad', cat: 'Electromecánico', areaCode: 'PRD' },
            { sku: 'TUB-110', name: 'Tubería PVC 110mm PN10', desc: 'Tubería matriz para redes primarias', unit: 'm', cat: 'Hidráulico', areaCode: 'DST' },
            { sku: 'VAL-004', name: 'Válvula Compuerta 4"', desc: 'Para control de flujo en derivaciones', unit: 'unidad', cat: 'Hidráulico', areaCode: 'DST' },
            { sku: 'EPP-001', name: 'Casco de Seguridad Dielectrico', desc: 'Color amarillo para operarios', unit: 'unidad', cat: 'Seguridad y EPP', areaCode: 'LOG' },
            { sku: 'HRR-005', name: 'Llave Stilson 24"', desc: 'Uso pesado para tuberías', unit: 'unidad', cat: 'Herramientas', areaCode: 'LOG' }
        ];

        for (const p of products) {
            let res = await pool.query('SELECT id FROM inventario.products WHERE sku = $1', [p.sku]);
            if (res.rows.length === 0) {
                await pool.query(
                    `INSERT INTO inventario.products (sku, name, description, unit, category_id, default_area_id) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [p.sku, p.name, p.desc, p.unit, catIds[p.cat], areaMap[p.areaCode]]
                );
            }
        }

        // 4. Inyectar Stock por área (1 a 4 items por sección según requerimiento)
        const stocks = [
            { sku: 'BMB-001', area: 'PRD', q: 2 },
            { sku: 'MTR-002', area: 'PRD', q: 1 },
            { sku: 'TUB-110', area: 'DST', q: 150 },
            { sku: 'VAL-004', area: 'DST', q: 4 },
            { sku: 'EPP-001', area: 'LOG', q: 25 },
            { sku: 'HRR-005', area: 'LOG', q: 3 }
        ];

        for (const s of stocks) {
            const pId = (await pool.query("SELECT id FROM inventario.products WHERE sku=$1", [s.sku])).rows[0].id;
            let res = await pool.query('SELECT id FROM inventario.stock WHERE product_id=$1 AND area_id=$2', [pId, areaMap[s.area]]);
            if (res.rows.length === 0) {
                await pool.query('INSERT INTO inventario.stock (product_id, area_id, quantity) VALUES ($1, $2, $3)', [pId, areaMap[s.area], s.q]);
            } else {
                await pool.query('UPDATE inventario.stock SET quantity=$1 WHERE product_id=$2 AND area_id=$3', [s.q, pId, areaMap[s.area]]);
            }
        }

        console.log('[SEED] ✅ Productos y Stock de presentación creados exitosamente!');
    } catch (e: any) {
        console.error('[SEED ERROR]', e.message);
    } finally {
        process.exit(0);
    }
}

runInventorySeed();
