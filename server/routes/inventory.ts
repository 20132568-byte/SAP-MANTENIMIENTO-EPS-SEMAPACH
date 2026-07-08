import { Router } from 'express'
import { inventoryService } from '../services/inventoryService.js'
import { authenticateToken } from './auth.js'

export const inventoryRouter = Router()

// === AUTENTICACIÓN ===
inventoryRouter.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const data = await inventoryService.login(username, password)
    res.json(data)
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
})

inventoryRouter.get('/auth/me', authenticateToken, async (req: any, res) => {
  try {
    let user = await inventoryService.getCurrentUser(req.user.id)
    
    // Si el usuario no está en la base de datos del inventario, lo registramos automáticamente para dar libre acceso a todos
    if (!user) {
      const { getPgPool } = await import('../database.js')
      const pool = getPgPool()
      
      const areaRes = await pool.query("SELECT id FROM inventario.areas LIMIT 1")
      const fallbackAreaId = areaRes.rows[0].id
      
      const roleToSet = (req.user.role === 'admin' || req.user.username === 'DanielAdmin') ? 'admin' : 'trabajador'
      
      try {
        await pool.query(`
          INSERT INTO inventario.users (id, username, email, password_hash, full_name, role, area_id, active)
          VALUES ($1, $2, $3, 'N/A', $4, $5, $6, true)
          ON CONFLICT (id) DO UPDATE SET role = $5
        `, [req.user.id, req.user.username, req.user.email || `${req.user.username}@semapach.com`, req.user.username, roleToSet, fallbackAreaId])
      } catch (insertErr) {
        console.error('[INVENTORY AUTH] Insert Error:', insertErr)
      }
      
      user = await inventoryService.getCurrentUser(req.user.id)
    } else if ((req.user.role === 'admin' || req.user.username === 'DanielAdmin') && user.role !== 'admin') {
      // Forzamos el rol de admin si en el sistema global es admin o es DanielAdmin
      const { getPgPool } = await import('../database.js')
      const pool = getPgPool()
      await pool.query(`UPDATE inventario.users SET role = 'admin' WHERE id = $1`, [req.user.id])
      user = await inventoryService.getCurrentUser(req.user.id)
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    
    // Devolvemos el usuario con la estructura que el frontend original esperaba (por si acaso el error es de parsing)
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      area_id: user.area_id,
      area_code: user.area_code,
      area: {
        id: user.area_id,
        name: user.area_name,
        code: user.area_code
      }
    })
  } catch (err: any) {
    console.error('[INVENTORY AUTH] Top level error:', err)
    res.status(500).json({ error: err.message })
  }
})

// === ÁREAS ===
inventoryRouter.get('/areas', authenticateToken, async (_req, res) => {
  try {
    const areas = await inventoryService.getAreas()
    res.json(areas)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// === PROVEEDORES ===
inventoryRouter.get('/suppliers', authenticateToken, async (_req, res) => {
  try {
    const suppliers = await inventoryService.getSuppliers()
    res.json(suppliers)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

inventoryRouter.post('/suppliers', authenticateToken, async (req, res) => {
  try {
    const supplier = await inventoryService.createSupplier(req.body)
    res.status(201).json(supplier)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// === CATALOGO Y PRODUCTOS ===
inventoryRouter.get('/products', authenticateToken, async (req: any, res) => {
  const areaId = req.query.areaId as string || req.user.area_id
  try {
    const products = await inventoryService.getProducts(areaId)
    res.json(products)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

inventoryRouter.post('/products', authenticateToken, async (req, res) => {
  try {
    const product = await inventoryService.createProduct(req.body)
    res.status(201).json(product)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

inventoryRouter.get('/stock/current', authenticateToken, async (_req, res) => {
  try {
    const stock = await inventoryService.getCurrentStock()
    res.json(stock)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

inventoryRouter.get('/stock/availability', authenticateToken, async (_req, res) => {
  try {
    const availability = await inventoryService.getProductAvailability()
    res.json(availability)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// === SOLICITUDES / PEDIDOS ===
inventoryRouter.get('/requests', authenticateToken, async (req: any, res) => {
  const { type, areaId, status, workerId } = req.query
  try {
    const requests = await inventoryService.getRequests({
      type: type as string,
      areaId: areaId as string,
      status: status as string,
      workerId: workerId as string
    })
    res.json(requests)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

inventoryRouter.get('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const request = await inventoryService.getRequestById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' })
    res.json(request)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Crear pedido de salida
inventoryRouter.post('/orders', authenticateToken, async (req: any, res) => {
  const { items, notes } = req.body
  const workerId = req.user.id
  
  try {
    const invUser = await inventoryService.getCurrentUser(workerId)
    const areaId = invUser ? invUser.area.id : req.user.area_id

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debes incluir al menos un producto en el pedido.' })
    }
    const requestId = await inventoryService.createSalida(workerId, areaId, items, notes)
    res.status(201).json({ message: 'Pedido cargado con éxito', requestId })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Transiciones y Aprobaciones del flujo de Pedidos
inventoryRouter.post('/requests/:id/action', authenticateToken, async (req: any, res) => {
  const { action, approve, reason, returnTo, user2Id } = req.body
  const requestId = req.params.id
  const userId = req.user.id

  try {
    if (action === 'VALIDAR') {
      await inventoryService.validateRequest(requestId, userId, approve, reason)
      return res.json({ message: approve ? 'Pedido validado correctamente' : 'Pedido devuelto a borrador' })
    }

    if (action === 'PREPARAR' || action === 'MARCAR_LISTO' || action === 'RECHAZAR_ALMACEN') {
      const act = action === 'RECHAZAR_ALMACEN' ? 'RECHAZAR' : action
      await inventoryService.prepareRequest(requestId, userId, act, reason)
      return res.json({ message: 'Estado de preparación actualizado con éxito' })
    }

    if (action === 'APROBAR_ENTREGA') {
      await inventoryService.approveDelivery(requestId, userId, approve, reason, returnTo)
      return res.json({ message: approve ? 'Entrega aprobada con éxito' : 'Entrega rechazada' })
    }

    if (action === 'CONFIRMAR_ENTREGA') {
      if (!user2Id) return res.status(400).json({ error: 'Se requiere la segunda firma (Jefe de Área) para confirmar la entrega física' })
      await inventoryService.confirmDelivery(requestId, userId, user2Id)
      return res.json({ message: 'Entrega física confirmada con éxito. Se actualizó el stock.' })
    }

    res.status(400).json({ error: 'Acción no soportada para este tipo de solicitud' })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// === INGRESOS DE MERCADERÍA ===
inventoryRouter.post('/incoming', authenticateToken, async (req: any, res) => {
  const { supplierId, areaId, items, notes } = req.body
  const workerId = req.user.id
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debes incluir ítems para el ingreso.' })
    }
    const requestId = await inventoryService.createIngreso(workerId, supplierId, areaId, items, notes)
    res.status(201).json({ message: 'Ingreso registrado con éxito', requestId })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

inventoryRouter.post('/incoming/:id/approve', authenticateToken, async (req: any, res) => {
  const { approve, reason } = req.body
  const requestId = req.params.id
  const userId = req.user.id
  try {
    const result = await inventoryService.approveIngreso(requestId, userId, approve, reason)
    res.json({ message: 'Firma de aprobación registrada', result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// === TRANSFERENCIAS ENTRE ÁREAS ===
inventoryRouter.post('/transfers', authenticateToken, async (req: any, res) => {
  const { originAreaId, destAreaId, items, notes } = req.body
  const workerId = req.user.id
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar productos a transferir.' })
    }
    const requestId = await inventoryService.createTransferencia(workerId, originAreaId, destAreaId, items, notes)
    res.status(201).json({ message: 'Solicitud de transferencia registrada con éxito', requestId })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

inventoryRouter.post('/transfers/:id/action', authenticateToken, async (req: any, res) => {
  const { action, reason, returnTo, user2Id } = req.body
  const requestId = req.params.id
  const userId = req.user.id
  try {
    const result = await inventoryService.transitionTransferencia(requestId, userId, action, { reason, returnTo })
    res.json({ message: 'Acción de transferencia registrada', result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// === BAJAS (DETERIOROS / PÉRDIDAS) ===
inventoryRouter.post('/writeoffs', authenticateToken, async (req: any, res) => {
  const { productId, quantity, reason, areaId } = req.body
  const workerId = req.user.id
  try {
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Datos de producto o cantidad inválidos.' })
    }
    const requestId = await inventoryService.createBaja(workerId, areaId || req.user.area_id, productId, quantity, reason)
    res.status(201).json({ message: 'Baja reportada con éxito', requestId })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

inventoryRouter.post('/writeoffs/:id/approve', authenticateToken, async (req: any, res) => {
  const { approve, reason } = req.body
  const requestId = req.params.id
  const userId = req.user.id
  try {
    const result = await inventoryService.approveBaja(requestId, userId, approve, reason)
    res.json({ message: 'Firma de aprobación de baja registrada', result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// === KPIS Y REPORTES ===
inventoryRouter.get('/kpis', authenticateToken, async (_req, res) => {
  try {
    const kpis = await inventoryService.getKpis()
    res.json(kpis)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// === NOTIFICACIONES ===
inventoryRouter.get('/notifications', authenticateToken, async (req: any, res) => {
  try {
    const notifications = await inventoryService.getNotifications(req.user.id)
    res.json(notifications)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

inventoryRouter.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await inventoryService.markNotificationRead(req.params.id)
    res.json({ status: 'ok' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
