import { Router } from 'express'
import { dbAll, dbRun, dbGet, getPgPool } from '../database.js'
import multer from 'multer'
import path from 'path'
import XLSX from 'xlsx'
import fs from 'fs'

const pool = getPgPool()

const upload = multer({
    dest: '/tmp/uploads/',
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        if (['.xlsx', '.xls'].includes(ext)) cb(null, true)
        else cb(new Error('Formato no soportado. Use .xlsx'))
    }
})

export const waterRouter = Router()

// Obtener lecturas por fecha o rango
waterRouter.get('/readings', async (req, res) => {
    try {
        const { inicio, fin, fecha } = req.query
        let rows
        if (fecha) {
            rows = await dbAll('SELECT * FROM water_readings WHERE fecha = ?', fecha)
        } else if (inicio && fin) {
            rows = await dbAll('SELECT * FROM water_readings WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC, distrito', inicio, fin)
        } else {
            return res.status(400).json({ error: 'Fecha o rango (inicio, fin) es requerido' })
        }
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
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
        ON CONFLICT (fecha, hora) DO NOTHING`,
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

// Subida directa de archivo Excel — el servidor parsea e inserta
waterRouter.post('/ptap/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' })

        const wb = XLSX.readFile(req.file.path)
        const sheetName = wb.SheetNames.find((s: string) => s.includes('CONTROL DE PROCESO')) || wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const dataRows = raw.slice(14).filter((r: any[]) => r[1] && r[2])

        try { fs.unlinkSync(req.file.path) } catch { /* cleanup */ }

        if (!dataRows.length) return res.status(400).json({ error: 'No se encontraron datos en la hoja' })

        const parseNum = (v: any): number => {
            if (v == null || v === '' || v === '-') return 0
            if (typeof v === 'number') return v
            return parseFloat(String(v).replace(',', '.')) || 0
        }

        const readings = dataRows.map((r: any[]) => {
            let fecha = ''
            if (typeof r[1] === 'number') {
                const d = XLSX.SSF.parse_date_code(r[1])
                fecha = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
            } else if (r[1]) {
                const s = String(r[1]).trim()
                fecha = s.includes('-') ? s : `2026-${s}`
            }
            return {
                fecha, hora: String(r[2] ?? '').trim(),
                caudal: parseNum(r[3]), dosis_aluminio: parseNum(r[4]), dosis_anionico: parseNum(r[5]),
                apertura_aluminio: parseNum(r[6]), apertura_anionico: parseNum(r[7]),
                ingreso_turbiedad: parseNum(r[8]), ingreso_conductividad: parseNum(r[9]), ingreso_color: parseNum(r[10]),
                ingreso_alcalinidad: parseNum(r[11]), ingreso_ph: parseNum(r[12]), ingreso_aluminio: parseNum(r[13]),
                ingreso_dureza: parseNum(r[14]), ingreso_ovl: parseNum(r[15]),
                decantador_turbiedad: parseNum(r[16]), decantador_color: parseNum(r[17]), decantador_ph: parseNum(r[18]),
                filtros_ing_turb: parseNum(r[22]), filtros_ing_col: parseNum(r[23]), filtros_ing_ph: parseNum(r[24]),
                filtros_sal_turb: parseNum(r[25]), filtros_sal_col: parseNum(r[26]), filtros_sal_ph: parseNum(r[27]),
                tratada_turbiedad: parseNum(r[28]), tratada_conductividad: parseNum(r[29]), tratada_color: parseNum(r[30]),
                tratada_ph: parseNum(r[31]), tratada_aluminioReal: parseNum(r[32]), tratada_cloro: parseNum(r[33]),
                tratada_dureza: parseNum(r[34]), tratada_ovl: parseNum(r[35]),
            }
        })

        const cols = ['fecha','hora','operador','caudal',
            'dosis_aluminio','dosis_anionico','apertura_aluminio','apertura_anionico',
            'ingreso_turbiedad','ingreso_conductividad','ingreso_color','ingreso_alcalinidad','ingreso_ph','ingreso_aluminio','ingreso_dureza','ingreso_ovl',
            'decantador_turbiedad','decantador_color','decantador_ph',
            'filtros_ing_turb','filtros_ing_col','filtros_ing_ph',
            'filtros_sal_turb','filtros_sal_col','filtros_sal_ph',
            'tratada_turbiedad','tratada_conductividad','tratada_color','tratada_ph','tratada_aluminioReal','tratada_cloro','tratada_dureza','tratada_ovl'];

        const toRow = (r: any) => [r.fecha, r.hora, r.operador || '', r.caudal || 0,
            r.dosis_aluminio || 0, r.dosis_anionico || 0, r.apertura_aluminio || 0, r.apertura_anionico || 0,
            r.ingreso_turbiedad || 0, r.ingreso_conductividad || 0, r.ingreso_color || 0, r.ingreso_alcalinidad || 0,
            r.ingreso_ph || 0, r.ingreso_aluminio || 0, r.ingreso_dureza || 0, r.ingreso_ovl || 0,
            r.decantador_turbiedad || 0, r.decantador_color || 0, r.decantador_ph || 0,
            r.filtros_ing_turb || 0, r.filtros_ing_col || 0, r.filtros_ing_ph || 0,
            r.filtros_sal_turb || 0, r.filtros_sal_col || 0, r.filtros_sal_ph || 0,
            r.tratada_turbiedad || 0, r.tratada_conductividad || 0, r.tratada_color || 0, r.tratada_ph || 0,
            r.tratada_aluminioReal || 0, r.tratada_cloro || 0, r.tratada_dureza || 0, r.tratada_ovl || 0];

        const CHUNK = 500;
        let totalInserted = 0;
        const totalBatches = Math.ceil(readings.length / CHUNK);

        for (let i = 0; i < readings.length; i += CHUNK) {
            const chunk = readings.slice(i, i + CHUNK);
            const placeholders = chunk.map((_, j) => {
                const base = j * cols.length;
                return `(${cols.map((_, k) => `$${base + k + 1}`).join(',')})`;
            }).join(',');
            const values = chunk.flatMap(toRow);
            const sql = `INSERT INTO ptap_readings (${cols.join(',')}) VALUES ${placeholders} ON CONFLICT (fecha, hora) DO NOTHING`;
            try {
                const r2 = await pool.query(sql, values);
                totalInserted += r2.rowCount || 0;
            } catch (batchErr: any) {
                console.error(`[UPLOAD] Lote ${Math.floor(i / CHUNK) + 1}/${totalBatches} error: ${batchErr.message}`);
            }
        }

        res.json({ success: true, total: readings.length, inserted: totalInserted });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Importación masiva desde JSON (legacy, compatible con frontend existente)
waterRouter.post('/ptap/bulk', async (req, res) => {
    try {
        const { readings } = req.body;
        if (!readings || !Array.isArray(readings)) {
            return res.status(400).json({ error: 'Se requiere un array de readings' });
        }

        const cols = ['fecha','hora','operador','caudal',
            'dosis_aluminio','dosis_anionico','apertura_aluminio','apertura_anionico',
            'ingreso_turbiedad','ingreso_conductividad','ingreso_color','ingreso_alcalinidad','ingreso_ph','ingreso_aluminio','ingreso_dureza','ingreso_ovl',
            'decantador_turbiedad','decantador_color','decantador_ph',
            'filtros_ing_turb','filtros_ing_col','filtros_ing_ph',
            'filtros_sal_turb','filtros_sal_col','filtros_sal_ph',
            'tratada_turbiedad','tratada_conductividad','tratada_color','tratada_ph','tratada_aluminioReal','tratada_cloro','tratada_dureza','tratada_ovl'];

        const toRow = (r: any) => [r.fecha, r.hora, r.operador || '', r.caudal || 0,
            r.dosis_aluminio || 0, r.dosis_anionico || 0, r.apertura_aluminio || 0, r.apertura_anionico || 0,
            r.ingreso_turbiedad || 0, r.ingreso_conductividad || 0, r.ingreso_color || 0, r.ingreso_alcalinidad || 0,
            r.ingreso_ph || 0, r.ingreso_aluminio || 0, r.ingreso_dureza || 0, r.ingreso_ovl || 0,
            r.decantador_turbiedad || 0, r.decantador_color || 0, r.decantador_ph || 0,
            r.filtros_ing_turb || 0, r.filtros_ing_col || 0, r.filtros_ing_ph || 0,
            r.filtros_sal_turb || 0, r.filtros_sal_col || 0, r.filtros_sal_ph || 0,
            r.tratada_turbiedad || 0, r.tratada_conductividad || 0, r.tratada_color || 0, r.tratada_ph || 0,
            r.tratada_aluminioReal || 0, r.tratada_cloro || 0, r.tratada_dureza || 0, r.tratada_ovl || 0];

        const CHUNK = 500;
        let totalInserted = 0;
        const totalBatches = Math.ceil(readings.length / CHUNK);

        for (let i = 0; i < readings.length; i += CHUNK) {
            const chunk = readings.slice(i, i + CHUNK);
            const placeholders = chunk.map((_, j) => {
                const base = j * cols.length;
                return `(${cols.map((_, k) => `$${base + k + 1}`).join(',')})`;
            }).join(',');
            const values = chunk.flatMap(toRow);
            const sql = `INSERT INTO ptap_readings (${cols.join(',')}) VALUES ${placeholders} ON CONFLICT (fecha, hora) DO NOTHING`;
            try {
                const r2 = await pool.query(sql, values);
                totalInserted += r2.rowCount || 0;
                console.log(`[BULK] Lote ${Math.floor(i / CHUNK) + 1}/${totalBatches} — ${r2.rowCount || 0} insertados`);
            } catch (batchErr: any) {
                console.error(`[BULK] Lote ${Math.floor(i / CHUNK) + 1} error: ${batchErr.message}`);
            }
        }

        res.json({ success: true, total: readings.length, inserted: totalInserted });
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

// PTAP por rango de fechas (para gráficos)
waterRouter.get('/ptap/range', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        let sql = 'SELECT * FROM ptap_readings';
        const params: any[] = [];
        if (inicio && fin) {
            sql += ' WHERE fecha >= $1 AND fecha <= $2';
            params.push(inicio, fin);
        }
        sql += ' ORDER BY fecha ASC, hora ASC';
        const rows = await dbAll(sql, ...params);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
