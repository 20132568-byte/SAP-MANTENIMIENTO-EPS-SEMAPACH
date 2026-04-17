# Diseño Técnico: Extensión de Monitoreo de Agua Potable

**Fecha:** 2026-03-11  
**Estado:** Aprobado  
**Módulo:** Control Diario de Presión y Continuidad

## 1. Introducción
Este documento detalla el diseño de la extensión para el monitoreo de agua potable de EPS SEMAPACH. El objetivo es permitir el registro diario de presión y continuidad en 7 distritos, segmentados por 3 zonas (Alta, Media, Baja), con cálculos estadísticos automáticos y visualización en tiempo real.

## 2. Requisitos del Sistema (Español)
Toda la interfaz y los reportes deben estar íntegramente en español.

### 2.1 Carga de Datos
- **Entrada:** Fecha, Distrito, Zona, Presión (m.c.a.), Continuidad (horas).
- **Validación:** No negativos, Continuidad ≤ 24h, Presión ≤ 100 m.c.a.
- **Modo:** Grilla de carga masiva para los 21 puntos de control.

### 2.2 Cálculos y Estadísticas
- **Promedios:** Por distrito (promedio de 3 zonas), por zona (promedio de 7 distritos) y global.
- **Análisis Extremo:** Identificación de valores máximos y mínimos por periodo.
- **Alertas:** 
    - Presión < 10 m.c.a. (Rojo/Crítico).
    - Continuidad < 8 horas (Rojo/Crítico).
    - Continuidad < 12 horas (Amarillo/Alerta).

## 3. Arquitectura de Datos
Se añadirán nuevas tablas al sistema SQLite existente para mantener la independencia del módulo de activos.

### 3.1 Esquema SQL (Extension)
```sql
-- Catálogo de distritos (Fijos)
-- ['Chincha Alta', 'Grocio Prado', 'Alto Larán', 'Sunampe', 'Tambo de Mora', 'Chincha Baja', 'Pueblo Nuevo']

-- Tabla de lecturas diarias
CREATE TABLE IF NOT EXISTS water_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  distrito TEXT NOT NULL,
  zona TEXT NOT NULL, -- 'Alta', 'Media', 'Baja'
  presion REAL NOT NULL,
  continuidad REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(fecha, distrito, zona)
);

-- Tabla de registro de alertas
CREATE TABLE IF NOT EXISTS water_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  reading_id INTEGER,
  tipo_alerta TEXT, -- 'Presión Baja', 'Continuidad Baja'
  valor REAL,
  umbral REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (reading_id) REFERENCES water_readings(id)
);
```

## 4. Diseño de Interfaz (UI/UX)
La estética seguirá la línea "Dark Mode" premium de EPS SEMAPACH, con acentos en azul corporativo y colores semafóricos para alertas.

### 4.1 Componentes Principales
- **Dashboard de Agua:** 
  - Tarjetas con KPIs (Promedio Presión, Promedio Continuidad, Conteo de Alertas).
  - Gráfico de Barras: "Presión por Distrito" con línea de referencia en 10 m.c.a.
  - Gráfico de Líneas: "Evolución de Continuidad" por distrito.
  - Matriz de Estado: Tabla con celdas de colores (Verde, Amarillo, Rojo).
- **Formulario de Registro:**
  - Selector de fecha.
  - Tabla dinámica de 21 filas.
  - Botón "Guardar Reporte Diario".

## 5. Endpoints API
- `GET /api/water/readings?fecha=...`: Obtiene lecturas.
- `POST /api/water/readings/bulk`: Carga masiva de datos diarios.
- `GET /api/water/stats?inicio=...&fin=...`: Retorna promedios, máximos y mínimos.

## 6. Pruebas y Validación
- Se verificará que el ingreso de una presión de 9.5 m.c.a. genere visualmente una alerta roja.
- Se validará que el promedio por distrito sea la suma de sus 3 zonas entre 3.
- Se asegurará que la exportación PDF incluya los nuevos gráficos.

## 7. Plan de Implementación (Fases)
1. **Fase 1 (BD):** Creación de tablas y carga de distritos iniciales.
2. **Fase 2 (Backend):** Implementación de rutas y lógica estadística.
3. **Fase 3 (Frontend):** Creación de componentes de carga y dashboard.
4. **Fase 4 (Reportes):** Integración con el motor de PDF existente.
