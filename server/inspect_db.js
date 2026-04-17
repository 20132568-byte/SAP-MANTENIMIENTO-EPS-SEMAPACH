import pg from 'pg';

const pool = new pg.Pool({
    connectionString: 'postgresql://postgres:KkFclLIDpZWhGByFfKSuYhXwIuonWdMM@junction.proxy.rlwy.net:16955/railway',
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    const client = await pool.connect();
    try {
        const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ptap_readings' ORDER BY ordinal_position");
        console.log('COLUMNAS DE ptap_readings:');
        cols.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));
        
        const sample = await client.query("SELECT * FROM ptap_readings LIMIT 1");
        if (sample.rows.length > 0) {
            console.log('\nEJEMPLO DE FILA:');
            console.log(JSON.stringify(sample.rows[0], null, 2));
        } else {
            console.log('\nLa tabla está VACÍA.');
        }
    } finally {
        client.release();
        process.exit(0);
    }
}

inspect();
