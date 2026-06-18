CREATE TABLE IF NOT EXISTS maintenance_activities (
    id SERIAL PRIMARY KEY, codigo VARCHAR(10) UNIQUE NOT NULL, nombre VARCHAR(300) NOT NULL,
    presupuesto_anual DECIMAL(12,2) DEFAULT 0, presupuesto_t1 DECIMAL(12,2) DEFAULT 0,
    presupuesto_t2 DECIMAL(12,2) DEFAULT 0, presupuesto_t3 DECIMAL(12,2) DEFAULT 0,
    presupuesto_t4 DECIMAL(12,2) DEFAULT 0, activo INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_maintenance_log (
    id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE SET NULL,
    equipment_id INTEGER REFERENCES station_equipment(id) ON DELETE SET NULL,
    activity_code VARCHAR(10), fecha DATE NOT NULL, tipo VARCHAR(50) DEFAULT 'preventivo',
    descripcion TEXT, horas_trabajadas DECIMAL(6,2), costo DECIMAL(12,2),
    tecnico VARCHAR(200), observaciones TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE SET NULL,
    equipment_id INTEGER REFERENCES station_equipment(id) ON DELETE SET NULL,
    activity_code VARCHAR(10), fecha_inicio DATE, fecha_fin DATE,
    tecnico_responsable VARCHAR(200), trabajo_realizado TEXT, materiales_usados TEXT,
    horas_empleadas DECIMAL(6,2), costo_total DECIMAL(12,2),
    conformidad VARCHAR(50), observaciones TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
