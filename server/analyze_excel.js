
import XLSX from 'xlsx';
import path from 'path';
import os from 'os';

const excelPath = path.join(os.homedir(), 'Downloads', 'CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx');

function analyze() {
    console.log('--- Analizando Estructura de Excel ---');
    const workbook = XLSX.readFile(excelPath);
    
    workbook.SheetNames.forEach(name => {
        const worksheet = workbook.Sheets[name];
        if (name.includes('CONTROL DE PROCESO')) {
             const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
             console.log(`\n--- HOJA: ${name} ---`);
             // Imprimir encabezados (parece que están por la fila 15-20)
             for(let i = 15; i < 25; i++) {
                 console.log(`Fila ${i}:`, JSON.stringify(data[i]));
             }
             // Imprimir una fila de datos reales
             const firstDataRow = data.find(row => row && row[1] > 40000); // Buscar fechas de Excel
             console.log('\nEjemplo de fila de datos:', JSON.stringify(firstDataRow));
        }
    });
}

try {
    analyze();
} catch (e) {
    console.error('Error al leer el archivo:', e.message);
}
