/**
 * Script para importar datos de PTAP Portachuelo desde Excel a Supabase
 * Importa los datos de los meses de Enero, Febrero, Marzo y Abril 2026
 * 
 * Uso: npx tsx server/import_ptap_final.js
 */

import XLSX from 'xlsx'
import { dbRun, dbGet } from './database.ts'

const filePath = 'd:/CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx'

console.log('[PTAP IMPORT] Leyendo archivo:', filePath)

try {
    const wb = XLSX.readFile(filePath)
    const ws = wb.Sheets['CONTROL DE PROCESO- ORIGINAL']
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    console.log('[PTAP IMPORT] Total de filas:', data.length)
    console.log('[PTAP IMPORT] Cabeceras en fila 11-12')
    console.log('[PTAP IMPORT] Datos desde fila 14')

    // Procesar datos (comienzan en fila 14, índice 13)
    let inserted = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (let i = 13; i < data.length; i++) {
        const row = data[i]
        if (!row || !row[1]) continue // Saltar filas sin fecha (la fecha está en columna 1)

        try {
            // Columnas según estructura del Excel:
            // 0: vacío, 1: DIA (fecha), 2: HORA, 3: CAUDAL, 4: ALUMINIO, 5: ANIONICO, 6: ALUMINIO%, 7: ANIONICO%
            // 8: TURBIEDAD (ingreso), 9: CONDUCTIVIDAD, 10: COLOR, 11: ALCALINIDAD, 12: PH, 13: ALUMINIO, 14: DUREZA
            // 15: TURB DECANTADOR, 16: COLOR DECANTADOR, 17: PH DECANTADOR
            // 18: TURB FILTROS ING, 19: COLOR FILTROS ING, 20: PH FILTROS ING
            // 21: TURB FILTROS SAL, 22: COLOR FILTROS SAL, 23: PH FILTROS SAL
            // 24: TURB AGUA TRATADA, 25: COND AGUA TRATADA, 26: COLOR TRATADA, 27: PH TRATADA
            // 28: ALUMINIO RESIDUAL, 29: CLORO RESIDUAL, 30: DUREZA TRATADA, 31: OVL

            const fechaExcel = row[1]
            if (!fechaExcel) continue

            const fechaStr = parseExcelDate(fechaExcel)
            if (!fechaStr || fechaStr.length < 10) {
                skipped++
                continue
            }

            // Solo importar 2026
            const year = parseInt(fechaStr.substring(0, 4))
            if (year !== 2026) {
                skipped++
                continue
            }

            const hora = row[2] ? row[2].toString().trim() : '08:00'

            // Función auxiliar para obtener números
            const getNum = (idx, def = 0) => {
                if (row[idx] === undefined || row[idx] === null) return def
                const val = parseFloat(row[idx].toString().replace(',', '.'))
                return isNaN(val) ? def : val
            }

            const mappedData = {
                fecha: fechaStr,
                hora: hora,
                operador: '', // No hay operador en esta hoja

                caudal: getNum(3, 0),
                dosis_aluminio: getNum(4, 0),
                dosis_anionico: getNum(5, 0),
                apertura_aluminio: getNum(6, 0),
                apertura_anionico: getNum(7, 0),

                ingreso_turbiedad: getNum(8, 0),
                ingreso_conductividad: getNum(9, 0),
                ingreso_color: getNum(10, 0),
                ingreso_alcalinidad: getNum(11, 0),
                ingreso_ph: getNum(12, 0),
                ingreso_aluminio: getNum(13, 0),
                ingreso_dureza: getNum(14, 0),

                decantador_turbiedad: getNum(15, 0),
                decantador_color: getNum(16, 0),
                decantador_ph: getNum(17, 0),

                filtros_ing_turb: getNum(18, 0),
                filtros_ing_col: getNum(19, 0),
                filtros_ing_ph: getNum(20, 0),

                filtros_sal_turb: getNum(21, 0),
                filtros_sal_col: getNum(22, 0),
                filtros_sal_ph: getNum(23, 0),

                tratada_turbiedad: getNum(24, 0),
                tratada_conductividad: getNum(25, 0),
                tratada_color: getNum(26, 0),
                tratada_ph: getNum(27, 0),
                tratada_aluminioReal: getNum(28, 0),
                tratada_cloro: getNum(29, 0),
                tratada_dureza: getNum(30, 0),
                tratada_ovl: getNum(31, 0),
            }

            // Verificar si ya existe
            const existing = await dbGet(
                'SELECT id FROM ptap_readings WHERE fecha = $1 AND hora = $2',
                mappedData.fecha,
                mappedData.hora
            )

            if (existing) {
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
                        tratada_ph = $25, tratada_aluminioReal = $26, tratada_cloro = $27,
                        tratada_dureza = $28, tratada_ovl = $29
                    WHERE fecha = $30 AND hora = $31
                `,
                    mappedData.caudal, mappedData.dosis_aluminio, mappedData.dosis_anionico,
                    mappedData.apertura_aluminio, mappedData.apertura_anionico,
                    mappedData.ingreso_turbiedad, mappedData.ingreso_conductividad, mappedData.ingreso_color,
                    mappedData.ingreso_alcalinidad, mappedData.ingreso_ph, mappedData.ingreso_aluminio, mappedData.ingreso_dureza,
                    mappedData.decantador_turbiedad, mappedData.decantador_color, mappedData.decantador_ph,
                    mappedData.filtros_ing_turb, mappedData.filtros_ing_col, mappedData.filtros_ing_ph,
                    mappedData.filtros_sal_turb, mappedData.filtros_sal_col, mappedData.filtros_sal_ph,
                    mappedData.tratada_turbiedad, mappedData.tratada_conductividad, mappedData.tratada_color,
                    mappedData.tratada_ph, mappedData.tratada_aluminioReal, mappedData.tratada_cloro,
                    mappedData.tratada_dureza, mappedData.tratada_ovl,
                    mappedData.fecha, mappedData.hora
                )
                updated++
            } else {
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
                        tratada_ph, tratada_aluminioReal, tratada_cloro,
                        tratada_dureza, tratada_ovl
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
                `,
                    mappedData.fecha, mappedData.hora, mappedData.caudal, mappedData.dosis_aluminio, mappedData.dosis_anionico,
                    mappedData.apertura_aluminio, mappedData.apertura_anionico,
                    mappedData.ingreso_turbiedad, mappedData.ingreso_conductividad, mappedData.ingreso_color,
                    mappedData.ingreso_alcalinidad, mappedData.ingreso_ph, mappedData.ingreso_aluminio, mappedData.ingreso_dureza,
                    mappedData.decantador_turbiedad, mappedData.decantador_color, mappedData.decantador_ph,
                    mappedData.filtros_ing_turb, mappedData.filtros_ing_col, mappedData.filtros_ing_ph,
                    mappedData.filtros_sal_turb, mappedData.filtros_sal_col, mappedData.filtros_sal_ph,
                    mappedData.tratada_turbiedad, mappedData.tratada_conductividad, mappedData.tratada_color,
                    mappedData.tratada_ph, mappedData.tratada_aluminioReal, mappedData.tratada_cloro,
                    mappedData.tratada_dureza, mappedData.tratada_ovl
                )
                inserted++
            }

            if ((inserted + updated) % 50 === 0) {
                console.log(`[PROGRESO] Insertados: ${inserted}, Actualizados: ${updated}, Saltados: ${skipped}`)
            }

        } catch (err) {
            console.error('[ERROR] Fila', i + 1, ':', err.message)
            errors++
        }
    }

    console.log('\n[PTAP IMPORT] ====== RESULTADOS FINALES ======')
    console.log('[PTAP IMPORT] ✅ Insertados:', inserted)
    console.log('[PTAP IMPORT] 🔄 Actualizados:', updated)
    console.log('[PTAP IMPORT] ⏭️ Saltados:', skipped)
    console.log('[PTAP IMPORT] ❌ Errores:', errors)
    console.log('[PTAP IMPORT] Total procesados:', inserted + updated + skipped + errors)

} catch (err) {
    console.error('[PTAP IMPORT] ERROR FATAL:', err.message)
    console.error('[PTAP IMPORT] Stack:', err.stack)
}

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
        if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
            return str.substring(0, 10)
        }
    }

    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0]
    }

    return dateValue.toString().substring(0, 10)
}

process.exit(0)
