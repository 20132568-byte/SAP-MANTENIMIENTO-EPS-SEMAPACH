import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'semapach_jwt_secret_2026_opaptar_production';
const token = jwt.sign({ id: 1, username: 'DanielAdmin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

fetch('http://localhost:3001/api/inventory/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Fetch err:', err));
