import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER || 'semapach',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'semapach',
  password: process.env.DB_PASSWORD || 'semapach',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
  try {
    const resArea = await pool.query("SELECT id FROM inventario.areas WHERE code = 'LOG' LIMIT 1");
    const areaId = resArea.rows[0].id;

    // Buscar usuarios que sean admins en la tabla principal
    const resAdmins = await pool.query("SELECT id, username, email, password_hash, full_name, role FROM usuarios WHERE role = 'admin'");
    
    for (const admin of resAdmins.rows) {
      await pool.query(`
        INSERT INTO inventario.users (id, username, email, password_hash, full_name, role, area_id, active)
        VALUES ($1, $2, $3, $4, $5, 'admin', $6, true)
        ON CONFLICT (id) DO UPDATE SET role = 'admin', area_id = $6
      `, [admin.id, admin.username, admin.email, admin.password_hash, admin.full_name, areaId]);
      console.log(`✅ Admin inyectado permanentemente en inventario: ${admin.username}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
