
import pg from 'pg';
const pool = new pg.Pool({
    connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM assets) as assets,
                (SELECT COUNT(*) FROM operators) as operators,
                (SELECT COUNT(*) FROM daily_records) as daily_records,
                (SELECT COUNT(*) FROM failures) as failures,
                (SELECT COUNT(*) FROM water_readings) as water_readings
        `);
        console.log('Conteos en Supabase:', res.rows[0]);
    } finally {
        client.release();
        await pool.end();
    }
}
check();
