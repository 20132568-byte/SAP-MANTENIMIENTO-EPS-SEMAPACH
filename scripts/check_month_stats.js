import pg from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require';

async function check() {
    const pool = new pg.Pool({ 
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        const febStats = await client.query(`
            SELECT 
                AVG(presion) as avg_p,
                AVG(continuidad) as avg_c
            FROM water_readings 
            WHERE fecha BETWEEN '2026-02-01' AND '2026-02-28'
        `);
        
        const marStats = await client.query(`
            SELECT 
                AVG(presion) as avg_p,
                AVG(continuidad) as avg_c
            FROM water_readings 
            WHERE fecha BETWEEN '2026-03-01' AND '2026-03-31'
        `);

        const junStats = await client.query(`
            SELECT 
                AVG(presion) as avg_p,
                AVG(continuidad) as avg_c
            FROM water_readings 
            WHERE fecha BETWEEN '2026-06-01' AND '2026-06-30'
        `);
        
        console.log('Feb:', febStats.rows[0]);
        console.log('Mar:', marStats.rows[0]);
        console.log('Jun:', junStats.rows[0]);
        
        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
