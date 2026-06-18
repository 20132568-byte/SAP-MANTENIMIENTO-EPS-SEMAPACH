import { getDb } from './db.js'

export async function runSeeds() {
    const pool = getDb()

    // Seed actividades 2026
    try {
        const activities = [
            { c: 'A.01', n: 'Sistemas de puesta a tierra', p: 7155, t1: 1862.26, t2: 1862.26, t3: 0, t4: 0 },
            { c: 'A.02', n: 'Sistemas eléctricos generales', p: 17246, t1: 0, t2: 17246, t3: 0, t4: 0 },
            { c: 'A.03', n: 'Subestaciones de potencia', p: 41516, t1: 0, t2: 41516, t3: 0, t4: 0 },
            { c: 'A.04', n: 'Motores eléctricos verticales', p: 37504, t1: 0, t2: 37504, t3: 0, t4: 0 },
            { c: 'A.05', n: 'Motores horizontales y bombas centrífugas', p: 67792, t1: 0, t2: 67792, t3: 0, t4: 0 },
            { c: 'A.06', n: 'Sistemas de bombeo de pozos profundos', p: 19500, t1: 0, t2: 19500, t3: 0, t4: 0 },
            { c: 'A.07', n: 'Tableros de control y fuerza', p: 21240, t1: 2360, t2: 9440, t3: 9440, t4: 0 },
            { c: 'A.08', n: 'Electrobombas inmersibles tipo trompo', p: 26042, t1: 0, t2: 0, t3: 0, t4: 26042 },
            { c: 'A.09', n: 'Dosificadores y agitadores', p: 201703, t1: 50425.75, t2: 50425.75, t3: 50425.75, t4: 50425.75 },
            { c: 'A.10', n: 'Incidencias operativas de equipos eléctricos', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            { c: 'A.11', n: 'Equipos electromecánicos de alcantarillado', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            { c: 'A.12', n: 'Movilidades y maquinaria – aguas residuales', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            { c: 'A.13', n: 'Sistema eléctrico de tableros e iluminación', p: 335500, t1: 19735.29, t2: 105254.90, t3: 105254.90, t4: 105254.90 },
            { c: 'A.14', n: 'Adquisición de EPPs para personal técnico', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            { c: 'A.15', n: 'Implementación del equipo de control de pérdidas', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            { c: 'A.16', n: 'Mantenimiento correctivo movilidades agua potable', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            { c: 'A.17', n: 'Mantenimiento correctivo movilidades alcantarillado', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
        ]
        for (const a of activities) {
            await pool.query(`INSERT INTO maintenance_activities (codigo, nombre, presupuesto_anual, presupuesto_t1, presupuesto_t2, presupuesto_t3, presupuesto_t4) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre, presupuesto_anual=EXCLUDED.presupuesto_anual, presupuesto_t1=EXCLUDED.presupuesto_t1, presupuesto_t2=EXCLUDED.presupuesto_t2, presupuesto_t3=EXCLUDED.presupuesto_t3, presupuesto_t4=EXCLUDED.presupuesto_t4`, [a.c, a.n, a.p, a.t1, a.t2, a.t3, a.t4])
        }
        console.log('[SEED] 17 actividades plan 2026 insertadas')
    } catch (e: any) { console.log('[SEED ACTIVITIES]', e.message) }

    // Seed catálogos
    try {
        const st = ['Estación de Bombeo', 'Pozo Profundo', 'Subestación Eléctrica', 'Reservorio', 'PTAP', 'Cámara de Válvulas', 'Tanque de Almacenamiento']
        for (const t of st) await pool.query(`INSERT INTO catalogs (tipo, valor, activo) VALUES ('tipo_estacion', $1, 1) ON CONFLICT DO NOTHING`, [t])
        const eq = ['Motor Eléctrico Vertical', 'Motor Eléctrico Horizontal', 'Bomba Centrífuga', 'Electrobomba Inmersible', 'Tablero de Control', 'Tablero de Fuerza', 'Sistema de Puesta a Tierra', 'Dosificador', 'Agitador', 'Transformador', 'Generador', 'Válvula', 'Sensor de Nivel', 'Sensor de Presión', 'Cisterna', 'Filtro', 'Clorador', 'Sistema de Iluminación']
        for (const t of eq) await pool.query(`INSERT INTO catalogs (tipo, valor, activo) VALUES ('tipo_equipo', $1, 1) ON CONFLICT DO NOTHING`, [t])
        console.log('[SEED] Catálogos estaciones/equipos insertados')
    } catch (e: any) { console.log('[SEED CATALOGS]', e.message) }

    // Seed estaciones y equipos
    try {
        const stations = [
            { c: 'I.1', n: 'Pozo 10', t: 'Pozo' }, { c: 'I.2', n: 'Pozo 13', t: 'Pozo' },
            { c: 'I.3', n: 'Pozo Chincha Baja', t: 'Pozo' }, { c: 'I.4', n: 'Pozo Tambo de Mora', t: 'Pozo' },
            { c: 'I.5', n: 'Pozo Medrano', t: 'Pozo' },
            { c: 'I.6', n: 'CBAP Hijaya', t: 'CBAP' }, { c: 'I.7', n: 'CBAP Larán', t: 'CBAP' },
            { c: 'I.8', n: 'CBAP Pueblo Nuevo', t: 'CBAP' },
            { c: 'I.9', n: 'CBD Tambo de Mora', t: 'CBD' }, { c: 'I.10', n: 'CBD Parque Chincha Baja', t: 'CBD' },
            { c: 'I.11', n: 'PTAP Portachuelos', t: 'PTAP' },
            { c: 'I.12', n: 'Reservorio R-7', t: 'Reservorio' }, { c: 'I.13', n: 'Reservorio R-3', t: 'Reservorio' },
            { c: 'I.14', n: 'Subestación General Hijaya', t: 'Subestación Eléctrica' },
            { c: 'I.15', n: 'Taller EPS El Canchón', t: 'Otro' }, { c: 'I.16', n: 'Oficinas', t: 'Otro' },
            { c: 'I.17', n: 'EBAP Alto Laran', t: 'Estación de Bombeo' },
        ]
        const eqByType: Record<string, string[]> = {
            'Pozo': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Electrobomba Inmersible', 'Sistema de Iluminación', 'Bomba Centrífuga'],
            'CBAP': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Dosificador', 'Sistema de Iluminación', 'Bomba Centrífuga'],
            'CBD': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Motor Eléctrico Horizontal', 'Bomba Centrífuga', 'Sistema de Iluminación'],
            'PTAP': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Dosificador', 'Agitador', 'Sistema de Iluminación', 'Bomba Centrífuga'],
            'Reservorio': ['Tablero de Control', 'Sistema de Iluminación'],
            'Subestación Eléctrica': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Transformador', 'Sistema de Iluminación'],
            'Otro': ['Tablero de Fuerza', 'Sistema de Iluminación'],
            'Estación de Bombeo': ['Electrobomba Centrífuga', 'Tablero de Control', 'Tablero de Fuerza', 'Sistema de Iluminación'],
        }
        let eqCount = 0
        for (const s of stations) {
            await pool.query(`INSERT INTO water_stations (codigo, nombre, tipo, estado) VALUES ($1,$2,$3,'Operativa') ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre, tipo=EXCLUDED.tipo`, [s.c, s.n, s.t])
            const eqs = eqByType[s.t] || eqByType['Otro']
            for (const eq of eqs) {
                await pool.query(`INSERT INTO station_equipment (station_id, codigo, tipo_equipo, estado) VALUES ((SELECT id FROM water_stations WHERE codigo=$1), $2, $3, 'Operativo') ON CONFLICT (codigo) DO UPDATE SET tipo_equipo=EXCLUDED.tipo_equipo`, [s.c, `${s.c}-${eq.replace(/\s+/g, '-').toUpperCase()}`, eq])
                eqCount++
            }
        }

        // Seed específico de Alto Laran en la tabla de activos
        const altoLaranId = (await pool.query(`SELECT id FROM water_stations WHERE codigo = 'I.17'`)).rows[0]?.id
        if (altoLaranId) {
            const assetsAltoLaran = [
                { cod: 'AL-EB-01', t: 'Electrobomba Centrífuga', obs: 'Trifásica 30HP Bomba 3"', hp: 30, kw: 22.37, v: '380V' },
                { cod: 'AL-AH-01', t: 'Árbol Hidráulico', obs: 'Tubería de 4"', v: 'N/A' },
                { cod: 'AL-VC-01', t: 'Válvula Compuerta', obs: 'Con timón de 4"', v: 'N/A' },
                { cod: 'AL-BB-01', t: 'Bomba Booster', obs: 'Sistema de cloración trifásico 1kW', kw: 1, v: '380V' },
                { cod: 'AL-TA-01', t: 'Tablero de Arranque', obs: 'Arrancador estado sólido 3x380V AC', v: '3x380V' },
                { cod: 'AL-TC-01', t: 'Tablero Cloración', obs: '3x380V Vac', v: '3x380V' },
                { cod: 'AL-BE-01', t: 'Balanza Electrónica', obs: 'Tanque cloro gas 68kg', v: 'N/A' },
                { cod: 'AL-TCG-01', t: 'Tanque Cloro Gas', obs: '68kg (Unidad 1)', v: 'N/A' },
                { cod: 'AL-CL-01', t: 'Clorador / Panel', obs: 'Incluye rotámetro', v: 'N/A' },
                { cod: 'AL-MA-01', t: 'Manómetro', obs: 'Presión 1/2" y 3/4"', v: 'N/A' },
                { cod: 'AL-MD-01', t: 'Macromedidor Digital', obs: 'Digital 4"', v: 'N/A' },
                { cod: 'AL-TD-01', t: 'Tablero de Distribución', obs: 'Circuito tomacorrientes y luminarias', v: '220V' },
                { cod: 'AL-LU-01', t: 'Sistema Iluminación', obs: 'Reflector 200W, Pastoral 150W, Focos E27', v: '220V' },
                { cod: 'AL-GE-01', t: 'Grupo Electrógeno', obs: 'MODASA 55KW - 440V - 90A', kw: 55, v: '440V' },
            ]
            for (const a of assetsAltoLaran) {
                await pool.query(`INSERT INTO assets (codigo_patrimonial, tipo_unidad, categoria, station_id, observaciones, potencia_hp, potencia_kw, voltaje, forma_control, estado) 
                    VALUES ($1,$2,'stations',$3,$4,$5,$6,$7,'Horómetro','Operativo') 
                    ON CONFLICT (codigo_patrimonial) DO UPDATE SET station_id=EXCLUDED.station_id, categoria=EXCLUDED.categoria`,
                    [a.cod, a.t, altoLaranId, a.obs, a.hp || 0, a.kw || 0, a.v])
            }
        }

        console.log(`[SEED] ${stations.length} estaciones + ${eqCount} equipos insertados`)
    } catch (e: any) { console.log('[SEED STATIONS]', e.message) }
}
