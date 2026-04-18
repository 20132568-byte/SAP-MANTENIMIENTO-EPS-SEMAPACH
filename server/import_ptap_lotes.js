/**
 * Script para importar PTAP por LOTES SEMANALES
 */

import XLSX from 'xlsx'
import { dbRun, dbGet } from './database.ts'

const filePath = 'd:/CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx'

console.log('[PTAP LOTES] Iniciando importación por semanas...\n')

const wb = XLSX.readFile(filePath)
const ws = wb.Sheets['CONTROL DE PROCESO- ORIGINAL']
const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

function parseExcelDate(dateValue) {
    if (!dateValue) return null
    if (typeof dateValue === 'number') {
        return new Date(Math.round((dateValue - 25569) * 86400 * 1000))
    }
    if (typeof dateValue === 'string') {
        const str = dateValue.trim()
        if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
            const [day, month, year] = str.split('/')
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        }
    }
    return null
}

// Agrupar datos por semana
const semanas = {}

for (let i = 13; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) continue

    const fecha = parseExcelDate(row[1])
    if (!fecha || isNaN(fecha.getTime())) continue

    const year = fecha.getFullYear()
    if (year !== 2026) continue

    // Calcular número de semana ISO
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)

    const weekKey = `${fecha.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`

    if (!semanas[weekKey]) {
        semanas[weekKey] = []
    }
    semanas[weekKey].push({ row, idx: i, fecha })
}

console.log('Semanas encontradas:', Object.keys(semanas).sort())
console.log()

// Función para obtener valor numérico
const getNum = (row, idx, def = 0) => {
    if (row[idx] === undefined || row[idx] === null) return def
    const val = parseFloat(row[idx].toString().replace(',', '.'))
    return isNaN(val) ? def : val
}

// Importar semana por semana
const semanaLista = Object.keys(semanas).sort()

for (const weekKey of semanaLista) {
    const registros = semanas[weekKey]
    console.log(`\n=== Procesando ${weekKey} (${registros.length} filas) ===`)

    let insertados = 0
    let actualizados = 0
    let errores = 0

    for (const { row, idx } of registros) {
        try {
            const fechaStr = parseExcelDate(row[1]).toISOString().split('T')[0]
            const hora = row[2] ? row[2].toString().trim() : '08:00'

            // Verificar si existe
            const existing = await dbGet(
                'SELECT id FROM ptap_readings WHERE fecha = $1 AND hora = $2',
                fechaStr, hora
            )

            if (existing) {
                // Actualizar
                await dbRun(`
                    UPDATE ptap_readings SET
                        operador = $1, caudal = $2, dosis_aluminio = $3, dosis_anionico = $4,
                        apertura_aluminio = $5, apertura_anionico = $6,
                        ingreso_turbiedad = $7, ingreso_conductividad = $8, ingreso_color = $9,
                        ingreso_alcalinidad = $10, ingreso_ph = $11, ingreso_aluminio = $12, ingreso_dureza = $13,
                        decantador_turbiedad = $14, decantador_color = $15, decantador_ph = $16,
                        filtros_ing_turb = $17, filtros_ing_col = $18, filtros_ing_ph = $19,
                        filtros_sal_turb = $20, filtros_sal_col = $21, filtros_sal_ph = $22,
                        tratada_turbiedad = $23, tratada_conductividad = $24, tratada_color = $25,
                        tratada_ph = $26, tratada_aluminioreal = $27, tratada_cloro = $28,
                        tratada_dureza = $29, tratada_ovl = $30
                    WHERE fecha = $31 AND hora = $32
                `,
                    'Importación Excel',
                    getNum(row, 3, 0), getNum(row, 4, 0), getNum(row, 5, 0),
                    getNum(row, 6, 0), getNum(row, 7, 0),
                    getNum(row, 8, 0), getNum(row, 9, 0), getNum(row, 10, 0),
                    getNum(row, 11, 0), getNum(row, 12, 0), getNum(row, 13, 0), getNum(row, 14, 0),
                    getNum(row, 15, 0), getNum(row, 16, 0), getNum(row, 17, 0),
                    getNum(row, 18, 0), getNum(row, 19, 0), getNum(row, 20, 0),
                    getNum(row, 21, 0), getNum(row, 22, 0), getNum(row, 23, 0),
                    getNum(row, 24, 0), getNum(row, 25, 0), getNum(row, 26, 0),
                    getNum(row, 27, 0), getNum(row, 28, 0), getNum(row, 29, 0), getNum(row, 30, 0),
                    fechaStr, hora
                )
                actualizados++
            } else {
                // Insertar
                await dbRun(`
                    INSERT INTO ptap_readings (
                        fecha, hora, operador, caudal, dosis_aluminio, dosis_anionico,
                        apertura_aluminio, apertura_anionico,
                        ingreso_turbiedad, ingreso_conductividad, ingreso_color,
                        ingreso_alcalinidad, ingreso_ph, ingreso_aluminio, ingreso_dureza,
                        decantador_turbiedad, decantador_color, decantador_ph,
                        filtros_ing_turb, filtros_ing_col, filtros_ing_ph,
                        filtros_sal_turb, filtros_sal_col, filtros_sal_ph,
                        tratada_turbiedad, tratada_conductividad, tratada_color,
                        tratada_ph, tratada_aluminioreal, tratada_cloro,
                        tratada_dureza, tratada_ovl
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
                `,
                    fechaStr, hora, 'Importación Excel',
                    getNum(row, 3, 0), getNum(row, 4, 0), getNum(row, 5, 0),
                    getNum(row, 6, 0), getNum(row, 7, 0),
                    getNum(row, 8, 0), getNum(row, 9, 0), getNum(row, 10, 0),
                    getNum(row, 11, 0), getNum(row, 12, 0), getNum(row, 13, 0), getNum(row, 14, 0),
                    getNum(row, 15, 0), getNum(row, 16, 0), getNum(row, 17, 0),
                    getNum(row, 18, 0), getNum(row, 19, 0), getNum(row, 20, 0),
                    getNum(row, 21, 0), getNum(row, 22, 0), getNum(row, 23, 0),
                    getNum(row, 24, 0), getNum(row, 25, 0), getNum(row, 26, 0),
                    getNum(row, 27, 0), getNum(row, 28, 0), getNum(row, 29, 0), getNum(row, 30, 0), getNum(row, 31, 0)
                )
                insertados++
            }
        } catch (e) {
            console.error(`  Error fila ${idx}:`, e.message.substring(0, 80))
            errores++
        }
    }

    console.log(`  ✅ Insertados: ${insertados} | 🔄 Actualizados: ${actualizados} | ❌ Errores: ${errores}`)
}

console.log('\n=== IMPORTACIÓN COMPLETADA ===')
