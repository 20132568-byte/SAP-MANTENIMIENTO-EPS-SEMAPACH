/**
 * Script para importar datos de PTAP Portachuelo desde Excel a Supabase
 * Importa los datos de los meses de Enero, Febrero, Marzo y Abril 2026
 * 
 * Uso: npx tsx server/import_ptap_completo.js
 */

import XLSX from 'xlsx'
import { dbRun, dbGet } from './database.ts'

const filePath = 'd:/CONTROL DE PROCESOS 2026 PARAMETROS  GENERAL (2).xlsx'

console.log('[PTAP IMPORT] Leyendo archivo:', filePath)

try {
    const wb = XLSX.readFile(filePath)
    console.log('[PTAP IMPORT] Sheets encontrados:', wb.SheetNames)

    // Usar el sheet "CONTROL DE PROCESO- ORIGINAL" que tiene los datos completos
    const ws = wb.Sheets['CONTROL DE PROCESO- ORIGINAL']
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    console.log('[PTAP IMPORT] Total de filas:', data.length)

    // Encontrar la fila de cabeceras y los datos reales
    let headerRowIndex = 0
    let dataStartRow = 0

    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (row && row.some(cell => cell && cell.toString().includes('FECHA'))) {
            headerRowIndex = i
            dataStartRow = i + 1
            console.log('[PTAP IMPORT] Cabeceras encontradas en fila:', i + 1)
            console.log('[PTAP IMPORT] Cabeceras:', row.slice(0, 10).join(' | '))
            break
        }
    }

    // Mostrar un ejemplo de fila de datos
    if (data[dataStartRow]) {
        console.log('[PTAP IMPORT] Ejemplo de dato:', data[dataStartRow].slice(0, 10).join(' | '))
    }

    // Mapear cabeceras a índices
    const headerRow = data[headerRowIndex]
    const colIndex = {}
    headerRow.forEach((cell, idx) => {
        if (cell) {
            const colName = cell.toString().trim().toUpperCase()
            colIndex[colName] = idx
        }
    })

    console.log('\n[PTAP IMPORT] Columnas mapeadas:')
    Object.entries(colIndex).forEach(([name, idx]) => {
        if (['FECHA', 'HORA', 'CAUDAL', 'TURBIEDAD', 'PH', 'CLORO', 'DOSIS', 'OPERADOR'].some(k => name.includes(k))) {
            console.log(`  ${name} -> columna ${idx}`)
        }
    })

    // Procesar datos
    let inserted = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (let i = dataStartRow; i < data.length; i++) {
        const row = data[i]
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) continue

        try {
            // Extraer fecha
            const fechaRaw = row[colIndex['FECHA'] || 0]
            if (!fechaRaw) {
                skipped++
                continue
            }

            const fechaStr = parseExcelDate(fechaRaw)
            if (!fechaStr || fechaStr.length < 10) {
                skipped++
                continue
            }

            // Solo importar Enero-Abril 2026
            const year = parseInt(fechaStr.substring(0, 4))
            const month = parseInt(fechaStr.substring(5, 7))
            if (year !== 2026 || (month < 1 || month > 4)) {
                skipped++
                continue
            }

            // Extraer hora
            const horaRaw = row[colIndex['HORA'] || colIndex['HORARIO'] || 1]
            const hora = horaRaw ? horaRaw.toString().trim() : '08:00'

            // Extraer datos numéricos (función auxiliar)
            const getNum = (colNames, defaultVal = 0) => {
                for (const colName of colNames) {
                    const idx = colIndex[colName]
                    if (idx !== undefined && row[idx]) {
                        const val = parseFloat(row[idx].toString().replace(',', '.'))
                        if (!isNaN(val)) return val
                    }
                }
                return defaultVal
            }

            // Mapear datos
            const mappedData = {
                fecha: fechaStr,
                hora: hora,
                operador: row[colIndex['OPERADOR'] || colIndex['RESPONSABLE'] || '']?.toString() || '',

                // Caudal
                caudal: getNum(['CAUDAL (L/S)', 'CAUDAL L/S', 'CAUDAL'], 0),

                // Dosificación
                dosis_aluminio: getNum(['DOSIS ALUMINIO', 'ALUMINIO MG/L'], 0),
                dosis_anionico: getNum(['DOSIS ANIONICO', 'ANIONICO MG/L'], 0),
                apertura_aluminio: getNum(['APERTURA ALUMINIO', '% APERTURA ALUMINIO'], 0),
                apertura_anionico: getNum(['APERTURA ANIONICO', '% APERTURA ANIONICO'], 0),

                // Agua de Ingreso
                ingreso_turbiedad: getNum(['TURBIEDAD INGRESO', 'TURBIEDAD AGUA CRUDA'], 0),
                ingreso_ph: getNum(['PH INGRESO', 'PH AGUA CRUDA'], 0),
                ingreso_color: getNum(['COLOR INGRESO', 'COLOR AGUA CRUDA'], 0),
                ingreso_alcalinidad: getNum(['ALCALINIDAD INGRESO', 'ALCALINIDAD'], 0),
                ingreso_dureza: getNum(['DUREZA INGRESO', 'DUREZA TOTAL'], 0),

                // Decantador
                decantador_turbiedad: getNum(['TURBIEDAD DECANTADOR', 'TURBIEDAD EFLUENTE DECANT'], 0),
                decantador_ph: getNum(['PH DECANTADOR', 'PH EFLUENTE DECANT'], 0),
                decantador_color: getNum(['COLOR DECANTADOR', 'COLOR EFLUENTE DECANT'], 0),

                // Filtros
                filtros_ing_turb: getNum(['TURBIEDAD ING FILTRO', 'TURBIEDAD ENTRADA FILTRO'], 0),
                filtros_sal_turb: getNum(['TURBIEDAD SAL FILTRO', 'TURBIEDAD SALIDA FILTRO'], 0),

                // Agua Tratada
                tratada_turbiedad: getNum(['TURBIEDAD AGUA TRATADA', 'TURBIEDAD FINAL'], 0),
                tratada_ph: getNum(['PH AGUA TRATADA', 'PH FINAL'], 0),
                tratada_color: getNum(['COLOR AGUA TRATADA', 'COLOR FINAL'], 0),
                tratada_cloro: getNum(['CLORO RESIDUAL', 'CLORO MG/L', 'CLORO'], 0),
                tratada_aluminioReal: getNum(['ALUMINIO RESIDUAL', 'ALUMINIO MG/L'], 0),
            }

            // Verificar si ya existe
            const existing = await dbGet(
                'SELECT id FROM ptap_readings WHERE fecha = $1 AND hora = $2',
                mappedData.fecha,
                mappedData.hora
            )

            if (existing) {
                // Actualizar existente
                await dbRun(`
                    UPDATE ptap_readings SET
                        operador = $1, caudal = $2, dosis_aluminio = $3, dosis_anionico = $4,
                        apertura_aluminio = $5, apertura_anionico = $6,
                        ingreso_turbiedad = $7, ingreso_ph = $8, ingreso_color = $9,
                        ingreso_alcalinidad = $10, ingreso_dureza = $11,
                        decantador_turbiedad = $12, decantador_ph = $13, decantador_color = $14,
                        filtros_ing_turb = $15, filtros_sal_turb = $16,
                        tratada_turbiedad = $17, tratada_ph = $18, tratada_color = $19,
                        tratada_cloro = $20, tratada_aluminioReal = $21
                    WHERE fecha = $22 AND hora = $23
                `,
                    mappedData.operador, mappedData.caudal, mappedData.dosis_aluminio, mappedData.dosis_anionico,
                    mappedData.apertura_aluminio, mappedData.apertura_anionico,
                    mappedData.ingreso_turbiedad, mappedData.ingreso_ph, mappedData.ingreso_color,
                    mappedData.ingreso_alcalinidad, mappedData.ingreso_dureza,
                    mappedData.decantador_turbiedad, mappedData.decantador_ph, mappedData.decantador_color,
                    mappedData.filtros_ing_turb, mappedData.filtros_sal_turb,
                    mappedData.tratada_turbiedad, mappedData.tratada_ph, mappedData.tratada_color,
                    mappedData.tratada_cloro, mappedData.tratada_aluminioReal,
                    mappedData.fecha, mappedData.hora
                )
                updated++
            } else {
                // Insertar nuevo
                await dbRun(`
                    INSERT INTO ptap_readings (
                        fecha, hora, operador, caudal, dosis_aluminio, dosis_anionico,
                        apertura_aluminio, apertura_anionico,
                        ingreso_turbiedad, ingreso_ph, ingreso_color,
                        ingreso_alcalinidad, ingreso_dureza,
                        decantador_turbiedad, decantador_ph, decantador_color,
                        filtros_ing_turb, filtros_sal_turb,
                        tratada_turbiedad, tratada_ph, tratada_color,
                        tratada_cloro, tratada_aluminioReal
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                `,
                    mappedData.fecha, mappedData.hora, mappedData.operador, mappedData.caudal, mappedData.dosis_aluminio, mappedData.dosis_anionico,
                    mappedData.apertura_aluminio, mappedData.apertura_anionico,
                    mappedData.ingreso_turbiedad, mappedData.ingreso_ph, mappedData.ingreso_color,
                    mappedData.ingreso_alcalinidad, mappedData.ingreso_dureza,
                    mappedData.decantador_turbiedad, mappedData.decantador_ph, mappedData.decantador_color,
                    mappedData.filtros_ing_turb, mappedData.filtros_sal_turb,
                    mappedData.tratada_turbiedad, mappedData.tratada_ph, mappedData.tratada_color,
                    mappedData.tratada_cloro, mappedData.tratada_aluminioReal
                )
                inserted++
            }

            if ((inserted + updated) % 20 === 0) {
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

// Función para convertir fechas de Excel
function parseExcelDate(dateValue) {
    if (!dateValue) return ''

    // Si es número (Excel serial date)
    if (typeof dateValue === 'number') {
        const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000))
        return date.toISOString().split('T')[0]
    }

    // Si es string
    if (typeof dateValue === 'string') {
        const str = dateValue.trim()

        // DD/MM/YYYY
        if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
            const [day, month, year] = str.split('/')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }

        // YYYY-MM-DD
        if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
            return str.substring(0, 10)
        }

        // DD-MM-YYYY
        if (str.match(/^\d{1,2}-\d{1,2}-\d{4}/)) {
            const [day, month, year] = str.split('-')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
    }

    // Si es Date object
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0]
    }

    return dateValue.toString().substring(0, 10)
}

process.exit(0)
