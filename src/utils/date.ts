/**
 * Utilidades de fecha consistentes para SAP-MANTENIMIENTO.
 * Garantiza que las fechas siempre se muestren en formato DD/MM/AAAA (Día/Mes/Año).
 */

export function formatDateDMY(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  
  // Si ya es un string tipo AAAA-MM-DD (común en respuestas de backend)
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const parts = clean.split('-')
  
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts
    return `${d}/${m}/${y}`
  }

  // Si viene en formato DD/MM/AAAA (por si acaso)
  if (clean.includes('/')) {
    const slashParts = clean.split('/')
    if (slashParts.length === 3 && slashParts[2].length === 4) {
      return clean
    }
  }

  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    
    // Usamos getUTCDate/getUTCMonth para evitar desvíos de zona horaria local en inputs del sistema
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    
    return `${day}/${month}/${year}`
  } catch {
    return String(dateStr)
  }
}
