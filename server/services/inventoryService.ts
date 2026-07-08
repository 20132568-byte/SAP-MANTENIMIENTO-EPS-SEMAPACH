import { getPgPool } from '../database.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'semapach_jwt_secret_2026_opaptar_production'

export const inventoryService = {
  // === AUTENTICACIÓN ===
  login: async (username: string, password_plain: string) => {
    const pool = getPgPool()
    const res = await pool.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.role, u.active, a.id as area_id, a.name as area_name, a.code as area_code
       FROM inventario.users u
       JOIN inventario.areas a ON a.id = u.area_id
       WHERE u.username = $1 AND u.active = true`,
      [username]
    )
    if (res.rows.length === 0) throw new Error('Usuario no encontrado o inactivo')
    const user = res.rows[0]

    const validPassword = await bcrypt.compare(password_plain, user.password_hash)
    if (!validPassword) throw new Error('Contraseña incorrecta')

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, area_id: user.area_id, area_code: user.area_code },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        area: {
          id: user.area_id,
          name: user.area_name,
          code: user.area_code
        }
      }
    }
  },

  getCurrentUser: async (userId: string) => {
    const pool = getPgPool()
    const res = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, a.id as area_id, COALESCE(a.name, 'Admin Global') as area_name, COALESCE(a.code, 'ADM') as area_code
       FROM inventario.users u
       LEFT JOIN inventario.areas a ON a.id = u.area_id
       WHERE u.id = $1 AND u.active = true`,
      [userId]
    )
    return res.rows[0]
  },

  // === ÁREAS Y USUARIOS ===
  getAreas: async () => {
    const pool = getPgPool()
    const res = await pool.query('SELECT id, name, code FROM inventario.areas ORDER BY name')
    return res.rows
  },

  // === PROVEEDORES ===
  getSuppliers: async () => {
    const pool = getPgPool()
    const res = await pool.query('SELECT * FROM inventario.suppliers WHERE active = true ORDER BY name')
    return res.rows
  },

  createSupplier: async (data: { name: string; tax_id?: string; contact_name?: string; phone?: string; email?: string; address?: string }) => {
    const pool = getPgPool()
    const res = await pool.query(
      `INSERT INTO inventario.suppliers (name, tax_id, contact_name, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.name, data.tax_id || null, data.contact_name || null, data.phone || null, data.email || null, data.address || null]
    )
    return res.rows[0]
  },

  // === PRODUCTOS Y STOCK ===
  getProducts: async (areaId?: string) => {
    const pool = getPgPool()
    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name,
             COALESCE(st.quantity, 0) as stock_actual,
             ROUND(inventario.get_avg_daily_consumption(p.id, $1, 30), 3) as avg_consumption,
             ROUND(inventario.get_avg_daily_consumption(p.id, $1, 30) * p.days_of_coverage, 3) as stock_minimo
      FROM inventario.products p
      LEFT JOIN inventario.categories c ON c.id = p.category_id
      LEFT JOIN inventario.suppliers s ON s.id = p.supplier_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as quantity
        FROM inventario.stock
        GROUP BY product_id
      ) st ON st.product_id = p.id
      WHERE p.is_active = true
    `
    // Como el Admin puede entrar con un area libre "000...", consolidamos todo el stock sumado.
    const area = areaId || '00000000-0000-0000-0000-000000000000'
    const res = await pool.query(query, [area])
    return res.rows
  },

  getCurrentStock: async () => {
    const pool = getPgPool()
    const res = await pool.query('SELECT * FROM inventario.v_stock_current ORDER BY product_name')
    return res.rows
  },

  getProductAvailability: async () => {
    const pool = getPgPool()
    const res = await pool.query('SELECT * FROM inventario.v_product_availability ORDER BY product_name')
    return res.rows
  },

  createProduct: async (data: { name: string; description?: string; category_id?: string; default_area_id: string; supplier_id?: string; unit: string; days_of_coverage?: number; barcode?: string }) => {
    const pool = getPgPool()
    
    // Obtener siguiente SKU usando la función del script
    const skuRes = await pool.query('SELECT inventario.get_next_sku() as sku')
    const sku = `PROD-${skuRes.rows[0].sku}`

    const res = await pool.query(
      `INSERT INTO inventario.products (name, description, sku, barcode, category_id, default_area_id, supplier_id, unit, days_of_coverage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name, data.description || null, sku, data.barcode || null,
        data.category_id || null, data.default_area_id, data.supplier_id || null,
        data.unit, data.days_of_coverage || 15
      ]
    )
    return res.rows[0]
  },

  // === SOLICITUDES Y PEDIDOS ===
  getRequests: async (filters: { type?: string; areaId?: string; status?: string; workerId?: string }) => {
    const pool = getPgPool()
    let query = `
      SELECT r.*, w.full_name as worker_name, a.name as area_name,
             o.name as origin_area_name, d.name as dest_area_name,
             s.name as supplier_name
      FROM inventario.requests r
      JOIN inventario.users w ON w.id = r.worker_id
      JOIN inventario.areas a ON a.id = r.area_id
      LEFT JOIN inventario.areas o ON o.id = r.origin_area_id
      LEFT JOIN inventario.areas d ON d.id = r.dest_area_id
      LEFT JOIN inventario.suppliers s ON s.id = r.supplier_id
      WHERE 1=1
    `
    const params: any[] = []
    let index = 1

    if (filters.type) {
      query += ` AND r.request_type = $${index++}`
      params.push(filters.type)
    }
    if (filters.areaId) {
      query += ` AND (r.area_id = $${index} OR r.origin_area_id = $${index} OR r.dest_area_id = $${index})`
      index++
      params.push(filters.areaId)
    }
    if (filters.status) {
      query += ` AND r.status = $${index++}`
      params.push(filters.status)
    }
    if (filters.workerId) {
      query += ` AND r.worker_id = $${index++}`
      params.push(filters.workerId)
    }

    query += ' ORDER BY r.created_at DESC'
    const res = await pool.query(query, params)
    return res.rows
  },

  getRequestById: async (requestId: string) => {
    const pool = getPgPool()
    const reqRes = await pool.query(
      `SELECT r.*, w.full_name as worker_name, a.name as area_name,
              o.name as origin_area_name, d.name as dest_area_name,
              s.name as supplier_name
       FROM inventario.requests r
       JOIN inventario.users w ON w.id = r.worker_id
       JOIN inventario.areas a ON a.id = r.area_id
       LEFT JOIN inventario.areas o ON o.id = r.origin_area_id
       LEFT JOIN inventario.areas d ON d.id = r.dest_area_id
       LEFT JOIN inventario.suppliers s ON s.id = r.supplier_id
       WHERE r.id = $1`,
      [requestId]
    )
    if (reqRes.rows.length === 0) return null
    const request = reqRes.rows[0]

    const itemsRes = await pool.query(
      `SELECT ri.*, p.name as product_name, p.sku as product_sku, p.unit as product_unit
       FROM inventario.request_items ri
       JOIN inventario.products p ON p.id = ri.product_id
       WHERE ri.request_id = $1`,
      [requestId]
    )
    request.items = itemsRes.rows

    const actionsRes = await pool.query(
      `SELECT ra.*, u.full_name as user_name
       FROM inventario.request_actions ra
       JOIN inventario.users u ON u.id = ra.user_id
       WHERE ra.request_id = $1
       ORDER BY ra.created_at ASC`,
      [requestId]
    )
    request.actions = actionsRes.rows

    return request
  },

  // Crear Pedido de Salida (Trabajador)
  createSalida: async (workerId: string, areaId: string, items: { product_id: string; quantity: number }[], notes?: string) => {
    const pool = getPgPool()
    const res = await pool.query(
      'SELECT inventario.create_salida_request($1, $2, $3, $4) as request_id',
      [workerId, areaId, JSON.stringify(items), notes || null]
    )
    return res.rows[0].request_id
  },

  // Validar Pedido (Jefe de Área)
  validateRequest: async (requestId: string, userId: string, approve: boolean, reason?: string) => {
    const pool = getPgPool()
    await pool.query(
      'SELECT inventario.validate_request($1, $2, $3, $4)',
      [requestId, userId, approve, reason || null]
    )
    return true
  },

  // Preparar Pedido (Almacenero)
  prepareRequest: async (requestId: string, userId: string, action: 'PREPARAR' | 'MARCAR_LISTO' | 'RECHAZAR', reason?: string) => {
    const pool = getPgPool()
    await pool.query(
      'SELECT inventario.prepare_request($1, $2, $3, $4)',
      [requestId, userId, action, reason || null]
    )
    return true
  },

  // Aprobar Entrega (Jefe de Logística)
  approveDelivery: async (requestId: string, userId: string, approve: boolean, reason?: string, returnTo?: string) => {
    const pool = getPgPool()
    await pool.query(
      'SELECT inventario.approve_delivery($1, $2, $3, $4, $5)',
      [requestId, userId, approve, reason || null, returnTo || null]
    )
    return true
  },

  // Confirmar Entrega Final (Doble confirmación Jefes)
  confirmDelivery: async (requestId: string, userId: string, user2Id: string) => {
    const pool = getPgPool()
    await pool.query(
      'SELECT inventario.confirm_delivery($1, $2, $3)',
      [requestId, userId, user2Id]
    )
    return true
  },

  // === FLUJO DE INGRESOS (ENTRADAS DE MERCADERÍA) ===
  createIngreso: async (workerId: string, supplierId: string, areaId: string, items: { product_id: string; quantity: number; unit_cost?: number }[], notes?: string) => {
    const pool = getPgPool()
    const refRes = await pool.query("SELECT inventario.generate_request_ref('INGRESO') as ref")
    const reference = refRes.rows[0].ref

    // Insertar cabecera de ingreso en estado PENDIENTE_APROBACION
    const reqRes = await pool.query(
      `INSERT INTO inventario.requests (reference, request_type, status, worker_id, area_id, supplier_id, notes)
       VALUES ($1, 'INGRESO', 'PENDIENTE_APROBACION', $2, $3, $4, $5)
       RETURNING id`,
      [reference, workerId, areaId, supplierId, notes || null]
    )
    const requestId = reqRes.rows[0].id

    // Insertar items
    for (const item of items) {
      await pool.query(
        `INSERT INTO inventario.request_items (request_id, product_id, quantity, unit_cost)
         VALUES ($1, $2, $3, $4)`,
        [requestId, item.product_id, item.quantity, item.unit_cost || null]
      )
    }

    // Notificar
    await pool.query(
      `SELECT inventario.notify_users(NULL, 'PENDIENTE_APROBAR', $1, $2, $3)`,
      ['Ingreso pendiente de aprobación', `El ingreso ${reference} requiere doble aprobación (Logística + Área)`, requestId]
    )

    return requestId;
  },

  approveIngreso: async (requestId: string, userId: string, approve: boolean, reason?: string) => {
    const pool = getPgPool()
    const userRes = await pool.query('SELECT role, full_name FROM inventario.users WHERE id = $1', [userId])
    const { role, full_name } = userRes.rows[0]

    if (role !== 'jefe_logistica' && role !== 'jefe_area' && role !== 'admin') {
      throw new Error('Solo el jefe de logística, jefe de área o admin pueden aprobar ingresos')
    }

    const reqRes = await pool.query('SELECT * FROM inventario.requests WHERE id = $1', [requestId])
    const request = reqRes.rows[0]

    if (request.status === 'APROBADO' || request.status === 'RECHAZADO') {
      throw new Error('El ingreso ya se encuentra cerrado')
    }

    if (!approve) {
      // Registrar rechazo
      await pool.query(
        `UPDATE inventario.requests SET status = 'RECHAZADO', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
        [reason || 'Sin motivo especificado', requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason)
         VALUES ($1, 'RECHAZAR', $2, $3, $4)`,
        [requestId, 'RECHAZAR', userId, role, reason]
      )
      return { status: 'RECHAZADO' }
    }

    // Registrar firma de aprobación
    await pool.query(
      `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
       VALUES ($1, 'VALIDAR', $2, $3)`,
      [requestId, 'VALIDAR', userId, role]
    )

    // Verificar si ya cuenta con la doble confirmación (Jefe Logística + Jefe Área/Admin)
    const approvalsRes = await pool.query(
      `SELECT role_at_action FROM inventario.request_actions WHERE request_id = $1 AND action = 'VALIDAR'`,
      [requestId]
    )
    const approvedRoles = approvalsRes.rows.map(r => r.role_at_action)
    const hasLogistica = approvedRoles.includes('jefe_logistica') || approvedRoles.includes('admin')
    const hasArea = approvedRoles.includes('jefe_area') || approvedRoles.includes('admin')

    if (approvedRoles.length >= 2 && hasLogistica && hasArea) {
      // Doble visto bueno completado! Procesar ingreso de stock
      await pool.query(
        `UPDATE inventario.requests SET status = 'APROBADO', updated_at = NOW() WHERE id = $1`,
        [requestId]
      )

      // Leer items y sumar a stock
      const itemsRes = await pool.query('SELECT * FROM inventario.request_items WHERE request_id = $1', [requestId])
      for (const item of itemsRes.rows) {
        // Registrar movimiento contable
        await pool.query(
          `INSERT INTO inventario.stock_movements (request_id, movement_type, product_id, area_id, quantity, unit_cost)
           VALUES ($1, 'PURCHASE', $2, $3, $4, $5)`,
          [requestId, item.product_id, request.area_id, item.quantity, item.unit_cost]
        )

        // Sumar al stock real
        await pool.query(
          `INSERT INTO inventario.stock (product_id, area_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, area_id)
           DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity, updated_at = NOW()`,
          [item.product_id, request.area_id, item.quantity]
        )
      }

      return { status: 'APROBADO' }
    }

    return { status: 'PENDIENTE_OTRA_FIRMA' }
  },

  // === FLUJO DE TRANSFERENCIAS ENTRE ÁREAS ===
  createTransferencia: async (workerId: string, originAreaId: string, destAreaId: string, items: { product_id: string; quantity: number }[], notes?: string) => {
    const pool = getPgPool()
    const refRes = await pool.query("SELECT inventario.generate_request_ref('TRANSFERENCIA') as ref")
    const reference = refRes.rows[0].ref

    // Insertar cabecera de transferencia
    const reqRes = await pool.query(
      `INSERT INTO inventario.requests (reference, request_type, status, worker_id, area_id, origin_area_id, dest_area_id, notes)
       VALUES ($1, 'TRANSFERENCIA', 'CARGADO', $2, $3, $4, $5, $6)
       RETURNING id`,
      [reference, workerId, originAreaId, originAreaId, destAreaId, notes || null]
    )
    const requestId = reqRes.rows[0].id

    // Insertar items
    for (const item of items) {
      await pool.query(
        `INSERT INTO inventario.request_items (request_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [requestId, item.product_id, item.quantity]
      )
    }

    // Notificar al Jefe del Área Origen (dueño del producto)
    await pool.query(
      `SELECT inventario.notify_users($1, 'PENDIENTE_VALIDAR', $2, $3, $4)`,
      [originAreaId, 'Nueva solicitud de transferencia', `Se solicita liberar productos para transferencia: ${reference}`, requestId]
    )

    return requestId
  },

  transitionTransferencia: async (requestId: string, userId: string, action: string, data?: { reason?: string; returnTo?: string }) => {
    const pool = getPgPool()
    const userRes = await pool.query('SELECT role, area_id FROM inventario.users WHERE id = $1', [userId])
    const { role, area_id } = userRes.rows[0]

    const reqRes = await pool.query('SELECT * FROM inventario.requests WHERE id = $1', [requestId])
    const request = reqRes.rows[0]

    if (action === 'APROBAR_LIBERACION') {
      // Jefe de Área de Origen aprueba liberar
      if (role !== 'jefe_area' && role !== 'admin') throw new Error('Solo el jefe de área de origen puede liberar')
      if (area_id !== request.origin_area_id && role !== 'admin') throw new Error('No eres jefe del área origen')

      await pool.query(
        `UPDATE inventario.requests SET status = 'VALIDADO', updated_at = NOW() WHERE id = $1`,
        [requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
         VALUES ($1, 'VALIDAR', $2, $3)`,
        [requestId, userId, role]
      )
      // Notificar al Jefe del Área Destino (receptor) para que apruebe recibir
      await pool.query(
        `SELECT inventario.notify_users($1, 'PENDIENTE_VALIDAR', $2, $3, $4)`,
        [request.dest_area_id, 'Transferencia pendiente de recepción', 'Debes validar si aceptas recibir estos productos', requestId]
      )

    } else if (action === 'APROBAR_RECEPCION') {
      // Jefe de Área Destino aprueba recibir
      if (role !== 'jefe_area' && role !== 'admin') throw new Error('Solo el jefe de área destino puede aceptar')
      if (area_id !== request.dest_area_id && role !== 'admin') throw new Error('No eres jefe del área destino')

      await pool.query(
        `UPDATE inventario.requests SET status = 'PENDIENTE_APROBACION', updated_at = NOW() WHERE id = $1`,
        [requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
         VALUES ($1, 'VALIDAR', $2, $3)`,
        [requestId, userId, role]
      )
      // Notificar al Almacenero para preparar
      await pool.query(
        `SELECT inventario.notify_almaceneros('PENDIENTE_PREPARAR', $1, $2, $3)`,
        ['Transferencia lista para preparar', 'Prepara los productos para la transferencia aprobada', requestId]
      )

    } else if (action === 'PREPARAR' || action === 'MARCAR_LISTO') {
      // Almacenero prepara
      if (role !== 'almacenero' && role !== 'admin') throw new Error('Solo el almacenero puede preparar')
      const status = action === 'PREPARAR' ? 'PREPARANDO' : 'PREPARADO'
      await pool.query(
        `UPDATE inventario.requests SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
         VALUES ($1, $2, $3, $4)`,
        [requestId, action, userId, role]
      )
      if (action === 'MARCAR_LISTO') {
        // Notificar al Jefe de Logística para autorizar entrega
        await pool.query(
          `SELECT inventario.notify_jefe_logistica('PENDIENTE_APROBAR', $1, $2, $3)`,
          ['Transferencia lista para entrega', 'La transferencia está preparada y lista para aprobación de entrega', requestId]
        )
      }

    } else if (action === 'APROBAR_ENTREGA') {
      // Jefe de Logística aprueba entrega
      if (role !== 'jefe_logistica' && role !== 'admin') throw new Error('Solo jefe de logística puede aprobar')
      await pool.query(
        `UPDATE inventario.requests SET status = 'ENTREGA_PENDIENTE', updated_at = NOW() WHERE id = $1`,
        [requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
         VALUES ($1, 'APROBAR_ENTREGA', $2, $3)`,
        [requestId, userId, role]
      )

    } else if (action === 'CONFIRMAR_TRANSFERENCIA') {
      // Confirmar entrega final (Jefe Logística + Jefe Área Destino)
      if (role !== 'jefe_logistica' && role !== 'jefe_area' && role !== 'admin') {
        throw new Error('Solo jefe de logística, jefe de área destino o admin confirman la transferencia')
      }

      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
         VALUES ($1, 'ENTREGAR', $2, $3)`,
        [requestId, userId, role]
      )

      // Verificar si contamos con la doble firma
      const signatures = await pool.query(
        `SELECT role_at_action FROM inventario.request_actions WHERE request_id = $1 AND action = 'ENTREGAR'`,
        [requestId]
      )
      const roles = signatures.rows.map(r => r.role_at_action)
      const hasLogistica = roles.includes('jefe_logistica') || roles.includes('admin')
      const hasDestino = roles.includes('jefe_area') || roles.includes('admin')

      if (roles.length >= 2 && hasLogistica && hasDestino) {
        // Ejecutar transferencia real de stock!
        await pool.query(
          `UPDATE inventario.requests SET status = 'TRANSFERIDO', delivered_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [requestId]
        )

        const items = await pool.query('SELECT * FROM inventario.request_items WHERE request_id = $1', [requestId])
        for (const item of items.rows) {
          // Descontar del origen (Área B)
          await pool.query(
            `INSERT INTO inventario.stock_movements (request_id, movement_type, product_id, area_id, quantity)
             VALUES ($1, 'TRANSFER_OUT', $2, $3, $4)`,
            [requestId, item.product_id, request.origin_area_id, item.quantity]
          )
          await pool.query(
            `UPDATE inventario.stock SET quantity = quantity - $1, updated_at = NOW()
             WHERE product_id = $2 AND area_id = $3`,
            [item.quantity, item.product_id, request.origin_area_id]
          )

          // Sumar al destino (Área A)
          await pool.query(
            `INSERT INTO inventario.stock_movements (request_id, movement_type, product_id, area_id, quantity)
             VALUES ($1, 'TRANSFER_IN', $2, $3, $4)`,
            [requestId, item.product_id, request.dest_area_id, item.quantity]
          )
          await pool.query(
            `INSERT INTO inventario.stock (product_id, area_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, area_id)
             DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity, updated_at = NOW()`,
            [item.product_id, request.dest_area_id, item.quantity]
          )
        }
        return { status: 'TRANSFERIDO' }
      }
      return { status: 'PENDIENTE_OTRA_FIRMA' }

    } else if (action === 'RECHAZAR' || action === 'ANULAR') {
      const reason = data?.reason || 'Sin motivo especificado'
      await pool.query(
        `UPDATE inventario.requests SET status = 'ANULADO', rejection_reason = $1, cancellation_reason = $1, updated_at = NOW() WHERE id = $2`,
        [reason, requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason)
         VALUES ($1, 'ANULAR', $2, $3, $4)`,
        [requestId, userId, role, reason]
      )
      return { status: 'ANULADO' }
    }

    return { status: 'TRANSICIONADO' }
  },

  // === FLUJO DE BAJAS (DETERIORO / PÉRDIDA) ===
  createBaja: async (workerId: string, areaId: string, productId: string, quantity: number, reason: string) => {
    const pool = getPgPool()
    const refRes = await pool.query("SELECT inventario.generate_request_ref('BAJA') as ref")
    const reference = refRes.rows[0].ref

    // Crear solicitud de baja
    const reqRes = await pool.query(
      `INSERT INTO inventario.requests (reference, request_type, status, worker_id, area_id, notes)
       VALUES ($1, 'BAJA', 'PENDIENTE_APROBACION', $2, $3, $4)
       RETURNING id`,
      [reference, workerId, areaId, reason]
    )
    const requestId = reqRes.rows[0].id

    // Registrar item
    await pool.query(
      `INSERT INTO inventario.request_items (request_id, product_id, quantity)
       VALUES ($1, $2, $3)`,
      [requestId, productId, quantity]
    )

    // Notificar
    await pool.query(
      `SELECT inventario.notify_users($1, 'PENDIENTE_VALIDAR', $2, $3, $4)`,
      [areaId, 'Baja de material reportada', `La baja de material ${reference} requiere aprobación`, requestId]
    )

    return requestId
  },

  approveBaja: async (requestId: string, userId: string, approve: boolean, reason?: string) => {
    const pool = getPgPool()
    const userRes = await pool.query('SELECT role, area_id FROM inventario.users WHERE id = $1', [userId])
    const { role, area_id } = userRes.rows[0]

    const reqRes = await pool.query('SELECT * FROM inventario.requests WHERE id = $1', [requestId])
    const request = reqRes.rows[0]

    if (role !== 'jefe_logistica' && role !== 'jefe_area' && role !== 'admin') {
      throw new Error('Solo el jefe de logística, jefe de área o admin pueden aprobar bajas')
    }

    if (!approve) {
      await pool.query(
        `UPDATE inventario.requests SET status = 'RECHAZADO', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
        [reason || 'Sin motivo especificado', requestId]
      )
      await pool.query(
        `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action, reason)
         VALUES ($1, 'RECHAZAR', $2, $3, $4)`,
        [requestId, 'RECHAZAR', userId, role, reason]
      )
      return { status: 'RECHAZADO' }
    }

    // Registrar firma de aprobación
    await pool.query(
      `INSERT INTO inventario.request_actions (request_id, action, user_id, role_at_action)
       VALUES ($1, 'VALIDAR', $2, $3)`,
      [requestId, 'VALIDAR', userId, role]
    )

    // Verificar doble confirmación (Jefe Logística + Jefe Área/Admin)
    const approvalsRes = await pool.query(
      `SELECT role_at_action FROM inventario.request_actions WHERE request_id = $1 AND action = 'VALIDAR'`,
      [requestId]
    )
    const roles = approvalsRes.rows.map(r => r.role_at_action)
    const hasLogistica = roles.includes('jefe_logistica') || roles.includes('admin')
    const hasArea = roles.includes('jefe_area') || roles.includes('admin')

    if (roles.length >= 2 && hasLogistica && hasArea) {
      await pool.query(
        `UPDATE inventario.requests SET status = 'APROBADO', updated_at = NOW() WHERE id = $1`,
        [requestId]
      )

      const items = await pool.query('SELECT * FROM inventario.request_items WHERE request_id = $1', [requestId])
      for (const item of items.rows) {
        // Registrar movimiento de baja contable
        await pool.query(
          `INSERT INTO inventario.stock_movements (request_id, movement_type, product_id, area_id, quantity)
           VALUES ($1, 'DAMAGE', $2, $3, $4)`,
          [requestId, item.product_id, request.area_id, item.quantity]
        )

        // Descontar del stock real de la tabla
        await pool.query(
          `UPDATE inventario.stock SET quantity = quantity - $1, updated_at = NOW()
           WHERE product_id = $2 AND area_id = $3`,
          [item.quantity, item.product_id, request.area_id]
        )
      }
      return { status: 'APROBADO' }
    }

    return { status: 'PENDIENTE_OTRA_FIRMA' }
  },

  // === NOTIFICACIONES ===
  getNotifications: async (userId: string) => {
    const pool = getPgPool()
    const res = await pool.query(
      `SELECT * FROM inventario.notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    )
    return res.rows
  },

  markNotificationRead: async (notificationId: string) => {
    const pool = getPgPool()
    await pool.query(
      'UPDATE inventario.notifications SET is_read = true WHERE id = $1',
      [notificationId]
    )
    return true
  },

  // === KPIS Y REPORTES ===
  getKpis: async () => {
    const pool = getPgPool()

    const rotacion = await pool.query('SELECT * FROM inventario.v_kpi_rotacion')
    const tiempos = await pool.query('SELECT * FROM inventario.v_kpi_tiempos_aprobacion')
    const rechazos = await pool.query('SELECT * FROM inventario.v_kpi_rechazos')
    const topProd = await pool.query('SELECT * FROM inventario.v_kpi_top_productos LIMIT 10')
    const pedidosArea = await pool.query('SELECT * FROM inventario.v_kpi_pedidos_por_area')
    const valorInv = await pool.query('SELECT * FROM inventario.v_kpi_valor_inventario')

    return {
      rotacion: rotacion.rows,
      tiempos_aprobacion: tiempos.rows,
      rechazos: rechazos.rows,
      top_productos: topProd.rows,
      pedidos_por_area: pedidosArea.rows,
      valor_inventario: valorInv.rows
    }
  }
}
