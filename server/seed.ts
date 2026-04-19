import { dbAll, dbRun, dbGet } from './database.js'

/** Inserta los datos iniciales de catálogos si la tabla está vacía */
export async function seedCatalogs() {
    console.log('[SEED] Asegurando integridad de catálogos (UTF-8)...')

    // Limpiar basura de encoding previa (valores con 'Ã')
    try {
        await dbRun("DELETE FROM catalogs WHERE valor LIKE '%Ã%'")
        console.log('[SEED] Basura de encoding eliminada.')
    } catch (e: any) {
        console.error('[SEED] Error limpiando basura:', e.message)
    }

    // Definición de catálogos base con caracteres correctos
    const catalogos: Record<string, string[]> = {
        'tipo_unidad': ['Camioneta', 'Motocicleta', 'Trimoto', 'Cisterna', 'Camión', 'Hidrojet', 'Retroexcavadora'],
        'estado_unidad': ['Operativo', 'En reparación', 'Fuera de servicio', 'En mantenimiento preventivo', 'Baja'],
        'criticidad': ['Crítica', 'Alta', 'Media', 'Baja'],
        'forma_control': ['Kilometraje', 'Horómetro', 'Fecha'],
        'condicion_tecnica': ['Buena', 'Regular', 'Deteriorada', 'Crítica'],
        'clasificacion_falla': ['Mecánica', 'Eléctrica', 'Hidráulica', 'Neumática', 'Estructural', 'Motor', 'Transmisión', 'Otra'],
        'sistema_afectado': ['Motor', 'Transmisión', 'Frenos', 'Suspensión', 'Sistema eléctrico', 'Sistema hidráulico', 'Carrocería', 'Dirección', 'Refrigeración', 'Escape', 'Otro'],
        'severidad': ['Crítica', 'Mayor', 'Menor', 'Observación'],
        'causa_probable': ['Desgaste normal', 'Falta de mantenimiento', 'Sobrecarga', 'Error de operación', 'Defecto de fábrica', 'Condición ambiental', 'Accidente', 'Por determinar'],
        'tipo_evento': ['Correctivo no programado', 'Correctivo programado', 'Inspección', 'Accidente', 'Otro'],
        'tipo_preventivo': ['Cambio de aceite y filtros', 'Revisión general', 'Afinamiento', 'Cambio de frenos', 'Engrase general', 'Revisión eléctrica', 'Cambio de neumáticos', 'Otro'],
        'estado_preventivo': ['Al día', 'Próximo', 'Crítico', 'Vencido', 'Sin dato confiable']
    }

    // Insertar/Actualizar cada valor para asegurar que no haya duplicados ni basura
    for (const [tipo, valores] of Object.entries(catalogos)) {
        for (const valor of valores) {
            try { 
                await dbRun('INSERT INTO catalogs (tipo, valor) VALUES (?, ?) ON CONFLICT (tipo, valor) DO UPDATE SET activo = 1', tipo, valor) 
            } catch (e: any) {
                console.error(`[SEED] Error insertando ${valor}:`, e.message)
            }
        }
    }

    // Configuraciones preventivas iniciales (§12.6)
    const configs = [
        ['Motocicleta', 'Cambio de aceite y filtros', 2500, 'km'],
        ['Trimoto', 'Cambio de aceite y filtros', 2500, 'km'],
        ['Camioneta', 'Cambio de aceite y filtros', 5000, 'km'],
        ['Camión', 'Cambio de aceite y filtros', 5000, 'km'],
        ['Cisterna', 'Cambio de aceite y filtros', 5000, 'km'],
        ['Hidrojet', 'Cambio de aceite y filtros', 5000, 'km'],
        ['Retroexcavadora', 'Cambio de aceite y filtros', 250, 'horometro'],
    ]
    for (const [tipo, prev, intervalo, unidad] of configs) {
        try {
            await dbRun('INSERT INTO preventive_config (tipo_unidad, tipo_preventivo, intervalo, unidad_control) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
                tipo, prev, intervalo, unidad)
        } catch { }
    }

    console.log('[SEED] Catálogos sincronizados.')
}

