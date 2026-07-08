const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
    constructor(public message: string, public status?: number) {
        super(message)
        this.name = 'ApiError'
    }
}

/** Cliente HTTP genérico para el backend */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = sessionStorage.getItem('token')
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        credentials: 'same-origin',
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new ApiError(err.error || `Error ${res.status}`, res.status)
    }
    return res.json()
}

export const api = {
    // === Activos ===
    getAssets: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/assets${qs}`)
    },
    getAsset: (id: number) => request<any>(`/assets/${id}`),
    createAsset: (data: any) => request<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
    updateAsset: (id: number, data: any) => request<any>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAsset: (id: number) => request<any>(`/assets/${id}`, { method: 'DELETE' }),

    // === Catálogos ===
    getCatalog: (tipo: string) => request<any[]>(`/catalogs?tipo=${tipo}`),
    getAllCatalogs: () => request<any[]>('/catalogs'),
    getCatalogTypes: () => request<string[]>('/catalogs/tipos'),
    createCatalogItem: (data: { tipo: string; valor: string }) =>
        request<any>('/catalogs', { method: 'POST', body: JSON.stringify(data) }),
    deleteCatalogItem: (id: number) => request<any>(`/catalogs/${id}`, { method: 'DELETE' }),

    // === Operadores ===
    getOperators: () => request<any[]>('/operators'),
    createOperator: (data: any) => request<any>('/operators', { method: 'POST', body: JSON.stringify(data) }),
    updateOperator: (id: number, data: any) => request<any>(`/operators/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteOperator: (id: number) => request<any>(`/operators/${id}`, { method: 'DELETE' }),

    // === Registro diario ===
    getDailyRecords: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/daily-records${qs}`)
    },
    createDailyRecord: (data: any) => request<any>('/daily-records', { method: 'POST', body: JSON.stringify(data) }),
    updateDailyRecord: (id: number, data: any) => request<any>(`/daily-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDailyRecord: (id: number) => request<any>(`/daily-records/${id}`, { method: 'DELETE' }),

    // === Fallas ===
    getFailures: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/failures${qs}`)
    },
    createFailure: (data: any) => request<any>('/failures', { method: 'POST', body: JSON.stringify(data) }),
    updateFailure: (id: number, data: any) => request<any>(`/failures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFailure: (id: number) => request<any>(`/failures/${id}`, { method: 'DELETE' }),

    // === Preventivos ===
    getPreventiveEvents: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/preventive/events${qs}`)
    },
    createPreventiveEvent: (data: any) => request<any>('/preventive/events', { method: 'POST', body: JSON.stringify(data) }),
    updatePreventiveEvent: (id: number, data: any) => request<any>(`/preventive/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreventiveEvent: (id: number) => request<any>(`/preventive/events/${id}`, { method: 'DELETE' }),
    getPreventiveConfig: () => request<any[]>('/preventive/config'),
    createPreventiveConfig: (data: any) => request<any>('/preventive/config', { method: 'POST', body: JSON.stringify(data) }),
    updatePreventiveConfig: (id: number, data: any) => request<any>(`/preventive/config/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreventiveConfig: (id: number) => request<any>(`/preventive/config/${id}`, { method: 'DELETE' }),
    getPreventiveBacklog: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/preventive/backlog${qs}`)
    },

    // === Diagnóstico inicial ===
    getDiagnoses: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/diagnosis${qs}`)
    },
    getDiagnosis: (assetId: number) => request<any | null>(`/diagnosis/${assetId}`),
    createDiagnosis: (data: any) => request<any>('/diagnosis', { method: 'POST', body: JSON.stringify(data) }),
    updateDiagnosis: (assetId: number, data: any) => request<any>(`/diagnosis/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),

    // === KPI ===
    getKPIGlobal: (desde: string, hasta: string, sector?: string, categoria?: string) => {
      let url = `/kpi/global?desde=${desde}&hasta=${hasta}`
      if (sector && sector !== 'General') url += '&sector=' + encodeURIComponent(sector)
      if (categoria) url += '&categoria=' + encodeURIComponent(categoria)
      return request<any>(url)
    },
    getKPIPorActivo: (desde: string, hasta: string, sector?: string, categoria?: string) => {
      let url = `/kpi/por-activo?desde=${desde}&hasta=${hasta}`
      if (sector && sector !== 'General') url += '&sector=' + encodeURIComponent(sector)
      if (categoria) url += '&categoria=' + encodeURIComponent(categoria)
      return request<any[]>(url)
    },

    // === Producción OPAPTAR ===
    getProduccionBD: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/produccion/bd${qs}`)
    },
    bulkCreateProduccionBD: (rows: any[]) => request<any>('/produccion/bd/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
    getProduccionSurtidor: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/produccion/surtidor${qs}`)
    },
    bulkCreateProduccionSurtidor: (rows: any[]) => request<any>('/produccion/surtidor/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
    getProduccionRSanjuan: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/produccion/rsanjuan${qs}`)
    },
    bulkCreateProduccionRSanjuan: (rows: any[]) => request<any>('/produccion/rsanjuan/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
    getProduccionDashboard: () => request<any>('/produccion/dashboard'),
    getProduccionComparativa: (meses: string) => request<any[]>(`/produccion/bd/comparativa?meses=${meses}`),
    getProduccionMetas: (anio?: number, mes?: number) => request<any[]>(`/produccion/metas${anio ? `?anio=${anio}` : ''}${mes ? `${anio ? '&' : '?'}mes=${mes}` : ''}`),
    updateProduccionMeta: (data: any) => request<any>('/produccion/metas', { method: 'PUT', body: JSON.stringify(data) }),
    getProduccionAlertas: () => request<any>('/produccion/alertas'),
    getProduccionSurtidorFrecuencia: (desde?: string, hasta?: string) => request<any[]>(`/produccion/surtidor/frecuencia?desde=${desde || ''}&hasta=${hasta || ''}`),
    getProduccionSurtidorEvolucion: (desde?: string, hasta?: string) => request<any[]>(`/produccion/surtidor/evolucion?desde=${desde || ''}&hasta=${hasta || ''}`),
    uploadProduccionExcel: (file: File, tipo: string) => {
        const formData = new FormData()
        formData.append('file', file)
        return fetch(`${API_BASE}/produccion/import?tipo=${tipo}`, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
        }).then(r => r.json())
    },

    // === Monitoreo de Agua ===
    getWaterReadings: (params: { fecha?: string; inicio?: string; fin?: string }) => {
        const qs = '?' + new URLSearchParams(params as any).toString()
        return request<any[]>(`/water/readings${qs}`)
    },
    getWaterStats: (inicio: string, fin: string) => request<any>(`/water/stats?inicio=${inicio}&fin=${fin}`),
    bulkCreateWaterReadings: (readings: any[]) => request<any>('/water/readings/bulk', { method: 'POST', body: JSON.stringify({ readings }) }),

    // === PTAP Portachuelo ===
    savePTAPReading: (data: any) => request<any>('/water/ptap', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreatePTAPReadings: (readings: any[]) => request<any>('/water/ptap/bulk', { method: 'POST', body: JSON.stringify({ readings }) }),
    getPTAPDaily: (fecha: string) => request<any[]>(`/water/ptap/daily?fecha=${fecha}`),
    getPTAPDashboard: (fecha: string) => request<any[]>(`/water/ptap/dashboard?fecha=${fecha}`),

    // === Estaciones Hídricas ===
    getStations: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/stations${qs}`)
    },
    getStation: (id: number) => request<any>(`/stations/${id}`),
    getStationEquipment: (id: number) => request<any[]>(`/stations/${id}/equipment`),
    getStationMaintenance: (id: number, params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/stations/${id}/maintenance${qs}`)
    },
    getStationMaintenanceHistory: (id: number) => request<any[]>(`/stations/${id}/maintenance-history`),
    getStationRecords: (id: number) => request<any[]>(`/stations/${id}/records`),
    createStation: (data: any) => request<any>('/stations', { method: 'POST', body: JSON.stringify(data) }),
    updateStation: (id: number, data: any) => request<any>(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStation: (id: number) => request<any>(`/stations/${id}`, { method: 'DELETE' }),
    addStationEquipment: (stationId: number, data: any) => request<any>(`/stations/${stationId}/equipment`, { method: 'POST', body: JSON.stringify(data) }),
    updateStationEquipment: (id: number, data: any) => request<any>(`/stations/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStationEquipment: (id: number) => request<any>(`/stations/equipment/${id}`, { method: 'DELETE' }),
    addStationMaintenance: (stationId: number, data: any) => request<any>(`/stations/${stationId}/maintenance`, { method: 'POST', body: JSON.stringify(data) }),
    deleteStationMaintenance: (id: number) => request<any>(`/stations/maintenance/${id}`, { method: 'DELETE' }),
    addStationRecord: (stationId: number, data: any) => request<any>(`/stations/${stationId}/records`, { method: 'POST', body: JSON.stringify(data) }),

    // === Plan Mantenimiento 2026 ===
    getPlan2026Activities: () => request<any[]>('/stations/plan-2026/activities'),
    getPlan2026Summary: () => request<any>('/stations/plan-2026/summary'),

    // === Inteligencia Estaciones ===
    getStationAlerts: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/stations/intelligence/alerts${qs}`)
    },
    getStationRecommendations: () => request<any[]>('/stations/intelligence/recommendations'),
    getStationRankings: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any>(`/stations/intelligence/station-rankings${qs}`)
    },

    // === Autenticación ===
    login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (identifier: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
    resetPassword: (token: string, newPassword: string) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

    // === Usuarios ===
    getUsers: () => request<any[]>('/auth/users'),
    getMe: () => request<any>('/auth/me'),
    approveUser: (id: number, status: 'approved' | 'rejected') =>
        request<any>(`/auth/approve/${id}`, { method: 'POST', body: JSON.stringify({ status }) }),
    updateUserRole: (id: number, role: string) =>
        request<any>(`/auth/update-role/${id}`, { method: 'POST', body: JSON.stringify({ role }) }),
    adminResetPassword: (id: number, newPassword: string) =>
        request<any>(`/auth/reset-password/${id}`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
        request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    updateEmail: (email: string) =>
        request<any>('/auth/me/email', { method: 'PATCH', body: JSON.stringify({ email }) }),

    // === IA Chat ===
    chatIA: (message: string) =>
        request<{ answer: string; sources: string[] }>('/ia/chat', { method: 'POST', body: JSON.stringify({ message }) }),
 
    // === Sistema de Inventario y Pedidos ===
    inventoryLogin: (data: any) => request<any>('/inventory/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    inventoryGetMe: () => request<any>('/inventory/auth/me'),
    inventoryGetAreas: () => request<any[]>('/inventory/areas'),
    inventoryGetSuppliers: () => request<any[]>('/inventory/suppliers'),
    inventoryCreateSupplier: (data: any) => request<any>('/inventory/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    inventoryGetProducts: (areaId?: string) => request<any[]>(`/inventory/products${areaId ? `?areaId=${areaId}` : ''}`),
    inventoryCreateProduct: (data: any) => request<any>('/inventory/products', { method: 'POST', body: JSON.stringify(data) }),
    inventoryGetStockCurrent: () => request<any[]>('/inventory/stock/current'),
    inventoryGetProductAvailability: () => request<any[]>('/inventory/stock/availability'),
    inventoryGetRequests: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/inventory/requests${qs}`)
    },
    inventoryGetRequestById: (id: string) => request<any>(`/inventory/requests/${id}`),
    inventoryCreateSalida: (data: { items: any[]; notes?: string }) => request<any>('/inventory/orders', { method: 'POST', body: JSON.stringify(data) }),
    inventoryRequestAction: (id: string, data: { action: string; approve?: boolean; reason?: string; returnTo?: string; user2Id?: string }) =>
        request<any>(`/inventory/requests/${id}/action`, { method: 'POST', body: JSON.stringify(data) }),
    inventoryCreateIngreso: (data: { supplierId: string; areaId: string; items: any[]; notes?: string }) =>
        request<any>('/inventory/incoming', { method: 'POST', body: JSON.stringify(data) }),
    inventoryApproveIngreso: (id: string, data: { approve: boolean; reason?: string }) =>
        request<any>(`/inventory/incoming/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
    inventoryCreateTransfer: (data: { originAreaId: string; destAreaId: string; items: any[]; notes?: string }) =>
        request<any>('/inventory/transfers', { method: 'POST', body: JSON.stringify(data) }),
    inventoryTransferAction: (id: string, data: { action: string; reason?: string; returnTo?: string; user2Id?: string }) =>
        request<any>(`/inventory/transfers/${id}/action`, { method: 'POST', body: JSON.stringify(data) }),
    inventoryCreateWriteoff: (data: { productId: string; quantity: number; reason: string; areaId?: string }) =>
        request<any>('/inventory/writeoffs', { method: 'POST', body: JSON.stringify(data) }),
    inventoryApproveWriteoff: (id: string, data: { approve: boolean; reason?: string }) =>
        request<any>(`/inventory/writeoffs/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
    inventoryGetKpis: () => request<any>('/inventory/kpis'),
    inventoryGetNotifications: () => request<any[]>('/inventory/notifications'),
    inventoryReadNotification: (id: string) => request<any>(`/inventory/notifications/${id}/read`, { method: 'POST' }),
}
