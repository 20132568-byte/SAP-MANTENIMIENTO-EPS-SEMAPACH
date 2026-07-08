import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
import pg from 'pg';
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
    const r = await pool.query("SELECT COUNT(*) FROM inventario.products");
    console.log("Total Products:", r.rows[0].count);
    const rs = await pool.query("SELECT COUNT(*) FROM inventario.suppliers");
    console.log("Total Suppliers:", rs.rows[0].count);
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    pool.end();
  }
}
run();
