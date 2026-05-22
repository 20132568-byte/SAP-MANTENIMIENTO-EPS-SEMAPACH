import initSqlJs from 'sql.js';
import fs from 'fs';

async function checkLocal() {
    const SQL = await initSqlJs();
    const dbFile = fs.readFileSync('mantenimiento.db');
    const db = new SQL.Database(dbFile);
    
    const res = db.exec("SELECT strftime('%Y-%m', fecha) as mes, COUNT(*) as total FROM water_readings GROUP BY mes");
    console.log(JSON.stringify(res, null, 2));
}

checkLocal().catch(console.error);
