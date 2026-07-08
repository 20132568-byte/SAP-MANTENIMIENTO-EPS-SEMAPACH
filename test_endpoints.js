import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'semapach_jwt_secret_2026_opaptar_production';
const token = jwt.sign({ id: 1, username: 'DanielAdmin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

async function check(path) {
  try {
    const r = await fetch(`http://localhost:3001/api/inventory${path}`, { headers: { 'Authorization': 'Bearer ' + token }});
    console.log(`[${r.status}] ${path}`);
    if (!r.ok) {
      console.log('Error:', await r.text());
    }
  } catch(e) {
    console.log(`[FETCH ERR] ${path}`, e.message);
  }
}

async function run() {
  await check('/auth/me');
  await check('/areas');
  await check('/suppliers');
  await check('/products');
  await check('/stock/current');
  await check('/requests');
  await check('/notifications');
  await check('/kpis');
}
run();
