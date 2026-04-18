/**
 * Script FINAL para importar PTAP - Versión mejorada con INSERT masivo
 */

import XLSX from 'xlsx'
import { getDb } from './database.ts'

const filePath = 'd:/CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx'

console.log('[PTAP FINAL] Iniciando importación masiva...')

try {
    const wb = XLSX.readFile(filePath)
    const ws = wb.Sheets['CONTROL DE PROCESO- ORIGINAL']
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    console.log('[PTAP FINAL] Filas totales:', data.length)

    // Función para convertir fecha Excel
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

    // Recopilar todos los datos para INSERT masivo
    const values = []
    let skipped = 0

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

        values.push([
            fechaStr,
            row[2] ? row[2].toString().trim() : '08:00',
            getNum(3, 0),  // caudal
            getNum(4, 0),  // dosis_aluminio
            getNum(5, 0),  // dosis_anionico
            getNum(6, 0),  // apertura_aluminio
            getNum(7, 0),  // apertura_anionico
            getNum(8, 0),  // ingreso_turbiedad
            getNum(9, 0),  // ingreso_conductividad
            getNum(10, 0), // ingreso_color
            getNum(11, 0), // ingreso_alcalinidad
            getNum(12, 0), // ingreso_ph
            getNum(13, 0), // ingreso_aluminio
            getNum(14, 0), // ingreso_dureza
            getNum(15, 0), // decantador_turbiedad
            getNum(16, 0), // decantador_color
            getNum(17, 0), // decantador_ph
            getNum(18, 0), // filtros_ing_turb
            getNum(19, 0), // filtros_ing_col
            getNum(20, 0), // filtros_ing_ph
            getNum(21, 0), // filtros_sal_turb
            getNum(22, 0), // filtros_sal_col
            getNum(23, 0), // filtros_sal_ph
            getNum(24, 0), // tratada_turbiedad
            getNum(25, 0), // tratada_conductividad
            getNum(26, 0), // tratada_color
            getNum(27, 0), // tratada_ph
            getNum(28, 0), // tratada_aluminioReal
            getNum(29, 0), // tratada_cloro
            getNum(30, 0), // tratada_dureza
            getNum(31, 0), // tratada_ovl
        ])
    }

    console.log(`[PTAP FINAL] Registros para importar: ${values.length} (saltados: ${skipped})`)

    // Conectar y hacer UPSERT masivo
    const pool = getDb()
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        let inserted = 0
        let updated = 0

        for (const v of values) {
            try {
                // Intentar insertar
                await client.query(`
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
                    ON CONFLICT (fecha, hora) DO UPDATE SET
                        caudal = EXCLUDED.caudal,
                        dosis_aluminio = EXCLUDED.dosis_aluminio,
                        dosis_anionico = EXCLUDED.dosis_anionico,
                        apertura_aluminio = EXCLUDED.apertura_aluminio,
                        apertura_anionico = EXCLUDED.apertura_anionico,
                        ingreso_turbiedad = EXCLUDED.ingreso_turbiedad,
                        ingreso_conductividad = EXCLUDED.ingreso_conductividad,
                        ingreso_color = EXCLUDED.ingreso_color,
                        ingreso_alcalinidad = EXCLUDED.ingreso_alcalinidad,
                        ingreso_ph = EXCLUDED.ingreso_ph,
                        ingreso_aluminio = EXCLUDED.ingreso_aluminio,
                        ingreso_dureza = EXCLUDED.ingreso_dureza,
                        decantador_turbiedad = EXCLUDED.decantador_turbiedad,
                        decantador_color = EXCLUDED.decantador_color,
                        decantador_ph = EXCLUDED.decantador_ph,
                        filtros_ing_turb = EXCLUDED.filtros_ing_turb,
                        filtros_ing_col = EXCLUDED.filtros_ing_col,
                        filtros_ing_ph = EXCLUDED.filtros_ing_ph,
                        filtros_sal_turb = EXCLUDED.filtros_sal_turb,
                        filtros_sal_col = EXCLUDED.filtros_sal_col,
                        filtros_sal_ph = EXCLUDED.filtros_sal_ph,
                        tratada_turbiedad = EXCLUDED.tratada_turbiedad,
                        tratada_conductividad = EXCLUDED.tratada_conductividad,
                        tratada_color = EXCLUDED.tratada_color,
                        tratada_ph = EXCLUDED.tratada_ph,
                        tratada_aluminioreal = EXCLUDED.tratada_aluminioreal,
                        tratada_cloro = EXCLUDED.tratada_cloro,
                        tratada_dureza = EXCLUDED.tratada_dureza,
                        tratada_ovl = EXCLUDED.tratada_ovl
                `, v)

                updated++
            } catch (e) {
                console.error('Error en registro:', v[0], v[1], e.message)
            }
        }

        await client.query('COMMIT')

        console.log('\n=== PTAP FINAL - RESULTADOS ===')
        console.log('✅ Importados/Actualizados:', updated)
        console.log('⏭️ Saltados:', skipped)

    } catch (e) {
        await client.query('ROLLBACK')
        console.error('[ERROR] Rollback aplicado:', e.message)
        throw e
    } finally {
        client.release()
    }

} catch (err) {
    console.error('[PTAP FINAL] ERROR:', err.message)
    console.error(err.stack)
}

process.exit(0)
