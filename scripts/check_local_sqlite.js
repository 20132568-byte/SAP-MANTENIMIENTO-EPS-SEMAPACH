import sqlite3 from 'sqlite3';
import fs from 'fs';

const db = new sqlite3.Database('mantenimiento.db');

db.all("SELECT strftime('%Y-%m', fecha) as mes, COUNT(*) as total FROM water_readings GROUP BY mes", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        fs.writeFileSync('sqlite_summary.json', JSON.stringify(rows, null, 2));
        console.log('Local summary saved');
    }
    db.close();
});
