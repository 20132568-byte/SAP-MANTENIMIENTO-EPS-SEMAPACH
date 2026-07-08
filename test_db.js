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
    const res = await pool.query("SELECT id, username, role FROM usuarios WHERE username = 'DanielAdmin' LIMIT 1");
    console.log("Usuarios principales:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
