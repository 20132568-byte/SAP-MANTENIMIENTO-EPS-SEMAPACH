/**
 * Script para importar datos de PTAP Portachuelo desde Excel a Supabase
 * 
 * Uso: npx tsx server/import_ptap_excel_manual.js [ruta_al_archivo.xlsx]
 */

import XLSX from 'xlsx'
import { dbRun, dbGet } from './database.ts'

const filePath = process.argv[2] || 'C:/Users/akatz/Downloads/CONTROL DE PROCESOS 2026 PARAMETROS GENERAL (2).xlsx'

console.log('[PTAP IMPORT] Leyendo archivo:', filePath)

try {
    const wb = XLSX.readFile(filePath)
    console.log('[PTAP IMPORT] Sheets encontrados:', wb.SheetNames)

    // Usar el primer sheet
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws)

    console.log('[PTAP IMPORT] Registros encontrados:', data.length)
    console.log('[PTAP IMPORT] Columnas:', Object.keys(data[0] || {}).join(', '))

    // Mapear columnas del Excel a la base de datos
    // Ajustar según la estructura real del Excel
    let inserted = 0
    let updated = 0
    let errors = 0

    for (const row of data) {
        try {
            // Saltar filas vacías
            if (!row || Object.keys(row).length === 0) continue

            // Mapear datos según estructura del Excel
            // AJUSTAR ESTOS MAPEOS SEGÚN LAS COLUMNAS REALES DEL EXCEL
            const mappedData = {
                fecha: row['FECHA'] || row['Fecha'] || row['fecha'],
                hora: row['HORA'] || row['Hora'] || row['hora'] || '08:00',
                operador: row['OPERADOR'] || row['Operador'] || row['operador'] || '',

                // Caudal
                caudal: parseFloat(row['CAUDAL'] || row['Caudal'] || row['caudal'] || 0),

                // Dosificación
                dosis_aluminio: parseFloat(row['DOSIS ALUMINIO'] || row['dosis_aluminio'] || 0),
                dosis_anionico: parseFloat(row['DOSIS ANIONICO'] || row['dosis_anionico'] || 0),
                apertura_aluminio: parseFloat(row['APERTURA ALUMINIO'] || row['apertura_aluminio'] || 0),
                apertura_anionico: parseFloat(row['APERTURA ANIONICO'] || row['apertura_anionico'] || 0),

                // Agua de Ingreso
                ingreso_turbiedad: parseFloat(row['TURBIEDAD INGRESO'] || row['turbiedad_ingreso'] || 0),
                ingreso_conductividad: parseFloat(row['CONDUCTIVIDAD INGRESO'] || row['conductividad_ingreso'] || 0),
                ingreso_color: parseFloat(row['COLOR INGRESO'] || row['color_ingreso'] || 0),
                ingreso_alcalinidad: parseFloat(row['ALCALINIDAD INGRESO'] || row['alcalinidad_ingreso'] || 0),
                ingreso_ph: parseFloat(row['PH INGRESO'] || row['ph_ingreso'] || 0),
                ingreso_aluminio: parseFloat(row['ALUMINIO INGRESO'] || row['aluminio_ingreso'] || 0),
                ingreso_dureza: parseFloat(row['DUREZA INGRESO'] || row['dureza_ingreso'] || 0),
                ingreso_ovl: parseFloat(row['OVL INGRESO'] || row['ovl_ingreso'] || 0),

                // Decantador
                decantador_turbiedad: parseFloat(row['TURBIEDAD DECANTADOR'] || row['turbiedad_decantador'] || 0),
                decantador_color: parseFloat(row['COLOR DECANTADOR'] || row['color_decantador'] || 0),
                decantador_ph: parseFloat(row['PH DECANTADOR'] || row['ph_decantador'] || 0),

                // Filtros Ingreso
                filtros_ing_turb: parseFloat(row['TURBIEDAD FILTROS ING'] || row['turbiedad_filtros_ing'] || 0),
                filtros_ing_col: parseFloat(row['COLOR FILTROS ING'] || row['color_filtros_ing'] || 0),
                filtros_ing_ph: parseFloat(row['PH FILTROS ING'] || row['ph_filtros_ing'] || 0),

                // Filtros Salida
                filtros_sal_turb: parseFloat(row['TURBIEDAD FILTROS SAL'] || row['turbiedad_filtros_sal'] || 0),
                filtros_sal_col: parseFloat(row['COLOR FILTROS SAL'] || row['color_filtros_sal'] || 0),
                filtros_sal_ph: parseFloat(row['PH FILTROS SAL'] || row['ph_filtros_sal'] || 0),

                // Agua Tratada
                tratada_turbiedad: parseFloat(row['TURBIEDAD TRATADA'] || row['turbiedad_tratada'] || 0),
                tratada_conductividad: parseFloat(row['CONDUCTIVIDAD TRATADA'] || row['conductividad_tratada'] || 0),
                tratada_color: parseFloat(row['COLOR TRATADA'] || row['color_tratada'] || 0),
                tratada_ph: parseFloat(row['PH TRATADA'] || row['ph_tratada'] || 0),
                tratada_aluminioReal: parseFloat(row['ALUMINIO TRATADA'] || row['aluminio_tratada'] || 0),
                tratada_cloro: parseFloat(row['CLORO TRATADA'] || row['cloro_tratada'] || 0),
                tratada_dureza: parseFloat(row['DUREZA TRATADA'] || row['dureza_tratada'] || 0),
                tratada_ovl: parseFloat(row['OVL TRATADA'] || row['ovl_tratada'] || 0),
            }

            // Validar que tenga fecha
            if (!mappedData.fecha) {
                console.log('[SKIP] Fila sin fecha:', row)
                errors++
                continue
            }

            // Formatear fecha a YYYY-MM-DD
            const fechaStr = formatDate(mappedData.fecha)

            // Verificar si ya existe
            const existing = await dbGet(
                'SELECT id FROM ptap_readings WHERE fecha = $1 AND hora = $2',
                fechaStr,
                mappedData.hora
            )

            if (existing) {
                // Actualizar
                await dbRun(`
                    UPDATE ptap_readings SET
                        operador = $1, caudal = $2, dosis_aluminio = $3, dosis_anionico = $4,
                        apertura_aluminio = $5, apertura_anionico = $6,
                        ingreso_turbiedad = $7, ingreso_conductividad = $8, ingreso_color = $9,
                        ingreso_alcalinidad = $10, ingreso_ph = $11, ingreso_aluminio = $12,
                        ingreso_dureza = $13, ingreso_ovl = $14,
                        decantador_turbiedad = $15, decantador_color = $16, decantador_ph = $17,
                        filtros_ing_turb = $18, filtros_ing_col = $19, filtros_ing_ph = $20,
                        filtros_sal_turb = $21, filtros_sal_col = $22, filtros_sal_ph = $23,
                        tratada_turbiedad = $24, tratada_conductividad = $25, tratada_color = $26,
                        tratada_ph = $27, tratada_aluminioReal = $28, tratada_cloro = $29,
                        tratada_dureza = $30, tratada_ovl = $31,
                        created_at = CURRENT_TIMESTAMP
                    WHERE fecha = $32 AND hora = $33
                `,
                    mappedData.operador, mappedData.caudal, mappedData.dosis_aluminio, mappedData.dosis_anionico,
                    mappedData.apertura_aluminio, mappedData.apertura_anionico,
                    mappedData.ingreso_turbiedad, mappedData.ingreso_conductividad, mappedData.ingreso_color,
                    mappedData.ingreso_alcalinidad, mappedData.ingreso_ph, mappedData.ingreso_aluminio,
                    mappedData.ingreso_dureza, mappedData.ingreso_ovl,
                    mappedData.decantador_turbiedad, mappedData.decantador_color, mappedData.decantador_ph,
                    mappedData.filtros_ing_turb, mappedData.filtros_ing_col, mappedData.filtros_ing_ph,
                    mappedData.filtros_sal_turb, mappedData.filtros_sal_col, mappedData.filtros_sal_ph,
                    mappedData.tratada_turbiedad, mappedData.tratada_conductividad, mappedData.tratada_color,
                    mappedData.tratada_ph, mappedData.tratada_aluminioReal, mappedData.tratada_cloro,
                    mappedData.tratada_dureza, mappedData.tratada_ovl,
                    fechaStr, mappedData.hora
                )
                updated++
            } else {
                // Insertar
                await dbRun(`
                    INSERT INTO ptap_readings (
                        fecha, hora, operador, caudal, dosis_aluminio, dosis_anionico,
                        apertura_aluminio, apertura_anionico,
                        ingreso_turbiedad, ingreso_conductividad, ingreso_color,
                        ingreso_alcalinidad, ingreso_ph, ingreso_aluminio,
                        ingreso_dureza, ingreso_ovl,
                        decantador_turbiedad, decantador_color, decantador_ph,
                        filtros_ing_turb, filtros_ing_col, filtros_ing_ph,
                        filtros_sal_turb, filtros_sal_col, filtros_sal_ph,
                        tratada_turbiedad, tratada_conductividad, tratada_color,
                        tratada_ph, tratada_aluminioReal, tratada_cloro,
                        tratada_dureza, tratada_ovl
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
                `,
                    fechaStr, mappedData.hora, mappedData.operador, mappedData.caudal, mappedData.dosis_aluminio, mappedData.dosis_anionico,
                    mappedData.apertura_aluminio, mappedData.apertura_anionico,
                    mappedData.ingreso_turbiedad, mappedData.ingreso_conductividad, mappedData.ingreso_color,
                    mappedData.ingreso_alcalinidad, mappedData.ingreso_ph, mappedData.ingreso_aluminio,
                    mappedData.ingreso_dureza, mappedData.ingreso_ovl,
                    mappedData.decantador_turbiedad, mappedData.decantador_color, mappedData.decantador_ph,
                    mappedData.filtros_ing_turb, mappedData.filtros_ing_col, mappedData.filtros_ing_ph,
                    mappedData.filtros_sal_turb, mappedData.filtros_sal_col, mappedData.filtros_sal_ph,
                    mappedData.tratada_turbiedad, mappedData.tratada_conductividad, mappedData.tratada_color,
                    mappedData.tratada_ph, mappedData.tratada_aluminioReal, mappedData.tratada_cloro,
                    mappedData.tratada_dureza, mappedData.tratada_ovl
                )
                inserted++
            }

            if ((inserted + updated + errors) % 10 === 0) {
                console.log(`[PROGRESO] Insertados: ${inserted}, Actualizados: ${updated}, Errores: ${errors}`)
            }

        } catch (err) {
            console.error('[ERROR] Fila fallida:', row, err.message)
            errors++
        }
    }

    console.log('\n[PTAP IMPORT] ====== RESULTADOS ======')
    console.log('[PTAP IMPORT] ✅ Insertados:', inserted)
    console.log('[PTAP IMPORT] 🔄 Actualizados:', updated)
    console.log('[PTAP IMPORT] ❌ Errores:', errors)
    console.log('[PTAP IMPORT] Total procesados:', inserted + updated + errors)

} catch (err) {
    console.error('[PTAP IMPORT] ERROR FATAL:', err.message)
    console.error('[PTAP IMPORT] Asegúrate de que la ruta del archivo sea correcta')
    console.error('[PTAP IMPORT] Ruta actual:', filePath)
}

// Función para formatear fechas
function formatDate(dateValue) {
    if (!dateValue) return null

    // Si es número (Excel serial date)
    if (typeof dateValue === 'number') {
        const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000))
        return date.toISOString().split('T')[0]
    }

    // Si es string
    if (typeof dateValue === 'string') {
        // Intentar parsear DD/MM/YYYY
        if (dateValue.includes('/')) {
            const [day, month, year] = dateValue.split('/')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
        // Si ya está en formato YYYY-MM-DD
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            return dateValue.substring(0, 10)
        }
    }

    // Si es Date object
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0]
    }

    return dateValue.toString().substring(0, 10)
}

process.exit(0)
