import pg from 'pg'
import fs from 'fs'
import path from 'path'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
    console.error('[DB] ❌ DATABASE_URL no definida. Revisa tu archivo .env')
    process.exit(1)
}
const cleanPgUrl = DATABASE_URL.split('?')[0]

const pool = new pg.Pool({
    connectionString: cleanPgUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
})

pool.on('error', (err) => {
    console.error('[DB] Error inesperado en el pool:', err)
})

export async function initDb() {
    try {
        const client = await pool.connect()
        console.log('[DB] ✅ Conexión exitosa a PostgreSQL (Supabase)')
        client.release()

        const migrations = [
            `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS hora_inicio_jornada TEXT DEFAULT ''`,
            `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS hora_fin_jornada TEXT DEFAULT ''`,
            `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS jornada_completa INTEGER DEFAULT 0`,
            `UPDATE daily_records SET jornada_completa = 1 WHERE jornada_completa = 0 AND km_final IS NOT NULL`,
            // === MANTENIMIENTO UNIFICADO ===
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'fleet'`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS station_id INTEGER`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS marca TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS modelo TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS serie TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS potencia_hp REAL`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS potencia_kw REAL`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS voltaje TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS tension TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS especificaciones_tecnicas TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS activo INTEGER DEFAULT 1`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS calidad_dato_inicial TEXT DEFAULT 'no disponible'`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS horas_programadas_estandar INTEGER DEFAULT 8`,
            `CREATE INDEX IF NOT EXISTS idx_assets_categoria ON assets(categoria)`,
            `CREATE INDEX IF NOT EXISTS idx_assets_station ON assets(station_id)`,
            `CREATE TABLE IF NOT EXISTS ptap_readings (
              id SERIAL PRIMARY KEY, fecha DATE NOT NULL, hora TEXT NOT NULL, operador TEXT DEFAULT '',
              caudal REAL DEFAULT 0, dosis_aluminio REAL DEFAULT 0, dosis_anionico REAL DEFAULT 0,
              apertura_aluminio REAL DEFAULT 0, apertura_anionico REAL DEFAULT 0,
              ingreso_turbiedad REAL DEFAULT 0, ingreso_conductividad REAL DEFAULT 0,
              ingreso_color REAL DEFAULT 0, ingreso_alcalinidad REAL DEFAULT 0,
              ingreso_ph REAL DEFAULT 0, ingreso_aluminio REAL DEFAULT 0,
              ingreso_dureza REAL DEFAULT 0, ingreso_ovl REAL DEFAULT 0,
              decantador_turbiedad REAL DEFAULT 0, decantador_color REAL DEFAULT 0, decantador_ph REAL DEFAULT 0,
              filtros_ing_turb REAL DEFAULT 0, filtros_ing_col REAL DEFAULT 0, filtros_ing_ph REAL DEFAULT 0,
              filtros_sal_turb REAL DEFAULT 0, filtros_sal_col REAL DEFAULT 0, filtros_sal_ph REAL DEFAULT 0,
              tratada_turbiedad REAL DEFAULT 0, tratada_conductividad REAL DEFAULT 0,
              tratada_color REAL DEFAULT 0, tratada_ph REAL DEFAULT 0,
              tratada_aluminioReal REAL DEFAULT 0, tratada_cloro REAL DEFAULT 0,
              tratada_dureza REAL DEFAULT 0, tratada_ovl REAL DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === ESTACIONES HÍDRICAS ===
            `CREATE TABLE IF NOT EXISTS water_stations (
                id SERIAL PRIMARY KEY, codigo VARCHAR(50) UNIQUE NOT NULL, nombre VARCHAR(200) NOT NULL,
                tipo VARCHAR(50), zona VARCHAR(100), distrito VARCHAR(100), direccion TEXT,
                coordenadas_lat DECIMAL(10,8), coordenadas_lng DECIMAL(11,8),
                estado VARCHAR(50) DEFAULT 'Operativa', observaciones TEXT,
                activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === EQUIPOS POR ESTACIÓN ===
            `CREATE TABLE IF NOT EXISTS station_equipment (
                id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE CASCADE,
                codigo VARCHAR(50) UNIQUE NOT NULL, tipo_equipo VARCHAR(100) NOT NULL,
                marca VARCHAR(100), modelo VARCHAR(100), serie VARCHAR(100),
                potencia_hp DECIMAL(10,2), potencia_kw DECIMAL(10,2), voltaje VARCHAR(50),
                horas_operacion DECIMAL(10,2) DEFAULT 0, ultimo_mantenimiento DATE, proximo_mantenimiento DATE,
                estado VARCHAR(50) DEFAULT 'Operativo', observaciones TEXT,
                activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === ACTIVIDADES PLAN 2026 ===
            `CREATE TABLE IF NOT EXISTS maintenance_activities (
                id SERIAL PRIMARY KEY, codigo VARCHAR(10) UNIQUE NOT NULL, nombre VARCHAR(300) NOT NULL,
                presupuesto_anual DECIMAL(12,2) DEFAULT 0, presupuesto_t1 DECIMAL(12,2) DEFAULT 0,
                presupuesto_t2 DECIMAL(12,2) DEFAULT 0, presupuesto_t3 DECIMAL(12,2) DEFAULT 0,
                presupuesto_t4 DECIMAL(12,2) DEFAULT 0, activo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === LOG DE MANTENIMIENTO POR ESTACIÓN ===
            `CREATE TABLE IF NOT EXISTS station_maintenance_log (
                id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE SET NULL,
                equipment_id INTEGER REFERENCES station_equipment(id) ON DELETE SET NULL,
                activity_code VARCHAR(10), fecha DATE NOT NULL, tipo VARCHAR(50) DEFAULT 'preventivo',
                descripcion TEXT, horas_trabajadas DECIMAL(6,2), costo DECIMAL(12,2),
                tecnico VARCHAR(200), observaciones TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === ACTAS DE MANTENIMIENTO ===
            `CREATE TABLE IF NOT EXISTS maintenance_records (
                id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE SET NULL,
                equipment_id INTEGER REFERENCES station_equipment(id) ON DELETE SET NULL,
                activity_code VARCHAR(10), fecha_inicio DATE, fecha_fin DATE,
                tecnico_responsable VARCHAR(200), trabajo_realizado TEXT, materiales_usados TEXT,
                horas_empleadas DECIMAL(6,2), costo_total DECIMAL(12,2),
                conformidad VARCHAR(50), observaciones TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === SISTEMA DE AUTENTICACIÓN ===
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                dni VARCHAR(20) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // Migración: asegurar columnas dni y email en users
            `DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dni') THEN
                    ALTER TABLE users ADD COLUMN dni VARCHAR(20) UNIQUE NOT NULL DEFAULT '00000000';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
                    ALTER TABLE users ADD COLUMN email VARCHAR(255);
                END IF;
            END $$`,
            // Fix previo: 'station' a 'stations' para consistencia con frontend
            `UPDATE assets SET categoria = 'stations' WHERE categoria = 'station'`,

            // === PRODUCCIÓN OPAPTAR 2026 ===
            `CREATE TABLE IF NOT EXISTS produccion_bd (
                id SERIAL PRIMARY KEY, mes INTEGER NOT NULL, dia INTEGER NOT NULL,
                fecha DATE, pz10_caudal REAL DEFAULT 0, pz10_horas REAL DEFAULT 0,
                pz10_inicio REAL DEFAULT 0, pz10_final REAL DEFAULT 0, pz10_m3 REAL DEFAULT 0,
                pz11_caudal REAL DEFAULT 0, pz11_horas REAL DEFAULT 0,
                pz11_inicio REAL DEFAULT 0, pz11_final REAL DEFAULT 0, pz11_m3 REAL DEFAULT 0,
                pz13_caudal REAL DEFAULT 0, pz13_horas REAL DEFAULT 0,
                pz13_inicio REAL DEFAULT 0, pz13_final REAL DEFAULT 0, pz13_m3 REAL DEFAULT 0,
                pzmed_caudal REAL DEFAULT 0, pzmed_horas REAL DEFAULT 0,
                pzmed_inicio REAL DEFAULT 0, pzmed_final REAL DEFAULT 0, pzmed_m3 REAL DEFAULT 0,
                gfmin_caudal REAL DEFAULT 0, gfmin_horas REAL DEFAULT 0,
                gfmin_inicio REAL DEFAULT 0, gfmin_final REAL DEFAULT 0, gfmin_m3 REAL DEFAULT 0,
                ptap1_caudal REAL DEFAULT 0, ptap1_horas REAL DEFAULT 0,
                ptap1_inicio REAL DEFAULT 0, ptap1_final REAL DEFAULT 0, ptap1_m3 REAL DEFAULT 0,
                gfnar_caudal REAL DEFAULT 0, gfnar_horas REAL DEFAULT 0,
                gfnar_inicio REAL DEFAULT 0, gfnar_final REAL DEFAULT 0, gfnar_m3 REAL DEFAULT 0,
                pzchb_caudal REAL DEFAULT 0, pzchb_horas REAL DEFAULT 0,
                pzchb_inicio REAL DEFAULT 0, pzchb_final REAL DEFAULT 0, pzchb_m3 REAL DEFAULT 0,
                pzcm_caudal REAL DEFAULT 0, pzcm_horas REAL DEFAULT 0,
                pzcm_inicio REAL DEFAULT 0, pzcm_final REAL DEFAULT 0, pzcm_m3 REAL DEFAULT 0,
                pztm_caudal REAL DEFAULT 0, pztm_horas REAL DEFAULT 0,
                pztm_inicio REAL DEFAULT 0, pztm_final REAL DEFAULT 0, pztm_m3 REAL DEFAULT 0,
                ebaphija_caudal REAL DEFAULT 0, ebaphija_horas REAL DEFAULT 0,
                ebaphija_inicio REAL DEFAULT 0, ebaphija_final REAL DEFAULT 0, ebaphija_m3 REAL DEFAULT 0,
                ebapalar_caudal REAL DEFAULT 0, ebapalar_horas REAL DEFAULT 0,
                ebapalar_inicio REAL DEFAULT 0, ebapalar_final REAL DEFAULT 0, ebapalar_m3 REAL DEFAULT 0,
                ebappnue_caudal REAL DEFAULT 0, ebappnue_horas REAL DEFAULT 0,
                ebappnue_inicio REAL DEFAULT 0, ebappnue_final REAL DEFAULT 0, ebappnue_m3 REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS produccion_surtidor (
                id SERIAL PRIMARY KEY, num_sem INTEGER, mes INTEGER, anio INTEGER,
                fecha DATE, surtidor VARCHAR(50), itm INTEGER, placa VARCHAR(50),
                tvehiculo VARCHAR(100), volumen_gln REAL DEFAULT 0, volumen_m3 REAL DEFAULT 0,
                consumo_ca REAL DEFAULT 0, programa VARCHAR(100),
                hipoclorito REAL DEFAULT 0, cloro_residual REAL DEFAULT 0,
                hora TEXT, operador VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS produccion_rsanjuan (
                id SERIAL PRIMARY KEY, anio INTEGER, mes INTEGER,
                fecha TEXT, hora TEXT, caudal REAL DEFAULT 0,
                etiqueta TEXT, caudal_max REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS produccion_dashboard (
                id SERIAL PRIMARY KEY, fecha_reporte DATE, semana INTEGER,
                titulo TEXT, valor TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === METAS DE PRODUCCIÓN ===
            `CREATE TABLE IF NOT EXISTS produccion_metas (
                id SERIAL PRIMARY KEY, anio INTEGER NOT NULL, mes INTEGER NOT NULL,
                fuente VARCHAR(50) NOT NULL, meta_m3 REAL DEFAULT 0, meta_horas REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(anio, mes, fuente)
            )`,
            // Seed metas 2026 por defecto
            `INSERT INTO produccion_metas (anio, mes, fuente, meta_m3, meta_horas) VALUES
                (2026, 1, 'PZ10', 45000, 720), (2026, 1, 'PZ11', 42000, 720), (2026, 1, 'PZ13', 38000, 720),
                (2026, 1, 'PTAP1', 120000, 720), (2026, 1, 'PZ MED', 25000, 720),
                (2026, 1, 'GF MIN', 15000, 600), (2026, 1, 'GF NAR', 12000, 600),
                (2026, 1, 'PZ CHB', 8000, 600), (2026, 1, 'PZ CM', 6000, 500), (2026, 1, 'PZ TM', 5000, 500),
                (2026, 1, 'EBAP HIJA', 30000, 720), (2026, 1, 'EBAP ALAR', 25000, 720), (2026, 1, 'EBAP PNUE', 20000, 720)
            ON CONFLICT (anio, mes, fuente) DO NOTHING`,
            `CREATE TABLE IF NOT EXISTS produccion_alertas (
                id SERIAL PRIMARY KEY, tipo VARCHAR(50) NOT NULL, fuente VARCHAR(50),
                parametro VARCHAR(50), umbral REAL, operador VARCHAR(10) DEFAULT '<',
                activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `INSERT INTO produccion_alertas (tipo, fuente, parametro, umbral, operador) VALUES
                ('caudal_bajo', 'RSANJUAN', 'caudal', 5.0, '<'),
                ('caudal_critico', 'RSANJUAN', 'caudal', 3.0, '<')
            ON CONFLICT DO NOTHING`,
            // Unique constraints for produccion tables (for ON CONFLICT DO NOTHING)
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_bd_fecha ON produccion_bd(fecha)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_surtidor_row ON produccion_surtidor(fecha, surtidor, itm, placa)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_rsanjuan_row ON produccion_rsanjuan(fecha, hora)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_ptap_readings_fecha_hora ON ptap_readings(fecha, hora)`,
        ]
        for (const sql of migrations) {
            try { await pool.query(sql) } catch (e: any) {
                if (!e.message.includes('already exists') && !e.message.includes('does not exist')) console.log('[MIGRATION]', e.message)
            }
        }
        console.log('[DB] ✅ Migraciones aplicadas')

        // Aplicar esquema externo del sistema de inventario (esquema calificado)
        const schemaPath = path.join(process.cwd(), 'server', 'migrations', '009_inventory_system.sql')
        if (fs.existsSync(schemaPath)) {
            console.log('[DB] Aplicando esquema de inventario (009_inventory_system.sql)...')
            const schemaSql = fs.readFileSync(schemaPath, 'utf8')
            await pool.query(schemaSql)
            console.log('[DB] ✅ Esquema de inventario aplicado con éxito en el esquema "inventario"')
        }
    } catch (err: any) {
        console.error('[DB] ❌ Error de conexión o migración inicial:', err.message)
    }
    return pool
}

export function getDb() { return pool }

function transformQuery(sql: string): string {
    let index = 1
    return sql.replace(/\?/g, () => `$${index++}`)
}

export function getPgPool() { return pool }

export async function dbAll(sql: string, ...params: any[]): Promise<any[]> {
    const pgSql = transformQuery(sql)
    const res = await pool.query(pgSql, params)
    return res.rows
}

export async function dbGet(sql: string, ...params: any[]): Promise<any | undefined> {
    const rows = await dbAll(sql, ...params)
    return rows[0]
}

export async function dbRun(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const pgSql = transformQuery(sql)
    const res = await pool.query(pgSql, params)
    return { lastInsertRowid: res.rows[0]?.id || 0, changes: res.rowCount || 0 }
}
