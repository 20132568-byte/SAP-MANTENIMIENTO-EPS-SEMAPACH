/**
 * Importa PRODUCCION_OPAPTAR_2026.xlsx → Supabase en modo batch (rápido)
 * Uso: node scripts/import_produccion.mjs
 */
import XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
})

const FILE = path.resolve(__dirname, '../src/assets/data/PRODUCCION_OPAPTAR_2026.xlsx')
const BATCH = 100 // filas por INSERT batch

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number' || serial < 40000) return null
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return date.toISOString().slice(0, 10)
}

function n(v) { const x = parseFloat(v); return isNaN(x) ? null : x }
function s(v) { return v != null ? String(v).trim() || null : null }

/**
 * Inserta filas en batch usando pg unnest / VALUES dinámicos.
 * columns: string[]
 * rows: any[][]  (cada fila tiene valores en el mismo orden que columns)
 * table: string
 * onConflict: string  e.g. "ON CONFLICT (fecha) DO NOTHING"
 */
async function batchInsert(table, columns, rows, onConflict = 'ON CONFLICT DO NOTHING') {
  if (!rows.length) return 0
  let inserted = 0
  for (let start = 0; start < rows.length; start += BATCH) {
    const chunk = rows.slice(start, start + BATCH)
    const values = []
    const params = []
    let p = 1
    for (const row of chunk) {
      const placeholders = row.map(() => `$${p++}`)
      values.push(`(${placeholders.join(',')})`)
      params.push(...row)
    }
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')} ${onConflict}`
    try {
      await pool.query(sql, params)
      inserted += chunk.length
    } catch (e) {
      console.error(`  Batch ${start}-${start+chunk.length} ERROR:`, e.message.slice(0, 120))
    }
  }
  return inserted
}

// ── Hoja BD ──────────────────────────────────────────────────────────────────
async function importBD(wb) {
  const ws = wb.Sheets['BD']
  if (!ws) { console.log('⚠  Hoja BD no encontrada'); return }
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  console.log(`  BD: ${raw.length} filas raw`)

  const BD_COLS = [
    'mes','dia','fecha',
    'pz10_caudal','pz10_horas','pz10_inicio','pz10_final','pz10_m3',
    'pz11_caudal','pz11_horas','pz11_inicio','pz11_final','pz11_m3',
    'pz13_caudal','pz13_horas','pz13_inicio','pz13_final','pz13_m3',
    'pzmed_caudal','pzmed_horas','pzmed_inicio','pzmed_final','pzmed_m3',
    'gfmin_caudal','gfmin_horas','gfmin_inicio','gfmin_final','gfmin_m3',
    'ptap1_caudal','ptap1_horas','ptap1_inicio','ptap1_final','ptap1_m3',
    'gfnar_caudal','gfnar_horas','gfnar_inicio','gfnar_final','gfnar_m3',
    'pzchb_caudal','pzchb_horas','pzchb_inicio','pzchb_final','pzchb_m3',
    'pzcm_caudal','pzcm_horas','pzcm_inicio','pzcm_final','pzcm_m3',
    'pztm_caudal','pztm_horas','pztm_inicio','pztm_final','pztm_m3',
    'ebaphija_caudal','ebaphija_horas','ebaphija_inicio','ebaphija_final','ebaphija_m3',
    'ebapalar_caudal','ebapalar_horas','ebapalar_inicio','ebapalar_final','ebapalar_m3',
    'ebappnue_caudal','ebappnue_horas','ebappnue_inicio','ebappnue_final','ebappnue_m3',
  ]

  const batch = []
  for (let i = 4; i < raw.length; i++) {
    const row = raw[i]
    if (!row) continue
    const fechaSerial = row[1]
    if (!fechaSerial || typeof fechaSerial !== 'number' || fechaSerial < 40000) continue
    const fecha = excelDateToISO(fechaSerial)
    if (!fecha) continue

    batch.push([
      parseInt(fecha.slice(5,7)), parseInt(fecha.slice(8,10)), fecha,
      n(row[2]),  n(row[3]),  n(row[4]),  n(row[5]),  n(row[6]),
      n(row[7]),  n(row[8]),  n(row[9]),  n(row[10]), n(row[11]),
      n(row[12]), n(row[13]), n(row[14]), n(row[15]), n(row[16]),
      n(row[17]), n(row[18]), n(row[19]), n(row[20]), n(row[21]),
      n(row[22]), n(row[23]), n(row[24]), n(row[25]), n(row[26]),
      n(row[27]), n(row[28]), n(row[29]), n(row[30]), n(row[31]),
      n(row[32]), n(row[33]), n(row[34]), n(row[35]), n(row[36]),
      n(row[37]), n(row[38]), n(row[39]), n(row[40]), n(row[41]),
      n(row[42]), n(row[43]), n(row[44]), n(row[45]), n(row[46]),
      n(row[47]), n(row[48]), n(row[49]), n(row[50]), n(row[51]),
      n(row[52]), n(row[53]), n(row[54]), n(row[55]), n(row[56]),
      n(row[57]), n(row[58]), n(row[59]), n(row[60]), n(row[61]),
      n(row[62]), n(row[63]), n(row[64]), n(row[65]), n(row[66]),
    ])
  }

  const inserted = await batchInsert('produccion_bd', BD_COLS, batch, 'ON CONFLICT (fecha) DO NOTHING')
  console.log(`✅ BD: ${inserted}/${batch.length} filas procesadas`)
}

// ── Hoja BDsurtidor ──────────────────────────────────────────────────────────
async function importSurtidor(wb) {
  const ws = wb.Sheets['BDsurtidor']
  if (!ws) { console.log('⚠  Hoja BDsurtidor no encontrada'); return }
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  console.log(`  Surtidor: ${rows.length} filas`)

  const COLS = ['num_sem','mes','anio','fecha','surtidor','itm','placa','tvehiculo','volumen_gln','volumen_m3','consumo_ca','programa','hipoclorito','cloro_residual','hora','operador']
  const batch = []
  for (const r of rows) {
    const fechaSerial = r['FECHA']
    if (!fechaSerial || typeof fechaSerial !== 'number' || fechaSerial < 40000) continue
    const fecha = excelDateToISO(fechaSerial)
    if (!fecha) continue
    batch.push([
      n(r['NUM SEM']), n(r['MES']), n(r['AÑO']),
      fecha,
      s(r['SURTIDOR']), n(r['ITM']),
      s(r['PLACA']), s(r['TVEHICULO']),
      n(r['VOLUMEN-gln']), n(r['VOLUMEN-m32']),
      n(r['CONSUMO CA(CLO2)']),
      s(r['PROGRAMA']),
      n(r['HIPOCLORITO']),
      n(r['CLORO RESIDUAL']),
      r['HORA'] != null ? String(r['HORA']).slice(0, 20) : null,
      s(r['OPERADOR']),
    ])
  }

  const inserted = await batchInsert('produccion_surtidor', COLS, batch)
  console.log(`✅ Surtidor: ${inserted}/${batch.length} filas procesadas`)
}

// ── Hoja BDrsanjuan ──────────────────────────────────────────────────────────
async function importRSanJuan(wb) {
  const ws = wb.Sheets['BDrsanjuan']
  if (!ws) { console.log('⚠  Hoja BDrsanjuan no encontrada'); return }
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  console.log(`  RSJ: ${raw.length} filas raw`)

  // Buscar fila de encabezados
  let headerIdx = -1
  for (let i = 0; i < Math.min(30, raw.length); i++) {
    const row = raw[i]
    if (row && row[0] && String(row[0]).toLowerCase().trim() === 'fecha') { headerIdx = i; break }
  }
  if (headerIdx < 0) {
    for (let i = 0; i < Math.min(30, raw.length); i++) {
      const row = raw[i]
      if (row && row.some(c => c && String(c).toLowerCase().includes('fecha'))) { headerIdx = i; break }
    }
  }
  if (headerIdx < 0) { console.log('⚠  No se encontró encabezado en BDrsanjuan'); return }

  const headers = raw[headerIdx].map(h => h ? String(h).trim().toLowerCase() : '')
  const fechaCol   = headers.findIndex(h => h === 'fecha' || h.includes('fecha'))
  const horaCol    = headers.findIndex(h => h === 'hora'  || h.includes('hora'))
  const caudalCol  = headers.findIndex(h => h.includes('caudal') && !h.includes('máx') && !h.includes('max'))
  const cmaxCol    = headers.findIndex(h => h.includes('caudal') && (h.includes('máx') || h.includes('max')))
  console.log(`  RSJ headers[0..5]: ${headers.slice(0,6).join(' | ')}`)
  console.log(`  RSJ cols: fecha=${fechaCol} hora=${horaCol} caudal=${caudalCol} caudal_max=${cmaxCol}`)

  const COLS = ['anio','mes','fecha','hora','caudal','etiqueta','caudal_max']
  const batch = []
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i]
    if (!row) continue
    const fechaVal = row[fechaCol]
    if (!fechaVal) continue

    let fechaStr = null
    if (typeof fechaVal === 'number' && fechaVal > 40000) {
      fechaStr = excelDateToISO(fechaVal)
    } else if (typeof fechaVal === 'string') {
      const parts = fechaVal.trim().split('/')
      if (parts.length === 3) {
        const yr = parts[2].length === 2 ? '20' + parts[2] : parts[2]
        fechaStr = `${yr}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
      } else {
        fechaStr = fechaVal.trim().slice(0, 10)
      }
    }
    if (!fechaStr || fechaStr.length < 10) continue
    const caudal = n(row[caudalCol])
    if (caudal === null) continue

    batch.push([
      parseInt(fechaStr.slice(0,4)),
      parseInt(fechaStr.slice(5,7)),
      fechaStr,
      horaCol >= 0 ? s(row[horaCol]) : null,
      caudal,
      null,
      cmaxCol >= 0 ? n(row[cmaxCol]) : null,
    ])
  }

  const inserted = await batchInsert('produccion_rsanjuan', COLS, batch)
  console.log(`✅ R. San Juan: ${inserted}/${batch.length} filas procesadas`)
}

async function main() {
  console.log('📂 Leyendo', FILE)
  const wb = XLSX.readFile(FILE)
  console.log('Hojas:', wb.SheetNames.join(', '), '\n')

  const t0 = Date.now()
  await importBD(wb)
  await importSurtidor(wb)
  await importRSanJuan(wb)

  await pool.end()
  console.log(`\n🎉 Importación completa en ${((Date.now()-t0)/1000).toFixed(1)}s`)
}

main().catch(err => { console.error('❌ Error fatal:', err.message); process.exit(1) })
