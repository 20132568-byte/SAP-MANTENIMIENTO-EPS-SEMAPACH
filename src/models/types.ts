/* ===== Tipos del modelo de datos — EPS SEMAPACH ===== */

// §9 Maestro de Activos (Unificado: Flota + Estaciones)
export interface Asset {
    id?: number
    codigo_patrimonial: string
    tipo_unidad: string
    fuente: string
    placa_principal: string
    placa_secundaria: string
    anio_fabricacion: number | null
    estado: string
    criticidad: string
    forma_control: string
    km_actual: number
    horometro_actual: number
    fecha_alta: string
    observaciones: string
    calidad_dato_inicial: 'confirmado' | 'estimado' | 'no disponible'
    horas_programadas_estandar: number
    activo: number // 1 = activo, 0 = desactivado
    created_at?: string
    updated_at?: string
    // Campos para Estaciones Hídricas (modelo unificado)
    categoria?: 'fleet' | 'stations'
    station_id?: number | null
    marca?: string
    modelo?: string
    serie?: string
    potencia_hp?: number
    potencia_kw?: number
    voltaje?: string
    tension?: string
    especificaciones_tecnicas?: string
}

// §10 Diagnóstico inicial de flota
export interface InitialDiagnosis {
    id?: number
    asset_id: number
    km_actual: number
    horometro_actual: number
    fecha_ultimo_preventivo: string
    lectura_ultimo_preventivo: number
    estado_tecnico_inicial: string
    observacion_tecnica: string
    calidad_dato: 'confirmado' | 'estimado' | 'no disponible'
    recomendacion_manual: string
    prioridad_manual: string
    fecha_diagnostico: string
    created_at?: string
}

// §11.4 Operadores
export interface Operator {
    id?: number
    nombre: string
    area: string
    observaciones: string
    activo: number
}

// §11 Catálogos editables
export interface CatalogItem {
    id?: number
    tipo: string
    valor: string
    activo: number
}

// §12.4 Registro diario de operación
export interface DailyRecord {
    id?: number
    fecha: string
    asset_id: number
    operador_id: number | null
    horas_programadas: number
    horas_reales: number
    km_inicial: number | null
    km_final: number | null
    km_recorridos: number | null
    horometro_inicial: number | null
    horometro_final: number | null
    estado_dia: string
    observaciones: string
    created_at?: string
    horas_parada?: number
    hora_inicio_parada?: string
    hora_fin_parada?: string
    hora_inicio_jornada?: string
    hora_fin_jornada?: string
    jornada_completa?: number
    // Campos virtuales para vistas
    asset_codigo?: string
    asset_tipo?: string
    operador_nombre?: string
}

// §12.5 Registro de fallas
export interface Failure {
    id?: number
    fecha: string
    asset_id: number
    operador_id: number | null
    hora_inicio: string
    hora_fin: string
    duracion_horas: number
    tipo_evento: string
    clasificacion_falla: string
    sistema_afectado: string
    severidad: string
    descripcion: string
    causa_probable: string
    accion_correctiva: string
    inmovilizo_unidad: number // 0 o 1
    es_correctiva_no_programada: number // 0 o 1 — solo estas cuentan para MTTR/MTBF
    costo_reparacion: number | null
    observaciones: string
    created_at?: string
    // Campos virtuales
    asset_codigo?: string
    asset_tipo?: string
    operador_nombre?: string
}

// §12.6 Evento de preventivo
export interface PreventiveEvent {
    id?: number
    asset_id: number
    tipo_preventivo: string
    fecha_mantenimiento: string
    lectura_al_momento: number
    intervalo: number
    unidad_control: string
    siguiente_objetivo: number
    estado: string
    costo: number | null
    observaciones: string
    created_at?: string
    // Campos virtuales
    asset_codigo?: string
    asset_tipo?: string
}

// Configuración de intervalos preventivos
export interface PreventiveConfig {
    id?: number
    asset_id: number | null     // NULL = aplica por tipo_unidad
    tipo_unidad: string | null  // NULL = aplica por asset_id
    tipo_preventivo: string
    intervalo: number
    unidad_control: string      // 'km' | 'horometro' | 'fecha'
    criterio_alerta_temprana: number  // porcentaje, ej: 90
    criterio_alerta_critica: number  // porcentaje, ej: 95
}

// §14 KPI calculados
export interface WeeklyKPI {
    id?: number
    semana_iso: string
    fecha_inicio: string
    fecha_fin: string
    // Globales
    mttr_global: number | null
    mtbf_global: number | null
    disponibilidad_global: number | null
    disponibilidad_confiabilidad: number | null
    total_fallas: number
    horas_perdidas: number
    costo_correctivo: number
    costo_preventivo: number
    costo_total: number
    flota_operativa_pct: number | null
    preventivos_ejecutados: number
    preventivos_vencidos: number
    created_at?: string
}

// §16 Alertas del motor de inteligencia
export interface Alert {
    id?: number
    asset_id: number
    tipo: 'critico' | 'advertencia' | 'aviso'
    titulo: string
    descripcion: string
    fecha: string
    reconocida: number
    asset_codigo?: string
}

// §16 Recomendación automática
export interface Recommendation {
    asset_id: number
    asset_codigo: string
    tipo: string
    mensaje: string
    prioridad: 'alta' | 'media' | 'baja'
}

// Para las vistas de KPI por activo
export interface AssetKPI {
    asset_id: number
    asset_codigo: string
    asset_placa?: string
    asset_tipo: string
    mttr: number | null
    mtbf: number | null
    disponibilidad: number | null
    total_fallas: number
    horas_perdidas: number
    costo_total: number
    salud: number | null
    riesgo: string | null
}

// § Usuario
export interface User {
    id: number
    username: string
    dni?: string
    email?: string
    role: string
    status: string
    created_at?: string
    updated_at?: string
}

export interface LoginResponse {
    token: string
    user: User
}

// § PTAP Lecturas
export interface PtapReading {
    id?: number
    fecha: string
    hora: string
    [key: string]: any
}

// § Agua / Monitoreo
export interface WaterReading {
    id?: number
    fecha: string
    distrito: string
    zona: string
    presion_kg: number | null
    caudal_lps: number | null
    horas_servicio: number | null
    created_at?: string
}

export interface WaterStats {
    porDistrito: { distrito: string; promedio_presion: number; promedio_caudal: number; total_registros: number }[]
}

// § Estaciones Hídricas
export interface WaterStation {
    id: number
    codigo: string
    nombre: string
    ubicacion: string
    tipo_estacion: string
    estado: string
    latitud: number | null
    longitud: number | null
    created_at?: string
    updated_at?: string
}

export interface StationEquipment {
    id: number
    station_id: number
    codigo: string
    tipo_equipo: string
    marca: string
    modelo: string
    serie: string
    potencia_hp: number | null
    estado: string
    created_at?: string
    updated_at?: string
}

export interface StationMaintenance {
    id: number
    station_id: number
    equipo_id: number | null
    tipo_mantenimiento: string
    descripcion: string
    fecha_programada: string
    fecha_ejecucion: string | null
    estado: string
    created_at?: string
}

// § Plan 2026
export interface Plan2026Activity {
    id: number
    estacion: string
    actividad: string
    mes: string
    estado: string
    [key: string]: any
}

export interface Plan2026Summary {
    total_actividades: number
    ejecutadas: number
    pendientes: number
    por_estacion: { estacion: string; total: number; ejecutadas: number }[]
}

// § Inteligencia Estaciones
export interface StationAlert {
    id: number
    station_id: number
    station_nombre?: string
    tipo: 'critico' | 'advertencia' | 'aviso'
    titulo: string
    descripcion: string
    fecha: string
    reconocida: number
}

export interface StationRecommendation {
    station_id: number
    station_nombre: string
    tipo: string
    mensaje: string
    prioridad: 'alta' | 'media' | 'baja'
}

export interface StationRankings {
    worst: { station_id: number; station_nombre: string; score: number }[]
    best: { station_id: number; station_nombre: string; score: number }[]
}

// § Backlog Preventivo
export interface PreventiveBacklog {
    config_id: number
    asset_id: number
    asset_codigo?: string
    asset_placa?: string
    asset_tipo?: string
    tipo_preventivo: string
    intervalo: number
    unidad_control: string
    fecha_vencimiento: string | null
    dias_vencidos: number | null
    ultima_lectura: number
    ultimo_mantenimiento: string | null
}

// § Dashboard KPI
export interface KPIGlobal {
    mttr_global: number | null
    mtbf_global: number | null
    disponibilidad_global: number | null
    total_fallas: number
    horas_perdidas: number
    costo_correctivo: number
    costo_preventivo: number
    costo_total: number
    flota_operativa_pct: number | null
    preventivos_ejecutados: number
    preventivos_vencidos: number
}

// § Diagnóstico
export interface Diagnosis extends InitialDiagnosis {}

// § Maintenance records (general)
export interface MaintenanceRecord {
    id?: number
    asset_id: number
    tipo: string
    descripcion: string
    fecha: string
    costo: number | null
    created_at?: string
}

// § Weekly snapshot
export interface WeeklySnapshot {
    id: number
    semana_iso: string
    fecha_inicio: string
    fecha_fin: string
    created_at: string
}
