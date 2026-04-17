import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../database.js'

export const waterRouter = Router()

// Obtener lecturas por fecha
waterRouter.get('/readings', async (req, res) => {
    try {
        const { fecha } = req.query
        if (!fecha) {
            return res.status(400).json({ error: 'Fecha es requerida' })
        }
        const rows = await dbAll('SELECT * FROM water_readings WHERE fecha = ?', fecha)
        res.json(rows)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// Carga masiva de lecturas
waterRouter.post('/readings/bulk', async (req, res) => {
    try {
        const { readings } = req.body
        if (!readings || !Array.isArray(readings)) {
            return res.status(400).json({ error: 'Formato de datos inválido' })
        }

        for (const r of readings) {
            await dbRun(`INSERT INTO water_readings 
                   (fecha, distrito, zona, presion, continuidad, updated_at) 
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT (fecha, distrito, zona) DO UPDATE SET
                   presion = EXCLUDED.presion,
                   continuidad = EXCLUDED.continuidad,
                   updated_at = CURRENT_TIMESTAMP`, 
                   r.fecha, r.distrito, r.zona, r.presion, r.continuidad)
        }
        res.json({ success: true })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// Estadísticas y promedios
waterRouter.get('/stats', async (req, res) => {
    try {
        const { inicio, fin } = req.query
        if (!inicio || !fin) {
            return res.status(400).json({ error: 'Rango de fechas (inicio, fin) es requerido' })
        }

        const [stats, generalStats, epsSummary] = await Promise.all([
            dbAll(`
                SELECT 
                    distrito,
                    AVG(presion) as avg_presion,
                    AVG(continuidad) as avg_continuidad,
                    MAX(presion) as max_presion,
                    MIN(presion) as min_presion,
                    MAX(continuidad) as max_continuidad,
                    MIN(continuidad) as min_continuidad
                FROM water_readings 
                WHERE fecha BETWEEN ? AND ?
                GROUP BY distrito
            `, inicio, fin),
            dbAll(`
                SELECT 
                    zona,
                    AVG(presion) as avg_presion,
                    AVG(continuidad) as avg_continuidad
                FROM water_readings 
                WHERE fecha BETWEEN ? AND ?
                GROUP BY zona
            `, inicio, fin),
            dbGet(`
                SELECT 
                    AVG(presion) as avg_presion,
                    AVG(continuidad) as avg_continuidad,
                    COUNT(CASE WHEN presion < 10 THEN 1 END) as criticos_presion,
                    COUNT(CASE WHEN continuidad < 8 THEN 1 END) as criticos_continuidad
                FROM water_readings 
                WHERE fecha BETWEEN ? AND ?
            `, inicio, fin)
        ]) as any[]

        res.json({
            porDistrito: stats.map((s: any) => ({
                ...s,
                avg_presion: Number(s.avg_presion),
                avg_continuidad: Number(s.avg_continuidad),
                max_presion: Number(s.max_presion),
                min_presion: Number(s.min_presion),
                max_continuidad: Number(s.max_continuidad),
                min_continuidad: Number(s.min_continuidad)
            })),
            porZona: generalStats.map((s: any) => ({
                ...s,
                avg_presion: Number(s.avg_presion),
                avg_continuidad: Number(s.avg_continuidad)
            })),
            resumenGeneral: epsSummary ? {
                ...epsSummary,
                avg_presion: Number(epsSummary.avg_presion),
                avg_continuidad: Number(epsSummary.avg_continuidad),
                criticos_presion: Number(epsSummary.criticos_presion),
                criticos_continuidad: Number(epsSummary.criticos_continuidad)
            } : null
        })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})
// --- ENDPOINTS PTAP PORTACHUELO ---

// Guardar lectura PTAP (desde el formulario)
waterRouter.post('/ptap', async (req, res) => {
    try {
        const r = req.body;
        await dbRun(`INSERT INTO ptap_readings (
            fecha, hora, operador, caudal,
            dosis_aluminio, dosis_anionico, apertura_aluminio, apertura_anionico,
            ingreso_turbiedad, ingreso_conductividad, ingreso_color, ingreso_alcalinidad, ingreso_ph, ingreso_aluminio, ingreso_dureza, ingreso_ovl,
            decantador_turbiedad, decantador_color, decantador_ph,
            filtros_ing_turb, filtros_ing_col, filtros_ing_ph,
            filtros_sal_turb, filtros_sal_col, filtros_sal_ph,
            tratada_turbiedad, tratada_conductividad, tratada_color, tratada_ph, tratada_aluminioReal, tratada_cloro, tratada_dureza, tratada_ovl
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)`,
        r.fecha, r.hora, r.operador || 'Operador', r.caudal,
        r.dosis?.aluminio || 0, r.dosis?.anionico || 0, r.apertura?.aluminio || 0, r.apertura?.anionico || 0,
        r.ingreso?.turbiedad || 0, r.ingreso?.conductividad || 0, r.ingreso?.color || 0, r.ingreso?.alcalinidad || 0, r.ingreso?.ph || 0, r.ingreso?.aluminio || 0, r.ingreso?.dureza || 0, r.ingreso?.ovl || 0,
        r.decantador?.turbiedad || 0, r.decantador?.color || 0, r.decantador?.ph || 0,
        r.filtros?.ingreso?.turbiedad || 0, r.filtros?.ingreso?.color || 0, r.filtros?.ingreso?.ph || 0,
        r.filtros?.salida?.turbiedad || 0, r.filtros?.salida?.color || 0, r.filtros?.salida?.ph || 0,
        r.tratada?.turbiedad || 0, r.tratada?.conductividad || 0, r.tratada?.color || 0, r.tratada?.ph || 0, r.tratada?.aluminioResidual || 0, r.tratada?.cloroResidual || 0, r.tratada?.dureza || 0, r.tratada?.ovl || 0);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Importación masiva desde Excel (el servidor tiene acceso directo a la DB)
waterRouter.post('/ptap/bulk', async (req, res) => {
    try {
        const { readings } = req.body;
        if (!readings || !Array.isArray(readings)) {
            return res.status(400).json({ error: 'Se requiere un array de readings' });
        }
        let inserted = 0;
        for (const r of readings) {
            await dbRun(`INSERT INTO ptap_readings (
                fecha, hora, operador, caudal,
                dosis_aluminio, dosis_anionico, apertura_aluminio, apertura_anionico,
                ingreso_turbiedad, ingreso_conductividad, ingreso_color, ingreso_alcalinidad, ingreso_ph, ingreso_aluminio, ingreso_dureza, ingreso_ovl,
                decantador_turbiedad, decantador_color, decantador_ph,
                filtros_ing_turb, filtros_ing_col, filtros_ing_ph,
                filtros_sal_turb, filtros_sal_col, filtros_sal_ph,
                tratada_turbiedad, tratada_conductividad, tratada_color, tratada_ph, tratada_aluminioReal, tratada_cloro, tratada_dureza, tratada_ovl
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)`,
            r.fecha, r.hora, r.operador, r.caudal,
            r.dosis_aluminio, r.dosis_anionico, r.apertura_aluminio, r.apertura_anionico,
            r.ingreso_turbiedad, r.ingreso_conductividad, r.ingreso_color, r.ingreso_alcalinidad, r.ingreso_ph, r.ingreso_aluminio, r.ingreso_dureza, r.ingreso_ovl,
            r.decantador_turbiedad, r.decantador_color, r.decantador_ph,
            r.filtros_ing_turb, r.filtros_ing_col, r.filtros_ing_ph,
            r.filtros_sal_turb, r.filtros_sal_col, r.filtros_sal_ph,
            r.tratada_turbiedad, r.tratada_conductividad, r.tratada_color, r.tratada_ph, r.tratada_aluminioReal, r.tratada_cloro, r.tratada_dureza, r.tratada_ovl);
            inserted++;
        }
        res.json({ success: true, inserted });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener lecturas del día para PTAP
waterRouter.get('/ptap/daily', async (req, res) => {
    try {
        const { fecha } = req.query;
        const rows = await dbAll('SELECT * FROM ptap_readings WHERE fecha = $1 ORDER BY hora ASC', fecha);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Stats para Dashboard PTAP (por fecha)
waterRouter.get('/ptap/dashboard', async (req, res) => {
    try {
        const { fecha } = req.query;
        const readings = await dbAll(`
            SELECT 
                hora, 
                ingreso_turbiedad as turb_ing, 
                tratada_turbiedad as turb_sal,
                tratada_cloro as cloro,
                caudal
            FROM ptap_readings 
            WHERE fecha = $1 
            ORDER BY hora ASC`, fecha);
        res.json(readings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
