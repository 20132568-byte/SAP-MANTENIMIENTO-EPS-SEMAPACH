import XLSX from 'xlsx';
import path from 'path';
import os from 'os';

const excelPath = path.join(os.homedir(), 'Downloads', 'CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx');

async function debugHeader() {
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheetName = 'CONTROL DE PROCESO- ORIGINAL';
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Buscamos la fila donde empiezan los datos (donde aparezca una fecha o el primer valor numérico relevante)
        // O buscamos las filas de cabecera
        for(let i=0; i<min(15, data.length); i++) {
            console.log(`\n--- FILA ${i} ---`);
            const row = data[i];
            if (row) {
                row.forEach((v, idx) => {
                    if (v !== undefined && v !== null && v !== "") {
                        console.log(`[Col ${idx}]: ${v}`);
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

function min(a, b) { return a < b ? a : b; }

debugHeader();
