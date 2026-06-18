
import pg from 'pg';

const PASS = 'Asdqwerty.,$2219';
const ID = 'sschzcbnwokfwfwygbyn';

const variations = [
    `postgresql://postgres:${PASS}@db.${ID}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ID}:${PASS}@aws-0-us-west-2.pooler.supabase.co:6543/postgres?sslmode=require`,
    `postgresql://postgres.${ID}:${PASS}@aws-0-us-west-2.pooler.supabase.co:5432/postgres?sslmode=require`
];

async function test() {
    for (const url of variations) {
        console.log(`\nProbando con: ${url.split('@')[1]}`);
        const pool = new pg.Pool({ 
            connectionString: url,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });
        try {
            const client = await pool.connect();
            const res = await client.query('SELECT 1 as connected');
            console.log('✅ EXITO:', res.rows[0]);
            client.release();
            await pool.end();
            process.exit(0);
        } catch (e) {
            console.error('❌ FALLO:', e.message);
        } finally {
            await pool.end();
        }
    }
}

test();
