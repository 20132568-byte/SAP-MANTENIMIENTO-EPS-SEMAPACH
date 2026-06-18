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
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'water_readings'");
        fs.writeFileSync('schema.json', JSON.stringify(res.rows, null, 2));
        console.log('Schema saved');
        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
