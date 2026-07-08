import pg from 'pg'
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true', ssl: { rejectUnauthorized: false } })

async function run() {
    try {
        await pool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS area_id UUID`);
        console.log('[SCHEMA] ✅ Columna area_id añadida a public.users');
    } catch (e: any) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
