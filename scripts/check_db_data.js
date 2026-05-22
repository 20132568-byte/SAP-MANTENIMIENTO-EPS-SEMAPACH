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
        const res = await client.query(`
            SELECT 
                TO_CHAR(fecha, 'YYYY-MM') as mes, 
                COUNT(*) as total,
                AVG(presion) as avg_p,
                AVG(continuidad) as avg_c
            FROM water_readings 
            GROUP BY mes 
            ORDER BY mes
        `);
        
        const sample = await client.query('SELECT fecha, distrito, zona, presion, continuidad FROM water_readings LIMIT 5');
        
        fs.writeFileSync('db_results.json', JSON.stringify({
            summary: res.rows,
            sample: sample.rows
        }, null, 2));
        console.log('Results saved to db_results.json');
        
        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
