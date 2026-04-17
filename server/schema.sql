-- ===== Schema de base de datos — EPS SEMAPACH =====

-- Maestro de Activos (§9)
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_patrimonial TEXT UNIQUE NOT NULL,
  tipo_unidad TEXT NOT NULL,
  fuente TEXT DEFAULT '',
  placa_principal TEXT DEFAULT '',
  placa_secundaria TEXT DEFAULT '',
  anio_fabricacion INTEGER,
  estado TEXT DEFAULT 'Operativo',
  criticidad TEXT DEFAULT 'Media',
  forma_control TEXT DEFAULT 'Kilometraje',
  km_actual REAL DEFAULT 0,
  horometro_actual REAL DEFAULT 0,
  fecha_alta TEXT DEFAULT (date('now')),
  observaciones TEXT DEFAULT '',
  calidad_dato_inicial TEXT DEFAULT 'no disponible',
  horas_programadas_estandar REAL DEFAULT 8,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Operadores (§11.4)
CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  area TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Catálogos editables (§11)
CREATE TABLE IF NOT EXISTS catalogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  valor TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  UNIQUE(tipo, valor)
);

-- Diagnóstico inicial de flota (§10)
CREATE TABLE IF NOT EXISTS initial_diagnosis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL UNIQUE,
  km_actual REAL DEFAULT 0,
  horometro_actual REAL DEFAULT 0,
  fecha_ultimo_preventivo TEXT DEFAULT '',
  lectura_ultimo_preventivo REAL DEFAULT 0,
  estado_tecnico_inicial TEXT DEFAULT '',
  observacion_tecnica TEXT DEFAULT '',
  calidad_dato TEXT DEFAULT 'no disponible',
  recomendacion_manual TEXT DEFAULT '',
  prioridad_manual TEXT DEFAULT '',
  fecha_diagnostico TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Registro diario de operación (§12.4)
CREATE TABLE IF NOT EXISTS daily_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  asset_id INTEGER NOT NULL,
  operador_id INTEGER,
  horas_programadas REAL DEFAULT 8,
  horas_reales REAL DEFAULT 0,
  horas_parada REAL DEFAULT 0,
  hora_inicio_parada TEXT DEFAULT '',
  hora_fin_parada TEXT DEFAULT '',
  km_inicial REAL,
  km_final REAL,
  km_recorridos REAL,
  horometro_inicial REAL,
  horometro_final REAL,
  estado_dia TEXT DEFAULT 'Operativo',
  observaciones TEXT DEFAULT '',
  hora_inicio_jornada TEXT DEFAULT '',
  hora_fin_jornada TEXT DEFAULT '',
  jornada_completa INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (operador_id) REFERENCES operators(id)
);

-- Registro de fallas (§12.5)
CREATE TABLE IF NOT EXISTS failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  asset_id INTEGER NOT NULL,
  operador_id INTEGER,
  hora_inicio TEXT DEFAULT '',
  hora_fin TEXT DEFAULT '',
  duracion_horas REAL DEFAULT 0,
  tipo_evento TEXT DEFAULT '',
  clasificacion_falla TEXT DEFAULT '',
  sistema_afectado TEXT DEFAULT '',
  severidad TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  causa_probable TEXT DEFAULT '',
  accion_correctiva TEXT DEFAULT '',
  inmovilizo_unidad INTEGER DEFAULT 0,
  es_correctiva_no_programada INTEGER DEFAULT 1,
  costo_reparacion REAL,
  observaciones TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (operador_id) REFERENCES operators(id)
);

-- Eventos de mantenimiento preventivo (§12.6)
CREATE TABLE IF NOT EXISTS preventive_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  tipo_preventivo TEXT DEFAULT '',
  fecha_mantenimiento TEXT NOT NULL,
  lectura_al_momento REAL DEFAULT 0,
  intervalo REAL DEFAULT 0,
  unidad_control TEXT DEFAULT 'km',
  siguiente_objetivo REAL DEFAULT 0,
  estado TEXT DEFAULT 'Ejecutado',
  costo REAL,
  observaciones TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Configuración de intervalos preventivos
CREATE TABLE IF NOT EXISTS preventive_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER,
  tipo_unidad TEXT,
  tipo_preventivo TEXT NOT NULL,
  intervalo REAL NOT NULL,
  unidad_control TEXT DEFAULT 'km',
  criterio_alerta_temprana REAL DEFAULT 90,
  criterio_alerta_critica REAL DEFAULT 95,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Snapshots KPI semanales
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semana_iso TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  mttr_global REAL,
  mtbf_global REAL,
  disponibilidad_global REAL,
  disponibilidad_confiabilidad REAL,
  total_fallas INTEGER DEFAULT 0,
  horas_perdidas REAL DEFAULT 0,
  costo_correctivo REAL DEFAULT 0,
  costo_preventivo REAL DEFAULT 0,
  costo_total REAL DEFAULT 0,
  flota_operativa_pct REAL,
  preventivos_ejecutados INTEGER DEFAULT 0,
  preventivos_vencidos INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_daily_records_fecha ON daily_records(fecha);
CREATE INDEX IF NOT EXISTS idx_daily_records_asset ON daily_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_failures_fecha ON failures(fecha);
CREATE INDEX IF NOT EXISTS idx_failures_asset ON failures(asset_id);
CREATE INDEX IF NOT EXISTS idx_failures_correctiva ON failures(es_correctiva_no_programada);
CREATE INDEX IF NOT EXISTS idx_preventive_events_asset ON preventive_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_catalogs_tipo ON catalogs(tipo);

-- Extensión: Monitoreo PTAP Portachuelo
CREATE TABLE IF NOT EXISTS ptap_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  operador TEXT DEFAULT '',
  caudal REAL DEFAULT 0,
  -- Dosificación
  dosis_aluminio REAL DEFAULT 0,
  dosis_anionico REAL DEFAULT 0,
  apertura_aluminio REAL DEFAULT 0,
  apertura_anionico REAL DEFAULT 0,
  -- Agua de Ingreso
  ingreso_turbiedad REAL DEFAULT 0,
  ingreso_conductividad REAL DEFAULT 0,
  ingreso_color REAL DEFAULT 0,
  ingreso_alcalinidad REAL DEFAULT 0,
  ingreso_ph REAL DEFAULT 0,
  ingreso_aluminio REAL DEFAULT 0,
  ingreso_dureza REAL DEFAULT 0,
  ingreso_ovl REAL DEFAULT 0,
  -- Decantador
  decantador_turbiedad REAL DEFAULT 0,
  decantador_color REAL DEFAULT 0,
  decantador_ph REAL DEFAULT 0,
  -- Filtros Ingreso
  filtros_ing_turb REAL DEFAULT 0,
  filtros_ing_col REAL DEFAULT 0,
  filtros_ing_ph REAL DEFAULT 0,
  -- Filtros Salida
  filtros_sal_turb REAL DEFAULT 0,
  filtros_sal_col REAL DEFAULT 0,
  filtros_sal_ph REAL DEFAULT 0,
  -- Agua Tratada
  tratada_turbiedad REAL DEFAULT 0,
  tratada_conductividad REAL DEFAULT 0,
  tratada_color REAL DEFAULT 0,
  tratada_ph REAL DEFAULT 0,
  tratada_aluminioReal REAL DEFAULT 0,
  tratada_cloro REAL DEFAULT 0,
  tratada_dureza REAL DEFAULT 0,
  tratada_ovl REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ptap_fecha ON ptap_readings(fecha);

