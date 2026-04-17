# Plan de Implementación: Monitoreo de Agua Potable

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar un módulo de extensión para monitorear presión y continuidad del agua potable en 7 distritos.

**Architecture:** Extensión desacoplada que utiliza las tablas `water_readings` y `water_alerts`. Backend en Express con lógica estadística y Frontend en React con Dashboard dinámico.

**Tech Stack:** React, TypeScript, Vite, Recharts, Express, SQLite (sql.js).

---

### Task 1: Expansión de Base de Datos

**Files:**
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\server\schema.sql`

**Step 1: Añadir tablas de monitoreo de agua**
Añadir al final del archivo `schema.sql`:
```sql
-- Extensión: Monitoreo de Agua Potable
CREATE TABLE IF NOT EXISTS water_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  distrito TEXT NOT NULL,
  zona TEXT NOT NULL,
  presion REAL NOT NULL,
  continuidad REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(fecha, distrito, zona)
);

CREATE TABLE IF NOT EXISTS water_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  reading_id INTEGER,
  tipo_alerta TEXT,
  valor REAL,
  umbral REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (reading_id) REFERENCES water_readings(id)
);
```

**Step 2: Verificar inicialización**
Reiniciar el servidor si está corriendo y verificar que no haya errores de sintaxis.

**Step 3: Commit**
```bash
git add server/schema.sql
git commit -m "db: add water monitoring tables"
```

---

### Task 2: Backend - Router y Endpoints

**Files:**
- Create: `d:\Modelos Antigravity\Sap Mantenimiento\server\routes\water.ts`
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\server\index.ts`

**Step 1: Crear el router de agua**
Implementar endpoints básicos: GET por fecha y POST bulk.
```typescript
import { Router } from 'express'
import { dbAll, dbRun } from '../database.js'

export const waterRouter = Router()

waterRouter.get('/readings', (req, res) => {
    const { fecha } = req.query
    const rows = dbAll('SELECT * FROM water_readings WHERE fecha = ?', fecha)
    res.json(rows)
})

waterRouter.post('/readings/bulk', (req, res) => {
    const { readings } = req.body
    for (const r of readings) {
        dbRun(`INSERT OR REPLACE INTO water_readings 
               (fecha, distrito, zona, presion, continuidad, updated_at) 
               VALUES (?, ?, ?, ?, ?, datetime('now'))`, 
               r.fecha, r.distrito, r.zona, r.presion, r.continuidad)
    }
    res.json({ success: true })
})
```

**Step 2: Registrar en index.ts**
```typescript
import { waterRouter } from './routes/water.js'
// ...
app.use('/api/water', waterRouter)
```

**Step 3: Commit**
```bash
git add server/routes/water.ts server/index.ts
git commit -m "api: base water monitoring routes"
```

---

### Task 3: Backend - Lógica Estadística

**Files:**
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\server\routes\water.ts`

**Step 1: Implementar endpoint de estadísticas**
Calcular promedios, máximos y mínimos por distrito y zona.
```typescript
waterRouter.get('/stats', (req, res) => {
    const { inicio, fin } = req.query
    const stats = dbAll(`
        SELECT 
            distrito,
            AVG(presion) as avg_presion,
            AVG(continuidad) as avg_continuidad,
            MAX(presion) as max_presion,
            MIN(presion) as min_presion
        FROM water_readings 
        WHERE fecha BETWEEN ? AND ?
        GROUP BY distrito
    `, inicio, fin)
    res.json(stats)
})
```

**Step 2: Commit**
```bash
git commit -m "api: water statistics endpoint"
```

---

### Task 4: Frontend - Navegación y Página Base

**Files:**
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\src\App.tsx`
- Create: `d:\Modelos Antigravity\Sap Mantenimiento\src\pages\MonitoreoAgua.tsx`

**Step 1: Añadir sección al menú lateral**
```typescript
// En menuItems, dentro de 'Operaciones Principales'
{ path: '/monitoreo-agua', label: 'Monitoreo de Agua', icon: 'water_drop' },
```

**Step 2: Registrar ruta en Routes**
```typescript
<Route path="/monitoreo-agua" element={<MonitoreoAgua />} />
```

**Step 3: Commit**
```bash
git add src/App.tsx src/pages/MonitoreoAgua.tsx
git commit -m "ui: water monitoring navigation"
```

---

### Task 5: UI - Grilla de Carga Masiva (Español)

**Files:**
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\src\pages\MonitoreoAgua.tsx`

**Step 1: Implementar tabla de 21 filas**
Usar los distritos y zonas fijos.
```typescript
const DISTRITOS = ['Chincha Alta', 'Grocio Prado', 'Alto Larán', 'Sunampe', 'Tambo de Mora', 'Chincha Baja', 'Pueblo Nuevo'];
const ZONAS = ['Alta', 'Media', 'Baja'];
```

**Step 2: Añadir validaciones y colores**
Pintar celdas según los umbrales definidos:
- Presión < 10 (Rojo)
- Continuidad < 8 (Rojo), < 12 (Amarillo)

**Step 3: Commit**
```bash
git commit -m "ui: bulk water data entry grid"
```

---

### Task 6: UI - Dashboard Estadístico

**Files:**
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\src\pages\MonitoreoAgua.tsx`

**Step 1: Integrar Recharts**
Mostrar gráfico de barras para presión y líneas para evolución.

**Step 2: Añadir tarjetas de resumen**
- Promedio General EPS.
- Conteo de Puntos Críticos.

**Step 3: Commit**
```bash
git commit -m "ui: water monitoring dashboard"
```

---

### Task 7: Reportes PDF

**Files:**
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\src\pages\MonitoreoAgua.tsx`
- Modify: `d:\Modelos Antigravity\Sap Mantenimiento\src\pages\Reportes.tsx`

**Step 1: Integrar con el generador de PDF global**
Asegurar que el contenido de la página de agua sea capturable por `html-to-image`.

**Step 2: Commit**
```bash
git commit -m "ui: water reporting integration"
```
