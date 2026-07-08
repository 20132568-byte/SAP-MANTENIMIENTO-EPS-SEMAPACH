import pg from 'pg';
import dotenv from 'dotenv';

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
    const areaRes = await pool.query("SELECT id FROM inventario.areas LIMIT 1")
    const fallbackAreaId = areaRes.rows[0].id
    
    console.log("Intentando insertar admin con ID 1...");
    await pool.query(`
      INSERT INTO inventario.users (id, username, email, password_hash, full_name, role, area_id, active)
      VALUES ($1, $2, $3, 'N/A', $4, 'admin', $5, true)
      ON CONFLICT (id) DO NOTHING
    `, [1, 'DanielAdmin', 'admin@admin.com', 'Administrador Global', fallbackAreaId])
    console.log("Insert exitoso!");
    
    const user = await pool.query("SELECT * FROM inventario.users WHERE id = 1");
    console.log("User en BD:", user.rows[0]);
  } catch(e) {
    console.error("Error BD:", e);
  } finally {
    pool.end();
  }
}
run();
