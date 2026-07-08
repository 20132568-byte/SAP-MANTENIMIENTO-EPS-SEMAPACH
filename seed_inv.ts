import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
import { getPgPool } from './server/database.ts';

async function run() {
  const pool = getPgPool();
  try {
    // Proveedores
    const suppliers = [
      { name: 'Ferretería Industrial SAC', tax: '20123456789', contact: 'Juan Perez' },
      { name: 'Suministros Eléctricos EIRL', tax: '20987654321', contact: 'Maria Lopez' },
      { name: 'Importaciones Químicas S.A.', tax: '20555555555', contact: 'Carlos Ruiz' },
      { name: 'EPP y Seguridad Laboral SAC', tax: '20444444444', contact: 'Ana Castro' },
      { name: 'Motores y Bombas de Agua S.A.', tax: '20333333333', contact: 'Luis Gomez' }
    ];

    const suppIds = [];
    for (const s of suppliers) {
      const res = await pool.query(`
        INSERT INTO inventario.suppliers (name, tax_id, contact_name, phone)
        VALUES ($1, $2, $3, '999888777')
        RETURNING id
      `, [s.name, s.tax, s.contact]);
      suppIds.push(res.rows[0].id);
    }
    console.log('5 Proveedores insertados.');

    // Conseguir ID area
    const areaRes = await pool.query("SELECT id FROM inventario.areas LIMIT 1");
    if (areaRes.rows.length === 0) throw new Error("No hay areas");
    const areaId = areaRes.rows[0].id;

    // Productos
    const prods = [
      { sku: 'FERR-001', name: 'Tubería PVC 2 pulgadas', desc: 'Tubo de presión para redes', supp: suppIds[0], unit: 'metro' },
      { sku: 'ELEC-002', name: 'Cable THW 12 AWG', desc: 'Rollo de cable eléctrico 100m', supp: suppIds[1], unit: 'rollo' },
      { sku: 'QUIM-003', name: 'Cloro Líquido 10%', desc: 'Bidón de 20 litros para desinfección', supp: suppIds[2], unit: 'bidón' },
      { sku: 'EPPS-004', name: 'Casco de Seguridad', desc: 'Casco amarillo norma ANSI', supp: suppIds[3], unit: 'unidad' },
      { sku: 'BOMB-005', name: 'Sello Mecánico 3/4"', desc: 'Sello para bomba de agua', supp: suppIds[4], unit: 'unidad' }
    ];

    for (const p of prods) {
      await pool.query(`
        INSERT INTO inventario.products (sku, name, description, default_area_id, supplier_id, unit, days_of_coverage)
        VALUES ($1, $2, $3, $4, $5, $6, 30)
        ON CONFLICT (sku) DO NOTHING
      `, [p.sku, p.name, p.desc, areaId, p.supp, p.unit]);
    }
    console.log('5 Productos insertados.');
    
  } catch (err) {
    console.error(err);
  }
}
run();
