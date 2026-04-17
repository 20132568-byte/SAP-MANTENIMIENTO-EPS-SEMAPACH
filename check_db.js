
import pg from 'pg';
const pool = new pg.Pool({
    connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT DISTINCT fecha FROM daily_records ORDER BY fecha DESC LIMIT 50');
        console.log('Fechas encontradas:', res.rows.map(r => r.fecha));
    } finally {
        client.release();
        await pool.end();
    }
}
check();
