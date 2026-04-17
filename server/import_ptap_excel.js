
import XLSX from 'xlsx';
import path from 'path';
import os from 'os';
import pg from 'pg';

// Conexión a Base de Datos
const connectionString = "postgresql://postgres.sschzcbnwokfwfwygbyn:Asdqwerty.,$2219@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const excelPath = path.join(os.homedir(), 'Downloads', 'CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx');

async function importData() {
    console.log('🚀 Iniciando proceso de importación masiva de PTAP...');
    
    try {
        console.log('🧹 Limpiando tabla antes de re-importar...');
        await pool.query('TRUNCATE TABLE ptap_readings CASCADE');
        
        const workbook = XLSX.readFile(excelPath);
        const sheetName = 'CONTROL DE PROCESO- ORIGINAL';
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
            throw new Error(`No se encontró la hoja: ${sheetName}`);
        }

        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`Leídas ${data.length} filas del Excel.`);
        
        const readings = [];
        const BATCH_SIZE = 25;

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[1] || isNaN(row[1]) || typeof row[1] !== 'number') continue; 

            // Convertir fecha de Excel a ISO local
            const date = new Date((row[1] - 25569) * 86400 * 1000);
            const fechaStr = date.toISOString().split('T')[0];
            const horaStr = row[2] || "00:00";

            const cleanNum = (val) => {
                if (val === undefined || val === null || val === "-" || val === "" || isNaN(parseFloat(String(val).replace(',', '.')))) return 0;
                if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
                return val;
            };

            const readingData = {
                hora: horaStr,
                caudal: cleanNum(row[3]),
                dosis: { aluminio: cleanNum(row[4]), anionico: cleanNum(row[5]) },
                apertura: { aluminio: cleanNum(row[6]), anionico: cleanNum(row[7]) },
                ingreso: { 
                    turbiedad: cleanNum(row[8]), 
                    conductividad: cleanNum(row[9]), 
                    color: cleanNum(row[10]),
                    alcalinidad: cleanNum(row[11]),
                    ph: cleanNum(row[12]),
                    aluminio: cleanNum(row[13]),
                    dureza: cleanNum(row[14]),
                    ovl: cleanNum(row[15])
                },
                decantador: { 
                    ingreso: { turbiedad: cleanNum(row[16]), color: cleanNum(row[17]), ph: cleanNum(row[18]) },
                    salida: { turbiedad: cleanNum(row[19]), color: cleanNum(row[20]), ph: cleanNum(row[21]) }
                },
                filtros: {
                    ingreso: { turbiedad: cleanNum(row[22]), color: cleanNum(row[23]), ph: cleanNum(row[24]) },
                    salida: { turbiedad: cleanNum(row[25]), color: cleanNum(row[26]), ph: cleanNum(row[27]) }
                },
                tratada: {
                    turbiedad: cleanNum(row[28]),
                    conductividad: cleanNum(row[29]),
                    color: cleanNum(row[30]),
                    ph: cleanNum(row[31]),
                    aluminioResidual: cleanNum(row[32]),
                    cloroResidual: cleanNum(row[33]),
                    dureza: cleanNum(row[34]),
                    ovl: cleanNum(row[35])
                }
            };

            readings.push({
                fecha: fechaStr,
                hora: horaStr,
                operador: 'Importación Excel',
                caudal: readingData.caudal,
                dosis_aluminio: readingData.dosis.aluminio,
                dosis_anionico: readingData.dosis.anionico,
                apertura_aluminio: readingData.apertura.aluminio,
                apertura_anionico: readingData.apertura.anionico,
                ingreso_turbiedad: readingData.ingreso.turbiedad,
                ingreso_conductividad: readingData.ingreso.conductividad,
                ingreso_color: readingData.ingreso.color,
                ingreso_alcalinidad: readingData.ingreso.alcalinidad,
                ingreso_ph: readingData.ingreso.ph,
                ingreso_aluminio: readingData.ingreso.aluminio,
                ingreso_dureza: readingData.ingreso.dureza,
                ingreso_ovl: readingData.ingreso.ovl,
                decantador_turbiedad: readingData.decantador.salida.turbiedad,
                decantador_color: readingData.decantador.salida.color,
                decantador_ph: readingData.decantador.salida.ph,
                filtros_ing_turb: readingData.filtros.ingreso.turbiedad,
                filtros_ing_col: readingData.filtros.ingreso.color,
                filtros_ing_ph: readingData.filtros.ingreso.ph,
                filtros_sal_turb: readingData.filtros.salida.turbiedad,
                filtros_sal_col: readingData.filtros.salida.color,
                filtros_sal_ph: readingData.filtros.salida.ph,
                tratada_turbiedad: readingData.tratada.turbiedad,
                tratada_conductividad: readingData.tratada.conductividad,
                tratada_color: readingData.tratada.color,
                tratada_ph: readingData.tratada.ph,
                tratada_aluminioReal: readingData.tratada.aluminioResidual,
                tratada_cloro: readingData.tratada.cloroResidual,
                tratada_dureza: readingData.tratada.dureza,
                tratada_ovl: readingData.tratada.ovl
            });

            if (readings.length >= BATCH_SIZE) {
                await saveBatch(readings);
                readings.length = 0;
            }
        }

        if (readings.length > 0) {
            await saveBatch(readings);
        }

        console.log('✅ Importación finalizada con éxito.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error crítico:', error);
        process.exit(1);
    }
}

async function saveBatch(batch) {
    try {
        const client = await pool.connect();
        try {
            console.log(`Guardando bloque de ${batch.length} registros...`);
            for (const item of batch) {
                await client.query(
                    `INSERT INTO ptap_readings (
                        fecha, hora, operador, caudal,
                        dosis_aluminio, dosis_anionico, apertura_aluminio, apertura_anionico,
                        ingreso_turbiedad, ingreso_conductividad, ingreso_color, ingreso_alcalinidad,
                        ingreso_ph, ingreso_aluminio, ingreso_dureza, ingreso_ovl,
                        decantador_turbiedad, decantador_color, decantador_ph,
                        filtros_ing_turb, filtros_ing_col, filtros_ing_ph,
                        filtros_sal_turb, filtros_sal_col, filtros_sal_ph,
                        tratada_turbiedad, tratada_conductividad, tratada_color, tratada_ph,
                        tratada_aluminioReal, tratada_cloro, tratada_dureza, tratada_ovl
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
                    )`,
                    [
                        item.fecha, item.hora, item.operador, item.caudal,
                        item.dosis_aluminio, item.dosis_anionico, item.apertura_aluminio, item.apertura_anionico,
                        item.ingreso_turbiedad, item.ingreso_conductividad, item.ingreso_color, item.ingreso_alcalinidad,
                        item.ingreso_ph, item.ingreso_aluminio, item.ingreso_dureza, item.ingreso_ovl,
                        item.decantador_turbiedad, item.decantador_color, item.decantador_ph,
                        item.filtros_ing_turb, item.filtros_ing_col, item.filtros_ing_ph,
                        item.filtros_sal_turb, item.filtros_sal_col, item.filtros_sal_ph,
                        item.tratada_turbiedad, item.tratada_conductividad, item.tratada_color, item.tratada_ph,
                        item.tratada_aluminioReal, item.tratada_cloro, item.tratada_dureza, item.tratada_ovl
                    ]
                );
            }
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Error insertando batch:', e.message);
    }
}

importData();
