CREATE TABLE IF NOT EXISTS water_stations (
    id SERIAL PRIMARY KEY, codigo VARCHAR(50) UNIQUE NOT NULL, nombre VARCHAR(200) NOT NULL,
    tipo VARCHAR(50), zona VARCHAR(100), distrito VARCHAR(100), direccion TEXT,
    coordenadas_lat DECIMAL(10,8), coordenadas_lng DECIMAL(11,8),
    estado VARCHAR(50) DEFAULT 'Operativa', observaciones TEXT,
    activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_equipment (
    id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE CASCADE,
    codigo VARCHAR(50) UNIQUE NOT NULL, tipo_equipo VARCHAR(100) NOT NULL,
    marca VARCHAR(100), modelo VARCHAR(100), serie VARCHAR(100),
    potencia_hp DECIMAL(10,2), potencia_kw DECIMAL(10,2), voltaje VARCHAR(50),
    horas_operacion DECIMAL(10,2) DEFAULT 0, ultimo_mantenimiento DATE, proximo_mantenimiento DATE,
    estado VARCHAR(50) DEFAULT 'Operativo', observaciones TEXT,
    activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
