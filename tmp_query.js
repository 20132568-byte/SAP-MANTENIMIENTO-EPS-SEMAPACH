import pg from 'pg';

// Misma conexión usada en import_ptap_excel.js
const pool = new pg.Pool({
    connectionString: "postgresql://postgres:KkFclLIDpZWhGByFfKSuYhXwIuonWdMM@junction.proxy.rlwy.net:16955/railway",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    const res = await client.query(
        "SELECT hora, filtros_sal_turb, tratada_turbiedad FROM ptap_readings WHERE fecha = '2026-01-01' ORDER BY hora ASC"
    );
    console.log('Resultados para 2026-01-01:');
    console.table(res.rows);
    client.release();
    process.exit(0);
}

run().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
