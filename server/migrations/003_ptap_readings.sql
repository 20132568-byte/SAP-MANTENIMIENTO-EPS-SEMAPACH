CREATE TABLE IF NOT EXISTS ptap_readings (
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
);
