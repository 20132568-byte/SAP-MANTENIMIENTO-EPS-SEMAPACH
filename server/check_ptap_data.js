/**
 * Script para verificar registros PTAP en Supabase
 */

import { dbAll } from './database.ts'

async function verificar() {
    console.log('[PTAP CHECK] Verificando registros por mes...\n')
    
    // Verificar por mes
    const porMes = await dbAll(`
        SELECT 
            EXTRACT(MONTH FROM fecha) as mes,
            COUNT(*) as total_registros,
            COUNT(DISTINCT fecha) as dias_con_registros
        FROM ptap_readings 
        WHERE fecha >= '2026-01-01' AND fecha <= '2026-04-30'
        GROUP BY EXTRACT(MONTH FROM fecha)
        ORDER BY mes
    `)
    
    console.log('=== REGISTROS POR MES ===')
    porMes.forEach(r => {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr']
        console.log(`${mesas[r.mes - 1]}: ${r.total_registros} registros en ${r.dias_con_registros} días`)
    })
    
    // Verificar febrero específicamente
    const feb = await dbAll(`
        SELECT fecha, hora, caudal 
        FROM ptap_readings 
        WHERE fecha >= '2026-02-01' AND fecha <= '2026-02-10'
        ORDER BY fecha, hora
        LIMIT 10
    `)
    
    console.log('\n=== FEBRERO (primeros 10 días) ===')
    feb.forEach(r => {
        console.log(`${r.fecha} ${r.hora}: ${r.caudal} L/S`)
    })
    
    // Total general
    const total = await dbAll(`
        SELECT COUNT(*) as total 
        FROM ptap_readings 
        WHERE fecha >= '2026-01-01' AND fecha <= '2026-04-30'
    `)
    
    console.log(`\n=== TOTAL GENERAL: ${total[0].total} registros ===`)
}

verificar().catch(console.error)
