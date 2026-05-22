import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type {
    Asset, AssetKPI, DailyRecord, Diagnosis, Failure, KPIGlobal,
    Operator, PreventiveConfig, PreventiveEvent, PreventiveBacklog,
    StationAlert, StationEquipment, StationMaintenance, StationRankings,
    StationRecommendation, User, WaterReading, WaterStation, WaterStats
} from '../models/types'

// --- Activos ---
export function useAssets(params?: Record<string, string>) {
    return useQuery({ queryKey: ['assets', params], queryFn: () => api.getAssets(params) })
}

export function useAsset(id: number) {
    return useQuery({ queryKey: ['asset', id], queryFn: () => api.getAsset(id), enabled: !!id })
}

export function useCreateAsset() {
    const qc = useQueryClient()
    return useMutation({ mutationFn: (data: Partial<Asset>) => api.createAsset(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }) })
}

export function useUpdateAsset() {
    const qc = useQueryClient()
    return useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) => api.updateAsset(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }) })
}

// --- Fallas ---
export function useFailures(params?: Record<string, string>) {
    return useQuery({ queryKey: ['failures', params], queryFn: () => api.getFailures(params) })
}

// --- Daily Records ---
export function useDailyRecords(params?: Record<string, string>) {
    return useQuery({ queryKey: ['dailyRecords', params], queryFn: () => api.getDailyRecords(params) })
}

// --- Preventivos ---
export function usePreventiveEvents(params?: Record<string, string>) {
    return useQuery({ queryKey: ['preventiveEvents', params], queryFn: () => api.getPreventiveEvents(params) })
}

export function usePreventiveBacklog(params?: Record<string, string>) {
    return useQuery({ queryKey: ['preventiveBacklog', params], queryFn: () => api.getPreventiveBacklog(params) })
}

export function usePreventiveConfig() {
    return useQuery({ queryKey: ['preventiveConfig'], queryFn: () => api.getPreventiveConfig() })
}

// --- Diagnósticos ---
export function useDiagnoses(params?: Record<string, string>) {
    return useQuery({ queryKey: ['diagnoses', params], queryFn: () => api.getDiagnoses(params) })
}

export function useDiagnosis(assetId: number) {
    return useQuery({ queryKey: ['diagnosis', assetId], queryFn: () => api.getDiagnosis(assetId), enabled: !!assetId })
}

// --- KPI ---
export function useKPIGlobal(desde: string, hasta: string, sector?: string) {
    return useQuery({ queryKey: ['kpiGlobal', desde, hasta, sector], queryFn: () => api.getKPIGlobal(desde, hasta, sector), enabled: !!desde && !!hasta })
}

export function useKPIPorActivo(desde: string, hasta: string, sector?: string) {
    return useQuery({ queryKey: ['kpiPorActivo', desde, hasta, sector], queryFn: () => api.getKPIPorActivo(desde, hasta, sector), enabled: !!desde && !!hasta })
}

// --- Operadores ---
export function useOperators() {
    return useQuery({ queryKey: ['operators'], queryFn: () => api.getOperators() })
}

// --- Catálogos ---
export function useCatalog(tipo: string) {
    return useQuery({ queryKey: ['catalog', tipo], queryFn: () => api.getCatalog(tipo), enabled: !!tipo })
}

// --- Estaciones Hídricas ---
export function useStations(params?: Record<string, string>) {
    return useQuery({ queryKey: ['stations', params], queryFn: () => api.getStations(params) })
}

export function useStationEquipment(stationId: number) {
    return useQuery({ queryKey: ['stationEquipment', stationId], queryFn: () => api.getStationEquipment(stationId), enabled: !!stationId })
}

// --- Plan 2026 ---
export function usePlan2026Activities() {
    return useQuery({ queryKey: ['plan2026Activities'], queryFn: () => api.getPlan2026Activities() })
}

export function usePlan2026Summary() {
    return useQuery({ queryKey: ['plan2026Summary'], queryFn: () => api.getPlan2026Summary() })
}

// --- Inteligencia Estaciones ---
export function useStationAlerts(params?: Record<string, string>) {
    return useQuery({ queryKey: ['stationAlerts', params], queryFn: () => api.getStationAlerts(params) })
}

export function useStationRankings(params?: Record<string, string>) {
    return useQuery({ queryKey: ['stationRankings', params], queryFn: () => api.getStationRankings(params) })
}

// --- Usuarios ---
export function useUsers() {
    return useQuery({ queryKey: ['users'], queryFn: () => api.getUsers() })
}

export function useMe() {
    return useQuery({ queryKey: ['me'], queryFn: () => api.getMe() })
}
