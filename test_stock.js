import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'semapach_jwt_secret_2026_opaptar_production';
const token = jwt.sign({ id: 1, username: 'DanielAdmin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

async function run() {
  const r = await fetch(`http://localhost:3001/api/inventory/stock/current`, { headers: { 'Authorization': 'Bearer ' + token }});
  console.log(`[${r.status}] /stock/current`);
  console.log(await r.text());
  
  const s = await fetch(`http://localhost:3001/api/inventory/suppliers`, { headers: { 'Authorization': 'Bearer ' + token }});
  console.log(`[${s.status}] /suppliers`);
  console.log(await s.text());
}
run();
