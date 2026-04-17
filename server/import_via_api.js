
import XLSX from 'xlsx';
import path from 'path';
import os from 'os';

const excelPath = path.join(os.homedir(), 'Downloads', 'CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx');
const API_URL = 'https://semapach-mantenimiento-production.up.railway.app/api/water/ptap/bulk';
const BATCH_SIZE = 10;
const DELAY_MS = 1000;

function parseExcel() {
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets['CONTROL DE PROCESO- ORIGINAL'];
    if (!worksheet) throw new Error('Hoja no encontrada');

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const readings = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1] || typeof row[1] !== 'number' || row[1] < 40000) continue;

        const date = new Date((row[1] - 25569) * 86400 * 1000);
        const fechaStr = date.toISOString().split('T')[0];

        const c = (val) => {
            if (val === undefined || val === null || val === '-' || val === '') return 0;
            if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
            return typeof val === 'number' ? val : 0;
        };

        readings.push({
            fecha: fechaStr,
            hora: row[2] || '00:00',
            operador: 'Importación Excel 2026',
            caudal: c(row[3]),
            dosis_aluminio: c(row[4]),
            dosis_anionico: c(row[5]),
            apertura_aluminio: c(row[6]),
            apertura_anionico: c(row[7]),
            ingreso_turbiedad: c(row[8]),
            ingreso_conductividad: c(row[9]),
            ingreso_color: c(row[10]),
            ingreso_alcalinidad: c(row[11]),
            ingreso_ph: c(row[12]),
            ingreso_aluminio: c(row[13]),
            ingreso_dureza: c(row[14]),
            ingreso_ovl: c(row[15]),
            decantador_turbiedad: c(row[16]),
            decantador_color: c(row[17]),
            decantador_ph: c(row[18]),
            filtros_ing_turb: c(row[19]),
            filtros_ing_col: c(row[20]),
            filtros_ing_ph: c(row[21]),
            filtros_sal_turb: c(row[22]),
            filtros_sal_col: c(row[23]),
            filtros_sal_ph: c(row[24]),
            tratada_turbiedad: c(row[25]),
            tratada_conductividad: c(row[26]),
            tratada_color: c(row[27]),
            tratada_ph: c(row[28]),
            tratada_aluminioReal: c(row[29]),
            tratada_cloro: c(row[30]),
            tratada_dureza: c(row[31]),
            tratada_ovl: c(row[32])
        });
    }
    return readings;
}

async function sendBatch(batch) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings: batch })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json));
    return json;
}

async function main() {
    console.log('🚀 Procesando Excel...');
    const readings = parseExcel();
    console.log(`📊 Encontradas ${readings.length} filas válidas.`);

    let inserted = 0;
    for (let i = 0; i < readings.length; i += BATCH_SIZE) {
        const batch = readings.slice(i, i + BATCH_SIZE);
        try {
            const result = await sendBatch(batch);
            inserted += result.inserted || batch.length;
            process.stdout.write(`\r✅ Insertados: ${inserted}/${readings.length}`);
        } catch (e) {
            console.error(`\n❌ Error en bloque ${i}: ${e.message}`);
        }
        // Pequeña pausa para no saturar el servidor
        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log(`\n\n🎉 Importación completa: ${inserted} registros en la base de datos.`);
}

main().catch(console.error);
