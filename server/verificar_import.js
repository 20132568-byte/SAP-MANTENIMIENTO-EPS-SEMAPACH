import { dbAll } from './database.ts'

async function verificar() {
    console.log('=== VERIFICANDO DATOS PTAP ===\n')

    const result = await dbAll(`
        SELECT EXTRACT(MONTH FROM fecha) as mes, COUNT(*) as total 
        FROM ptap_readings 
        WHERE fecha >= '2026-01-01' AND fecha <= '2026-04-30' 
        GROUP BY EXTRACT(MONTH FROM fecha) 
        ORDER BY mes
    `)

    console.log('Registros por mes:')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr']
    result.forEach(r => {
        console.log(`  ${meses[r.mes - 1]}: ${r.total} registros`)
    })

    const total = result.reduce((sum, r) => sum + r.total, 0)
    console.log(`\nTOTAL: ${total} registros`)

    // Verificar febrero específicamente
    const feb = await dbAll(`
        SELECT fecha, hora, caudal 
        FROM ptap_readings 
        WHERE fecha >= '2026-02-01' AND fecha <= '2026-02-05'
        ORDER BY fecha, hora
        LIMIT 10
    `)

    console.log('\nFebrero (primeros 5 días):')
    feb.forEach(r => {
        console.log(`  ${r.fecha} ${r.hora}: ${r.caudal} L/S`)
    })
}

verificar().catch(console.error)
