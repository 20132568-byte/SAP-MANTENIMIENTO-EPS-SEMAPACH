import type {
    Asset, AssetKPI, CatalogItem, DailyRecord, Diagnosis, Failure,
    KPIGlobal, LoginResponse, MaintenanceRecord, Operator, Plan2026Activity, Plan2026Summary,
    PreventiveBacklog, PreventiveConfig, PreventiveEvent, PtapReading,
    StationAlert, StationEquipment, StationMaintenance, StationRankings,
    StationRecommendation, User, WaterReading, WaterStation, WaterStats
} from '../models/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        ...options,
    })
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        const message = body.errors?.[0]?.msg || body.error || body.message || `Error ${res.status}`
        throw new ApiError(message, res.status)
    }
    return res.json()
}

function qs(params?: Record<string, string>): string {
    return params ? '?' + new URLSearchParams(params).toString() : ''
}

export const api = {
    // === Activos ===
    getAssets: (params?: Record<string, string>) => request<Asset[]>(`/assets${qs(params)}`),
    getAsset: (id: number) => request<Asset>(`/assets/${id}`),
    createAsset: (data: Partial<Asset>) => request<Asset>('/assets', { method: 'POST', body: JSON.stringify(data) }),
    updateAsset: (id: number, data: Partial<Asset>) => request<Asset>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAsset: (id: number) => request<{ message: string }>(`/assets/${id}`, { method: 'DELETE' }),

    // === Catálogos ===
    getCatalog: (tipo: string) => request<CatalogItem[]>(`/catalogs?tipo=${tipo}`),
    getAllCatalogs: () => request<CatalogItem[]>('/catalogs'),
    getCatalogTypes: () => request<string[]>('/catalogs/tipos'),
    createCatalogItem: (data: { tipo: string; valor: string }) =>
        request<CatalogItem>('/catalogs', { method: 'POST', body: JSON.stringify(data) }),
    deleteCatalogItem: (id: number) => request<{ message: string }>(`/catalogs/${id}`, { method: 'DELETE' }),

    // === Operadores ===
    getOperators: () => request<Operator[]>('/operators'),
    createOperator: (data: Partial<Operator>) => request<Operator>('/operators', { method: 'POST', body: JSON.stringify(data) }),
    updateOperator: (id: number, data: Partial<Operator>) => request<Operator>(`/operators/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteOperator: (id: number) => request<{ message: string }>(`/operators/${id}`, { method: 'DELETE' }),

    // === Registro diario ===
    getDailyRecords: (params?: Record<string, string>) => request<DailyRecord[]>(`/daily-records${qs(params)}`),
    createDailyRecord: (data: Partial<DailyRecord>) => request<DailyRecord>('/daily-records', { method: 'POST', body: JSON.stringify(data) }),
    updateDailyRecord: (id: number, data: Partial<DailyRecord>) => request<DailyRecord>(`/daily-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDailyRecord: (id: number) => request<{ message: string }>(`/daily-records/${id}`, { method: 'DELETE' }),

    // === Fallas ===
    getFailures: (params?: Record<string, string>) => request<Failure[]>(`/failures${qs(params)}`),
    createFailure: (data: Partial<Failure>) => request<Failure>('/failures', { method: 'POST', body: JSON.stringify(data) }),
    updateFailure: (id: number, data: Partial<Failure>) => request<Failure>(`/failures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFailure: (id: number) => request<{ message: string }>(`/failures/${id}`, { method: 'DELETE' }),

    // === Preventivos ===
    getPreventiveEvents: (params?: Record<string, string>) => request<PreventiveEvent[]>(`/preventive/events${qs(params)}`),
    createPreventiveEvent: (data: Partial<PreventiveEvent>) => request<PreventiveEvent>('/preventive/events', { method: 'POST', body: JSON.stringify(data) }),
    updatePreventiveEvent: (id: number, data: Partial<PreventiveEvent>) => request<PreventiveEvent>(`/preventive/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreventiveEvent: (id: number) => request<{ message: string }>(`/preventive/events/${id}`, { method: 'DELETE' }),
    getPreventiveConfig: () => request<PreventiveConfig[]>('/preventive/config'),
    createPreventiveConfig: (data: Partial<PreventiveConfig>) => request<PreventiveConfig>('/preventive/config', { method: 'POST', body: JSON.stringify(data) }),
    updatePreventiveConfig: (id: number, data: Partial<PreventiveConfig>) => request<PreventiveConfig>(`/preventive/config/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreventiveConfig: (id: number) => request<{ message: string }>(`/preventive/config/${id}`, { method: 'DELETE' }),
    getPreventiveBacklog: (params?: Record<string, string>) => request<PreventiveBacklog[]>(`/preventive/backlog${qs(params)}`),

    // === Diagnóstico inicial ===
    getDiagnoses: (params?: Record<string, string>) => request<Diagnosis[]>(`/diagnosis${qs(params)}`),
    getDiagnosis: (assetId: number) => request<Diagnosis | null>(`/diagnosis/${assetId}`),
    createDiagnosis: (data: Partial<Diagnosis>) => request<Diagnosis>('/diagnosis', { method: 'POST', body: JSON.stringify(data) }),
    updateDiagnosis: (assetId: number, data: Partial<Diagnosis>) => request<Diagnosis>(`/diagnosis/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),

    // === KPI ===
    getKPIGlobal: (desde: string, hasta: string, sector?: string) =>
        request<KPIGlobal>(`/kpi/global?desde=${desde}&hasta=${hasta}${sector && sector !== 'General' ? '&sector=' + encodeURIComponent(sector) : ''}`),
    getKPIPorActivo: (desde: string, hasta: string, sector?: string) =>
        request<AssetKPI[]>(`/kpi/por-activo?desde=${desde}&hasta=${hasta}${sector && sector !== 'General' ? '&sector=' + encodeURIComponent(sector) : ''}`),

    // === Monitoreo de Agua ===
    getWaterReadings: (params: { fecha?: string; inicio?: string; fin?: string }) => {
        const searchParams = '?' + new URLSearchParams(params as Record<string, string>).toString()
        return request<WaterReading[]>(`/water/readings${searchParams}`)
    },
    getWaterStats: (inicio: string, fin: string) => request<WaterStats>(`/water/stats?inicio=${inicio}&fin=${fin}`),
    bulkCreateWaterReadings: (readings: Partial<WaterReading>[]) =>
        request<{ success: boolean; total: number; inserted: number }>('/water/readings/bulk', { method: 'POST', body: JSON.stringify({ readings }) }),

    // === PTAP Portachuelo ===
    savePTAPReading: (data: Partial<PtapReading>) => request<PtapReading>('/water/ptap', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreatePTAPReadings: (readings: Partial<PtapReading>[]) =>
        request<{ success: boolean; total: number; inserted: number }>('/water/ptap/bulk', { method: 'POST', body: JSON.stringify({ readings }) }),
    getPTAPDaily: (fecha: string) => request<PtapReading[]>(`/water/ptap/daily?fecha=${fecha}`),
    getPTAPDashboard: (fecha: string) => request<PtapReading[]>(`/water/ptap/dashboard?fecha=${fecha}`),

    // === Estaciones Hídricas ===
    getStations: (params?: Record<string, string>) => request<WaterStation[]>(`/stations${qs(params)}`),
    getStation: (id: number) => request<WaterStation>(`/stations/${id}`),
    getStationEquipment: (id: number) => request<StationEquipment[]>(`/stations/${id}/equipment`),
    getStationMaintenance: (id: number, params?: Record<string, string>) =>
        request<StationMaintenance[]>(`/stations/${id}/maintenance${qs(params)}`),
    getStationMaintenanceHistory: (id: number) => request<StationMaintenance[]>(`/stations/${id}/maintenance-history`),
    getStationRecords: (id: number) => request<MaintenanceRecord[]>(`/stations/${id}/records`),
    createStation: (data: Partial<WaterStation>) => request<WaterStation>('/stations', { method: 'POST', body: JSON.stringify(data) }),
    updateStation: (id: number, data: Partial<WaterStation>) => request<WaterStation>(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStation: (id: number) => request<{ message: string }>(`/stations/${id}`, { method: 'DELETE' }),
    addStationEquipment: (stationId: number, data: Partial<StationEquipment>) =>
        request<StationEquipment>(`/stations/${stationId}/equipment`, { method: 'POST', body: JSON.stringify(data) }),
    updateStationEquipment: (id: number, data: Partial<StationEquipment>) =>
        request<StationEquipment>(`/stations/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStationEquipment: (id: number) => request<{ message: string }>(`/stations/equipment/${id}`, { method: 'DELETE' }),
    addStationMaintenance: (stationId: number, data: Partial<StationMaintenance>) =>
        request<StationMaintenance>(`/stations/${stationId}/maintenance`, { method: 'POST', body: JSON.stringify(data) }),
    deleteStationMaintenance: (id: number) => request<{ message: string }>(`/stations/maintenance/${id}`, { method: 'DELETE' }),
    addStationRecord: (stationId: number, data: Partial<MaintenanceRecord>) =>
        request<MaintenanceRecord>(`/stations/${stationId}/records`, { method: 'POST', body: JSON.stringify(data) }),

    // === Plan Mantenimiento 2026 ===
    getPlan2026Activities: () => request<Plan2026Activity[]>('/stations/plan-2026/activities'),
    getPlan2026Summary: () => request<Plan2026Summary>('/stations/plan-2026/summary'),

    // === Inteligencia Estaciones ===
    getStationAlerts: (params?: Record<string, string>) => request<StationAlert[]>(`/stations/intelligence/alerts${qs(params)}`),
    getStationRecommendations: () => request<StationRecommendation[]>('/stations/intelligence/recommendations'),
    getStationRankings: (params?: Record<string, string>) =>
        request<StationRankings>(`/stations/intelligence/station-rankings${qs(params)}`),

    // === Autenticación ===
    login: (data: { identifier: string; password: string }) => request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: { username: string; password: string; dni: string; email?: string }) =>
        request<{ message: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (identifier: string) =>
        request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
    resetPassword: (token: string, newPassword: string) =>
        request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

    // === Users ===
    getUsers: () => request<User[]>('/auth/users'),
    approveUser: (id: number) => request<{ message: string }>(`/auth/approve/${id}`, { method: 'POST' }),
    getMe: () => request<User>('/auth/me'),
}
