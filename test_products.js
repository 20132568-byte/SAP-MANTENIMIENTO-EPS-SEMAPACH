import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'semapach_jwt_secret_2026_opaptar_production';
const token = jwt.sign({ id: 1, username: 'DanielAdmin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

async function run() {
  const r = await fetch(`http://localhost:3001/api/inventory/products`, { headers: { 'Authorization': 'Bearer ' + token }});
  console.log(`[${r.status}] /products`);
  console.log(await r.text());
}
run();
