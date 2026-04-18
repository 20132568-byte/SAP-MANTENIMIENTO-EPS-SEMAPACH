/**
 * Script SIMPLE para importar PTAP - Sin transacciones, INSERT directo
 */

import XLSX from 'xlsx'
import { dbRun } from './database.ts'

const filePath = 'd:/CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx'

console.log('[PTAP SIMPLE] Iniciando importación...')

const wb = XLSX.readFile(filePath)
const ws = wb.Sheets['CONTROL DE PROCESO- ORIGINAL']
const data = XLSX.utils.sheet_to_json(ws, {header: 1})

console.log('[PTAP SIMPLE] Filas totales:', data.length)

function parseExcelDate(dateValue) {
    if (!dateValue) return ''
    if (typeof dateValue === 'number') {
        const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000))
        return date.toISOString().split('T')[0]
    }
    if (typeof dateValue === 'string') {
        const str = dateValue.trim()
        if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
            const [day, month, year] = str.split('/')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
    }
    return dateValue?.toString().substring(0, 10) || ''
}

let inserted = 0
let updated = 0
let skipped = 0
let errors = 0

for (let i = 13; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) continue
    
    const fechaStr = parseExcelDate(row[1])
    if (!fechaStr || fechaStr.length < 10) {
        skipped++
        continue
    }
    
    const year = parseInt(fechaStr.substring(0, 4))
    if (year !== 2026) {
        skipped++
        continue
    }
    
    const getNum = (idx, def = 0) => {
        if (row[idx] === undefined || row[idx] === null) return def
        const val = parseFloat(row[idx].toString().replace(',', '.'))
        return isNaN(val) ? def : val
    }
    
    try {
        // Verificar si existe
        const existing = await dbRun(
            'SELECT id FROM ptap_readings WHERE fecha = $1 AND hora = $2',
            fechaStr,
            row[2] ? row[2].toString().trim() : '08:00'
        )
        
        if (existing) {
            // Actualizar
            await dbRun(`
                UPDATE ptap_readings SET
                    caudal = $1, dosis_aluminio = $2, dosis_anionico = $3,
                    apertura_aluminio = $4, apertura_anionico = $5,
                    ingreso_turbiedad = $6, ingreso_conductividad = $7, ingreso_color = $8,
                    ingreso_alcalinidad = $9, ingreso_ph = $10, ingreso_aluminio = $11, ingreso_dureza = $12,
                    decantador_turbiedad = $13, decantador_color = $14, decantador_ph = $15,
                    filtros_ing_turb = $16, filtros_ing_col = $17, filtros_ing_ph = $18,
                    filtros_sal_turb = $19, filtros_sal_col = $20, filtros_sal_ph = $21,
                    tratada_turbiedad = $22, tratada_conductividad = $23, tratada_color = $24,
                    tratada_ph = $25, tratada_aluminioreal = $26, tratada_cloro = $27,
                    tratada_dureza = $28, tratada_ovl = $29
                WHERE fecha = $30 AND hora = $31
            `,
                getNum(3, 0), getNum(4, 0), getNum(5, 0),
                getNum(6, 0), getNum(7, 0),
                getNum(8, 0), getNum(9, 0), getNum(10, 0),
                getNum(11, 0), getNum(12, 0), getNum(13, 0), getNum(14, 0),
                getNum(15, 0), getNum(16, 0), getNum(17, 0),
                getNum(18, 0), getNum(19, 0), getNum(20, 0),
                getNum(21, 0), getNum(22, 0), getNum(23, 0),
                getNum(24, 0), getNum(25, 0), getNum(26, 0),
                getNum(27, 0), getNum(28, 0), getNum(29, 0), getNum(30, 0),
                fechaStr, row[2] ? row[2].toString().trim() : '08:00'
            )
            updated++
        } else {
            // Insertar
            await dbRun(`
                INSERT INTO ptap_readings (
                    fecha, hora, caudal, dosis_aluminio, dosis_anionico,
                    apertura_aluminio, apertura_anionico,
                    ingreso_turbiedad, ingreso_conductividad, ingreso_color,
                    ingreso_alcalinidad, ingreso_ph, ingreso_aluminio, ingreso_dureza,
                    decantador_turbiedad, decantador_color, decantador_ph,
                    filtros_ing_turb, filtros_ing_col, filtros_ing_ph,
                    filtros_sal_turb, filtros_sal_col, filtros_sal_ph,
                    tratada_turbiedad, tratada_conductividad, tratada_color,
                    tratada_ph, tratada_aluminioreal, tratada_cloro,
                    tratada_dureza, tratada_ovl
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
            `,
                fechaStr, row[2] ? row[2].toString().trim() : '08:00',
                getNum(3, 0), getNum(4, 0), getNum(5, 0),
                getNum(6, 0), getNum(7, 0),
                getNum(8, 0), getNum(9, 0), getNum(10, 0),
                getNum(11, 0), getNum(12, 0), getNum(13, 0), getNum(14, 0),
                getNum(15, 0), getNum(16, 0), getNum(17, 0),
                getNum(18, 0), getNum(19, 0), getNum(20, 0),
                getNum(21, 0), getNum(22, 0), getNum(23, 0),
                getNum(24, 0), getNum(25, 0), getNum(26, 0),
                getNum(27, 0), getNum(28, 0), getNum(29, 0), getNum(30, 0), getNum(31, 0)
            )
            inserted++
        }
        
        if ((inserted + updated) % 100 === 0) {
            console.log(`[PROGRESO] Insertados: ${inserted}, Actualizados: ${updated}, Saltados: ${skipped}`)
        }
    } catch (e) {
        console.error('Error en fila', i, ':', e.message)
        errors++
    }
}

console.log('\n=== PTAP SIMPLE - RESULTADOS ===')
console.log('✅ Insertados:', inserted)
console.log('🔄 Actualizados:', updated)
console.log('⏭️ Saltados:', skipped)
console.log('❌ Errores:', errors)
console.log('Total procesados:', inserted + updated + skipped + errors)

process.exit(0)
