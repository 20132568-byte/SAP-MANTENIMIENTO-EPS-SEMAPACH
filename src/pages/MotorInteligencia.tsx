import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function MotorInteligencia() {
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStations().then((s) => { setStations(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Operativa': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
      case 'Inoperativa': return 'text-[var(--color-error)] bg-[var(--color-error-bg)]'
      case 'En Mantenimiento': return 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]'
      default: return 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Motor de Inteligencia</h1>
        <p className="text-sm text-[var(--text-secondary)]">Alertas y monitoreo de estaciones</p>
      </div>

      {/* Estado de estaciones */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Estado de Estaciones ({stations.length})</h2>
        {stations.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-8">Sin estaciones registradas</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stations.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{s.codigo}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(s.estado)}`}>{s.estado}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{s.nombre}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{s.ubicacion} · {s.tipo_estacion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
