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
