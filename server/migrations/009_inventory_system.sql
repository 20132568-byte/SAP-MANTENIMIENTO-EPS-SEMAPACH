CREATE SCHEMA IF NOT EXISTS inventario;

-- ============================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y PEDIDOS
-- PostgreSQL Schema v1.0
-- Basado en especificación completa
-- ============================================================

-- ============================================================
-- 1. TABLAS BASE
-- ============================================================

-- Áreas de negocio
CREATE TABLE IF NOT EXISTS inventario.areas (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10)  NOT NULL UNIQUE
);

INSERT INTO inventario.areas (name, code) VALUES
    ('Electromecánica y Flota', 'EM'),
    ('Producción',            'PROD'),
    ('Distribución y Pérdidas','DYP'),
    ('Logística',             'LOG') ON CONFLICT (name) DO NOTHING;

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS inventario.users (
    id            INTEGER PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    area_id       UUID         NOT NULL REFERENCES inventario.areas(id),
    role          VARCHAR(20)  NOT NULL CHECK (role IN (
                      'trabajador', 'jefe_area', 'almacenero', 'jefe_logistica', 'admin'
                  )),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE IF NOT EXISTS inventario.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    area_id     UUID         NOT NULL REFERENCES inventario.areas(id),
    parent_id   UUID         REFERENCES inventario.categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS inventario.suppliers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL,
    tax_id       VARCHAR(50),
    contact_name VARCHAR(100),
    phone        VARCHAR(30),
    email        VARCHAR(100),
    address      TEXT,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Productos
CREATE TABLE IF NOT EXISTS inventario.products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    sku               VARCHAR(20)  NOT NULL UNIQUE,
    barcode           VARCHAR(50)  UNIQUE,
    category_id       UUID         REFERENCES inventario.categories(id) ON DELETE SET NULL,
    default_area_id   UUID         NOT NULL REFERENCES inventario.areas(id),
    supplier_id       UUID         REFERENCES inventario.suppliers(id) ON DELETE SET NULL,
    unit              VARCHAR(20)  NOT NULL DEFAULT 'unidad'
                      CHECK (unit IN ('unidad','kg','g','l','ml','m','cm','caja','paquete','pallet')),
    days_of_coverage  INTEGER      NOT NULL DEFAULT 15,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Secuencia para SKU numérico
CREATE SEQUENCE IF NOT EXISTS inventario.sku_seq START 1000;

-- ============================================================
-- 2. STOCK
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario.stock (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID          NOT NULL REFERENCES inventario.products(id) ON DELETE RESTRICT,
    area_id     UUID          NOT NULL REFERENCES inventario.areas(id) ON DELETE RESTRICT,
    quantity    NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, area_id)
);

-- ============================================================
-- 3. CATÁLOGO DE TIPOS DE MOVIMIENTO
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario.movement_types (
    code        VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    sign        INTEGER      NOT NULL CHECK (sign IN (1, -1, 0)),
    description TEXT
);

INSERT INTO inventario.movement_types (code, name, sign, description) VALUES
    ('PURCHASE',     'Compra / Ingreso',         1,  'Ingreso por compra a proveedor'),
    ('RETURN',       'Devolución',               1,  'Producto devuelto reingresa al stock'),
    ('ADJUSTMENT_IN','Ajuste positivo',          1,  'Ajuste manual de stock (+ )'),
    ('TRANSFER_IN',  'Transferencia entrante',   1,  'Recibido de otra área'),
    ('SALE',         'Salida por pedido',        -1, 'Salida por pedido de área'),
    ('TRANSFER_OUT', 'Transferencia saliente',   -1, 'Enviado a otra área'),
    ('DAMAGE',       'Baja por deterioro',       -1, 'Producto dañado o perdido'),
    ('ADJUSTMENT_OUT','Ajuste negativo',          -1, 'Ajuste manual de stock (-)') ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. PEDIDOS (SOLICITUDES)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario.requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference           VARCHAR(50)  NOT NULL UNIQUE,
    request_type        VARCHAR(20)  NOT NULL CHECK (request_type IN (
                            'SALIDA', 'INGRESO', 'TRANSFERENCIA', 'BAJA'
                        )),
    status              VARCHAR(30)  NOT NULL DEFAULT 'CARGADO'
                        CHECK (status IN (
                            'CARGADO', 'VALIDADO', 'PREPARANDO', 'PREPARADO',
                            'ENTREGA_PENDIENTE', 'ENTREGADO', 'ANULADO',
                            'RECHAZADO', 'PENDIENTE_APROBACION', 'APROBADO',
                            'TRANSFERIDO', 'CONFIRMADO'
                        )),
    worker_id           INTEGER      NOT NULL REFERENCES inventario.users(id),
    area_id             UUID         NOT NULL REFERENCES inventario.areas(id),
    supplier_id         UUID         REFERENCES inventario.suppliers(id),
    origin_area_id      UUID         REFERENCES inventario.areas(id),
    dest_area_id        UUID         REFERENCES inventario.areas(id),
    notes               TEXT,
    rejection_reason    TEXT,
    reject_return_to    VARCHAR(30)  CHECK (reject_return_to IN (
                            'CARGADO', 'VALIDADO', 'PREPARANDO', 'PREPARADO'
                        )),
    cancellation_reason TEXT,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Items del pedido
CREATE TABLE IF NOT EXISTS inventario.request_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID          NOT NULL REFERENCES inventario.requests(id) ON DELETE CASCADE,
    product_id  UUID          NOT NULL REFERENCES inventario.products(id),
    quantity    NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost   NUMERIC(12,2)
);

-- Acciones / auditoría del flujo del pedido
CREATE TABLE IF NOT EXISTS inventario.request_actions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID         NOT NULL REFERENCES inventario.requests(id) ON DELETE CASCADE,
    action      VARCHAR(30)  NOT NULL CHECK (action IN (
                    'CARGAR', 'VALIDAR', 'RECHAZAR', 'PREPARAR',
                    'MARCAR_LISTO', 'APROBAR_ENTREGA', 'ENTREGAR',
                    'CONFIRMAR_ENTREGA', 'ANULAR', 'DEVOLVER'
                )),
    user_id     INTEGER      NOT NULL REFERENCES inventario.users(id),
    role_at_action VARCHAR(20) NOT NULL,
    reason      TEXT,
    return_to   VARCHAR(30),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. MOVIMIENTOS DE STOCK (REGISTRO CONTABLE)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario.stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID         NOT NULL REFERENCES inventario.requests(id),
    movement_type   VARCHAR(20)  NOT NULL REFERENCES inventario.movement_types(code),
    product_id      UUID         NOT NULL REFERENCES inventario.products(id),
    area_id         UUID         NOT NULL REFERENCES inventario.areas(id),
    quantity        NUMERIC(12,3) NOT NULL,
    unit_cost       NUMERIC(12,2),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. NOTIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS inventario.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     INTEGER      NOT NULL REFERENCES inventario.users(id),
    request_id  UUID         REFERENCES inventario.requests(id),
    type        VARCHAR(30)  NOT NULL CHECK (type IN (
                    'PENDIENTE_VALIDAR', 'PENDIENTE_PREPARAR',
                    'PENDIENTE_APROBAR', 'PENDIENTE_CONFIRMAR',
                    'RECHAZADO', 'ENTREGADO', 'STOCK_MINIMO',
                    'ANULADO', 'INGRESO_PENDIENTE'
                )),
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_area      ON inventario.users(area_id);
CREATE INDEX IF NOT EXISTS idx_users_role      ON inventario.users(role);
CREATE INDEX IF NOT EXISTS idx_products_area   ON inventario.products(default_area_id);
CREATE INDEX IF NOT EXISTS idx_products_sku    ON inventario.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON inventario.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON inventario.products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_product   ON inventario.stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_area      ON inventario.stock(area_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON inventario.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type   ON inventario.requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_area   ON inventario.requests(area_id);
CREATE INDEX IF NOT EXISTS idx_requests_worker ON inventario.requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_requests_ref    ON inventario.requests(reference);
CREATE INDEX IF NOT EXISTS idx_request_items_req ON inventario.request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_prod ON inventario.request_items(product_id);
CREATE INDEX IF NOT EXISTS idx_request_actions_req ON inventario.request_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_req ON inventario.stock_movements(request_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON inventario.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON inventario.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON inventario.notifications(user_id, is_read);

-- ============================================================
-- 8. FUNCIONES AUXILIARES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS inventario.request_ref_seq START 1;

CREATE OR REPLACE FUNCTION inventario.generate_request_ref(p_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR;
    seq_num INTEGER;
BEGIN
    prefix := CASE p_type
        WHEN 'SALIDA'        THEN 'SAL'
        WHEN 'INGRESO'       THEN 'ING'
        WHEN 'TRANSFERENCIA' THEN 'TRF'
        WHEN 'BAJA'          THEN 'BAJ'
        ELSE 'REQ'
    END;
    seq_num := nextval('inventario.request_ref_seq');
    RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION inventario.get_next_sku()
RETURNS VARCHAR AS $$
BEGIN
    RETURN nextval('inventario.sku_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. TRIGGER: AUDITORÍA AUTOMÁTICA (REQUEST_ACTIONS)
-- ============================================================

CREATE OR REPLACE FUNCTION inventario.log_request_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason, return_to)
    VALUES (NEW.id, 'CARGAR', NEW.worker_id,
            (SELECT role FROM inventario.users WHERE id = NEW.worker_id),
            NULL, NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_request_creation ON inventario.requests;
CREATE TRIGGER trg_log_request_creation
    AFTER INSERT ON inventario.requests
    FOR EACH ROW
    WHEN (NEW.status = 'CARGADO')
    EXECUTE FUNCTION inventario.log_request_action();

-- ============================================================
-- 10. FUNCIÓN: CONSUMO PROMEDIO DIARIO
-- ============================================================

CREATE OR REPLACE FUNCTION inventario.get_avg_daily_consumption(
    p_product_id UUID,
    p_area_id    UUID,
    p_days       INTEGER DEFAULT 30
)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(sm.quantity), 0)
    INTO v_total
    FROM inventario.stock_movements sm
    JOIN inventario.requests r ON r.id = sm.request_id
    WHERE sm.product_id = p_product_id
      AND sm.area_id = p_area_id
      AND sm.movement_type IN ('SALE', 'TRANSFER_OUT', 'DAMAGE')
      AND sm.created_at >= NOW() - (p_days || ' days')::INTERVAL;

    RETURN v_total / GREATEST(p_days, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11. VISTAS
-- ============================================================

-- Stock actual con datos del producto y alerta de mínimo
DROP VIEW IF EXISTS inventario.v_stock_current CASCADE;
CREATE VIEW inventario.v_stock_current AS
SELECT
    p.id          AS product_id,
    p.name        AS product_name,
    p.sku,
    p.unit,
    a.id          AS area_id,
    a.name        AS area_name,
    COALESCE(s.quantity, 0) AS quantity,
    p.days_of_coverage,
    ROUND(inventario.get_avg_daily_consumption(p.id, a.id, 30), 3) AS avg_consumption_daily,
    ROUND(inventario.get_avg_daily_consumption(p.id, a.id, 30) * p.days_of_coverage, 3) AS min_stock,
    CASE
        WHEN COALESCE(s.quantity, 0) <= ROUND(inventario.get_avg_daily_consumption(p.id, a.id, 30) * p.days_of_coverage, 3)
        THEN TRUE ELSE FALSE
    END AS low_stock
FROM inventario.products p
CROSS JOIN inventario.areas a
LEFT JOIN inventario.stock s ON s.product_id = p.id AND s.area_id = a.id
WHERE p.is_active = TRUE
  AND a.code != 'LOG';

-- Disponibilidad SÍ/NO entre áreas (para transferencias)
DROP VIEW IF EXISTS inventario.v_product_availability CASCADE;
CREATE VIEW inventario.v_product_availability AS
SELECT
    p.id       AS product_id,
    p.name     AS product_name,
    p.sku,
    a.id       AS area_id,
    a.name     AS area_name,
    CASE WHEN COALESCE(s.quantity, 0) > 0 THEN 'SI' ELSE 'NO' END AS disponible
FROM inventario.products p
CROSS JOIN inventario.areas a
LEFT JOIN inventario.stock s ON s.product_id = p.id AND s.area_id = a.id
WHERE p.is_active = TRUE
  AND a.code != 'LOG';

-- Pedidos con estado actual y responsable
DROP VIEW IF EXISTS inventario.v_requests CASCADE;
CREATE VIEW inventario.v_requests AS
SELECT
    r.id,
    r.reference,
    r.request_type,
    r.status,
    w.full_name               AS worker_name,
    a.name                    AS area_name,
    r.created_at,
    r.updated_at,
    r.rejection_reason,
    (SELECT full_name FROM inventario.users WHERE id = (
        SELECT user_id FROM inventario.request_actions
        WHERE request_id = r.id AND action = 'VALIDAR'
        LIMIT 1
    )) AS validated_by,
    (SELECT full_name FROM inventario.users WHERE id = (
        SELECT user_id FROM inventario.request_actions
        WHERE request_id = r.id AND action = 'PREPARAR'
        LIMIT 1
    )) AS prepared_by,
    (SELECT full_name FROM inventario.users WHERE id = (
        SELECT user_id FROM inventario.request_actions
        WHERE request_id = r.id AND action = 'APROBAR_ENTREGA'
        LIMIT 1
    )) AS approved_by,
    CASE WHEN r.delivered_at IS NOT NULL THEN 'SI' ELSE 'NO' END AS entregado
FROM inventario.requests r
JOIN inventario.users w ON w.id = r.worker_id
JOIN inventario.areas a ON a.id = r.area_id;

-- ============================================================
-- 12. FUNCIÓN PRINCIPAL: CREAR PEDIDO DE SALIDA
-- ============================================================

CREATE OR REPLACE FUNCTION inventario.create_salida_request(
    p_worker_id  UUID,
    p_area_id    UUID,
    p_items      JSONB,   -- [{"product_id":"..","quantity":10}, ...]
    p_notes      TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_ref VARCHAR(50);
    v_item JSONB;
BEGIN
    v_ref := inventario.generate_request_ref('SALIDA');

    INSERT INTO inventario.requests (reference, request_type, status, worker_id, area_id, notes)
    VALUES (v_ref, 'SALIDA', 'CARGADO', p_worker_id, p_area_id, p_notes)
    RETURNING id INTO v_request_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO inventario.request_items (request_id, product_id, quantity)
        VALUES (v_request_id, (v_item->>'product_id')::UUID, (v_item->>'quantity')::NUMERIC);
    END LOOP;

    PERFORM inventario.notify_users(p_area_id, 'PENDIENTE_VALIDAR',
        'Nuevo pedido ' || v_ref,
        'Se ha cargado un nuevo pedido pendiente de validación',
        v_request_id);

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. FUNCIONES DE APROBACIÓN DEL FLUJO
-- ============================================================

-- 13.1 Jefe de área valida
CREATE OR REPLACE FUNCTION inventario.validate_request(
    p_request_id UUID,
    p_user_id    UUID,
    p_approve    BOOLEAN,
    p_reason     TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_area_id UUID;
    v_user_area UUID;
    v_user_role VARCHAR(20);
BEGIN
    SELECT role, area_id INTO v_user_role, v_user_area FROM inventario.users WHERE id = p_user_id;
    SELECT area_id INTO v_area_id FROM inventario.requests WHERE id = p_request_id;

    IF v_user_role NOT IN ('jefe_area', 'admin') THEN
        RAISE EXCEPTION 'Solo el jefe de área puede validar pedidos';
    END IF;
    IF v_user_area != v_area_id AND v_user_role != 'admin' THEN
        RAISE EXCEPTION 'No puede validar pedidos de otra área';
    END IF;

    IF p_approve THEN
        UPDATE inventario.requests SET status = 'VALIDADO', updated_at = NOW()
        WHERE id = p_request_id;
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
        VALUES (p_request_id, 'VALIDAR', p_user_id, v_user_role);
        PERFORM inventario.notify_almaceneros('PENDIENTE_PREPARAR',
            'Pedido ' || (SELECT reference FROM inventario.requests WHERE id = p_request_id) || ' listo para preparar',
            'El pedido ha sido validado y está pendiente de preparación',
            p_request_id);
    ELSE
        UPDATE inventario.requests SET status = 'CARGADO', rejection_reason = p_reason, updated_at = NOW()
        WHERE id = p_request_id;
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason)
        VALUES (p_request_id, 'RECHAZAR', p_user_id, v_user_role, p_reason);
        PERFORM inventario.notify_worker(p_request_id, 'RECHAZADO',
            'Pedido rechazado',
            'Tu pedido fue rechazado por jefatura: ' || p_reason);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 13.2 Almacenero prepara
CREATE OR REPLACE FUNCTION inventario.prepare_request(
    p_request_id UUID,
    p_user_id    UUID,
    p_action     VARCHAR,  -- 'PREPARAR' o 'MARCAR_LISTO'
    p_reason     TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_role VARCHAR(20);
    v_status_actual VARCHAR(30);
BEGIN
    SELECT role INTO v_user_role FROM inventario.users WHERE id = p_user_id;
    IF v_user_role NOT IN ('almacenero', 'admin') THEN
        RAISE EXCEPTION 'Solo almacenero puede preparar pedidos';
    END IF;

    SELECT status INTO v_status_actual FROM inventario.requests WHERE id = p_request_id;

    IF p_action = 'PREPARAR' AND v_status_actual IN ('VALIDADO', 'PREPARANDO') THEN
        UPDATE inventario.requests SET status = 'PREPARANDO', updated_at = NOW()
        WHERE id = p_request_id;
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
        VALUES (p_request_id, 'PREPARAR', p_user_id, v_user_role);

    ELSIF p_action = 'MARCAR_LISTO' AND v_status_actual = 'PREPARANDO' THEN
        UPDATE inventario.requests SET status = 'PREPARADO', updated_at = NOW()
        WHERE id = p_request_id;
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
        VALUES (p_request_id, 'MARCAR_LISTO', p_user_id, v_user_role);
        PERFORM inventario.notify_users(NULL, 'PENDIENTE_APROBAR',
            'Pedido ' || (SELECT reference FROM inventario.requests WHERE id = p_request_id) || ' preparado',
            'El pedido está preparado y listo para aprobación de logística',
            p_request_id);

    ELSIF p_action = 'RECHAZAR' THEN
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason)
        VALUES (p_request_id, 'RECHAZAR', p_user_id, v_user_role, p_reason);
        RAISE NOTICE 'Almacenero rechazó. Jefe de logística debe decidir destino.';
        PERFORM inventario.notify_jefe_logistica('RECHAZADO',
            'Pedido rechazado por almacén',
            'Motivo: ' || p_reason,
            p_request_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 13.3 Jefe de logística aprueba entrega o decide devolución
CREATE OR REPLACE FUNCTION inventario.approve_delivery(
    p_request_id     UUID,
    p_user_id        UUID,
    p_approve        BOOLEAN,
    p_reason         TEXT DEFAULT NULL,
    p_return_to      VARCHAR(30) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_role VARCHAR(20);
BEGIN
    SELECT role INTO v_user_role FROM inventario.users WHERE id = p_user_id;
    IF v_user_role NOT IN ('jefe_logistica', 'admin') THEN
        RAISE EXCEPTION 'Solo jefe de logística puede aprobar entregas';
    END IF;

    IF p_approve THEN
        UPDATE inventario.requests SET status = 'ENTREGA_PENDIENTE', updated_at = NOW()
        WHERE id = p_request_id;
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
        VALUES (p_request_id, 'APROBAR_ENTREGA', p_user_id, v_user_role);
    ELSE
        UPDATE inventario.requests
        SET status = COALESCE(p_return_to, 'CARGADO'),
            rejection_reason = p_reason,
            reject_return_to = p_return_to,
            updated_at = NOW()
        WHERE id = p_request_id;
        INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason, return_to)
        VALUES (p_request_id, 'DEVOLVER', p_user_id, v_user_role, p_reason, p_return_to);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 13.4 Confirmar entrega final (doble visto bueno)
CREATE OR REPLACE FUNCTION inventario.confirm_delivery(
    p_request_id  UUID,
    p_user_id     UUID,
    p_user2_id    UUID   -- el segundo que confirma (debe ser el otro rol)
)
RETURNS VOID AS $$
DECLARE
    v_role1 VARCHAR(20);
    v_role2 VARCHAR(20);
    v_area_id UUID;
    v_worker_role VARCHAR(20);
    v_worker_area UUID;
BEGIN
    SELECT role, area_id INTO v_worker_role, v_worker_area FROM inventario.users WHERE id = p_user_id;
    SELECT role INTO v_role2 FROM inventario.users WHERE id = p_user2_id;

    -- Verificar que sean jefe_logistica y jefe_area
    IF NOT (
        (v_worker_role = 'jefe_logistica' AND v_role2 = 'jefe_area') OR
        (v_worker_role = 'jefe_area' AND v_role2 = 'jefe_logistica')
    ) THEN
        RAISE EXCEPTION 'La confirmación requiere un jefe de logística y un jefe de área';
    END IF;

    -- Registrar acciones
    INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
    VALUES (p_request_id, 'ENTREGAR', p_user_id, v_worker_role);
    INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
    VALUES (p_request_id, 'CONFIRMAR_ENTREGA', p_user2_id, v_role2);

    -- Actualizar estado y descontar stock
    UPDATE inventario.requests
    SET status = 'ENTREGADO', delivered_at = NOW(), updated_at = NOW()
    WHERE id = p_request_id;

    -- Descontar stock: por cada item del pedido
    INSERT INTO inventario.stock_movements (request_id, movement_type, product_id, area_id, quantity, unit_cost)
    SELECT
        p_request_id, 'SALE', ri.product_id,
        (SELECT area_id FROM inventario.requests WHERE id = p_request_id),
        ri.quantity, ri.unit_cost
    FROM inventario.request_items ri
    WHERE ri.request_id = p_request_id;

    UPDATE inventario.stock s
    SET quantity = s.quantity - ri.quantity,
        updated_at = NOW()
    FROM inventario.request_items ri
    WHERE ri.request_id = p_request_id
      AND ri.product_id = s.product_id
      AND s.area_id = (SELECT area_id FROM inventario.requests WHERE id = p_request_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 14. FUNCIONES DE NOTIFICACIÓN
-- ============================================================

CREATE OR REPLACE FUNCTION inventario.notify_users(
    p_area_id    UUID,
    p_type       VARCHAR(30),
    p_title      VARCHAR(200),
    p_message    TEXT,
    p_request_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO inventario.notifications (user_id, request_id, type, title, message)
    SELECT u.id, p_request_id, p_type, p_title, p_message
    FROM inventario.users u
    WHERE (p_area_id IS NULL OR u.area_id = p_area_id)
      AND u.active = TRUE
      AND (
          (p_type = 'PENDIENTE_VALIDAR'   AND u.role = 'jefe_area') OR
          (p_type = 'PENDIENTE_APROBAR'   AND u.role = 'jefe_logistica') OR
          (p_type = 'STOCK_MINIMO'        AND u.role IN ('jefe_area', 'jefe_logistica', 'admin'))
      );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION inventario.notify_almaceneros(
    p_type       VARCHAR(30),
    p_title      VARCHAR(200),
    p_message    TEXT,
    p_request_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO inventario.notifications (user_id, request_id, type, title, message)
    SELECT u.id, p_request_id, p_type, p_title, p_message
    FROM inventario.users u
    WHERE u.role IN ('almacenero', 'admin')
      AND u.active = TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION inventario.notify_jefe_logistica(
    p_type       VARCHAR(30),
    p_title      VARCHAR(200),
    p_message    TEXT,
    p_request_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO inventario.notifications (user_id, request_id, type, title, message)
    SELECT u.id, p_request_id, p_type, p_title, p_message
    FROM inventario.users u
    WHERE u.role IN ('jefe_logistica', 'admin')
      AND u.active = TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION inventario.notify_worker(
    p_request_id UUID,
    p_type       VARCHAR(30),
    p_title      VARCHAR(200),
    p_message    TEXT
)
RETURNS VOID AS $$
DECLARE
    v_worker_id UUID;
BEGIN
    SELECT worker_id INTO v_worker_id FROM inventario.requests WHERE id = p_request_id;
    INSERT INTO inventario.notifications (user_id, request_id, type, title, message)
    VALUES (v_worker_id, p_request_id, p_type, p_title, p_message);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 15. TRIGGER: ALERTA DE STOCK MÍNIMO
-- ============================================================

CREATE OR REPLACE FUNCTION inventario.check_min_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_min NUMERIC;
    v_avg NUMERIC;
    v_days INTEGER;
    v_area_name VARCHAR(100);
    v_product_name VARCHAR(200);
BEGIN
    SELECT days_of_coverage INTO v_days FROM inventario.products WHERE id = NEW.product_id;
    v_avg := inventario.get_avg_daily_consumption(NEW.product_id, NEW.area_id, 30);
    v_min := v_avg * v_days;

    IF NEW.quantity <= v_min AND NEW.quantity > 0 THEN
        SELECT name INTO v_product_name FROM inventario.products WHERE id = NEW.product_id;
        SELECT name INTO v_area_name FROM inventario.areas WHERE id = NEW.area_id;

        INSERT INTO inventario.notifications (user_id, request_id, type, title, message)
        SELECT u.id, NULL, 'STOCK_MINIMO',
            'Stock mínimo: ' || v_product_name,
            'El producto "' || v_product_name || '" en ' || v_area_name ||
            ' está por debajo del mínimo (actual: ' || NEW.quantity || ', mínimo: ' || ROUND(v_min, 3) || ')'
        FROM inventario.users u
        WHERE u.role IN ('jefe_area', 'jefe_logistica', 'admin')
          AND u.active = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_min_stock ON inventario.stock;
CREATE TRIGGER trg_check_min_stock
    AFTER UPDATE OF quantity ON inventario.stock
    FOR EACH ROW
    EXECUTE FUNCTION inventario.check_min_stock();

-- ============================================================
-- 16. VISTAS PARA KPI
-- ============================================================

-- Rotación de stock por producto
DROP VIEW IF EXISTS inventario.v_kpi_rotacion CASCADE;
CREATE VIEW inventario.v_kpi_rotacion AS
SELECT
    p.id,
    p.name,
    p.sku,
    a.name AS area,
    COALESCE(SUM(CASE WHEN sm.movement_type IN ('SALE','TRANSFER_OUT','DAMAGE')
                  THEN sm.quantity ELSE 0 END), 0) AS salidas_30d,
    ROUND(inventario.get_avg_daily_consumption(p.id, a.id, 30), 3) AS consumo_diario_promedio,
    COALESCE(s.quantity, 0) AS stock_actual,
    CASE WHEN COALESCE(s.quantity, 0) > 0
         THEN ROUND(COALESCE(SUM(CASE WHEN sm.movement_type IN ('SALE','TRANSFER_OUT','DAMAGE')
                               THEN sm.quantity ELSE 0 END), 0) / NULLIF(s.quantity, 0), 2)
         ELSE 0 END AS rotacion
FROM inventario.products p
CROSS JOIN inventario.areas a
LEFT JOIN inventario.stock s ON s.product_id = p.id AND s.area_id = a.id
LEFT JOIN inventario.stock_movements sm ON sm.product_id = p.id AND sm.area_id = a.id
    AND sm.created_at >= NOW() - INTERVAL '30 days'
WHERE a.code != 'LOG'
GROUP BY p.id, p.name, p.sku, a.name, a.id, s.quantity;

-- Tiempo de aprobación promedio por paso y área
DROP VIEW IF EXISTS inventario.v_kpi_tiempos_aprobacion CASCADE;
CREATE VIEW inventario.v_kpi_tiempos_aprobacion AS
SELECT
    r.area_id,
    a.name AS area_name,
    AVG(EXTRACT(EPOCH FROM (
        (SELECT created_at FROM inventario.request_actions WHERE request_id = r.id AND action = 'VALIDAR' LIMIT 1)
        - r.created_at
    )) / 3600)::NUMERIC(10,2) AS horas_validacion,
    AVG(EXTRACT(EPOCH FROM (
        (SELECT created_at FROM inventario.request_actions WHERE request_id = r.id AND action = 'APROBAR_ENTREGA' LIMIT 1)
        - (SELECT created_at FROM inventario.request_actions WHERE request_id = r.id AND action = 'MARCAR_LISTO' LIMIT 1)
    )) / 3600)::NUMERIC(10,2) AS horas_aprobacion_logistica,
    AVG(EXTRACT(EPOCH FROM (
        COALESCE(r.delivered_at, NOW())
        - (SELECT created_at FROM inventario.request_actions WHERE request_id = r.id AND action = 'APROBAR_ENTREGA' LIMIT 1)
    )) / 3600)::NUMERIC(10,2) AS horas_hasta_entrega,
    COUNT(*) AS total_pedidos
FROM inventario.requests r
JOIN inventario.areas a ON a.id = r.area_id
WHERE r.request_type = 'SALIDA'
  AND r.status IN ('ENTREGADO', 'ENTREGA_PENDIENTE')
GROUP BY r.area_id, a.name;

-- Tasa de rechazo por área y motivo
DROP VIEW IF EXISTS inventario.v_kpi_rechazos CASCADE;
CREATE VIEW inventario.v_kpi_rechazos AS
SELECT
    r.area_id,
    a.name AS area_name,
    ra.action,
    ra.reason,
    COUNT(*) AS cantidad,
    ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY r.area_id), 0), 1) AS porcentaje
FROM inventario.request_actions ra
JOIN inventario.requests r ON r.id = ra.request_id
JOIN inventario.areas a ON a.id = r.area_id
WHERE ra.action = 'RECHAZAR'
GROUP BY r.area_id, a.name, ra.action, ra.reason;

-- Top productos más solicitados
DROP VIEW IF EXISTS inventario.v_kpi_top_productos CASCADE;
CREATE VIEW inventario.v_kpi_top_productos AS
SELECT
    p.id,
    p.name,
    p.sku,
    a.name AS area,
    SUM(ri.quantity) AS total_solicitado,
    COUNT(DISTINCT ri.request_id) AS veces_pedido
FROM inventario.request_items ri
JOIN inventario.products p ON p.id = ri.product_id
JOIN inventario.requests r ON r.id = ri.request_id
JOIN inventario.areas a ON a.id = r.area_id
WHERE r.request_type = 'SALIDA'
  AND r.created_at >= NOW() - INTERVAL '90 days'
GROUP BY p.id, p.name, p.sku, a.name
ORDER BY total_solicitado DESC;

-- Pedidos por área
DROP VIEW IF EXISTS inventario.v_kpi_pedidos_por_area CASCADE;
CREATE VIEW inventario.v_kpi_pedidos_por_area AS
SELECT
    a.name AS area,
    r.request_type,
    r.status,
    COUNT(*) AS cantidad
FROM inventario.requests r
JOIN inventario.areas a ON a.id = r.area_id
GROUP BY a.name, r.request_type, r.status;

-- Valor del inventario
DROP VIEW IF EXISTS inventario.v_kpi_valor_inventario CASCADE;
CREATE VIEW inventario.v_kpi_valor_inventario AS
SELECT
    a.name AS area,
    COUNT(DISTINCT s.product_id) AS productos_distintos,
    SUM(s.quantity) AS total_unidades,
    SUM(s.quantity * COALESCE((
        SELECT unit_cost FROM inventario.stock_movements sm
        WHERE sm.product_id = s.product_id AND sm.area_id = s.area_id
          AND sm.movement_type = 'PURCHASE'
        ORDER BY sm.created_at DESC LIMIT 1
    ), 0)) AS valor_total_estimado
FROM inventario.stock s
JOIN inventario.areas a ON a.id = s.area_id
WHERE a.code != 'LOG'
GROUP BY a.name;
