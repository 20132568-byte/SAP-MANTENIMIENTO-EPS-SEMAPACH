import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

export default function DiagnosticoInicial() {
  const { assetType } = useAssetType()
  const [assets, setAssets] = useState<any[]>([])
  const [diagnoses, setDiagnoses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<any>({
    km_actual: 0, horometro_actual: 0, fecha_ultimo_preventivo: '',
    lectura_ultimo_preventivo: 0, estado_tecnico_inicial: 'Buena',
    observacion_tecnica: '', calidad_dato: 'no disponible',
    recomendacion_manual: '', prioridad_manual: '',
  })

  useEffect(() => {
    api.getAssets({ categoria: assetType }).then(setAssets)
    loadDiag()
  }, [assetType])

  const loadDiag = () => {
    setLoading(true)
    api.getDiagnoses({ categoria: assetType }).then((d) => {
      setDiagnoses(d)
      setLoading(false)
    })
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const startDiag = (asset: any) => {
    setSelectedAsset(asset)
    const existing = diagnoses.find((d) => d.asset_id === asset.id)
    if (existing) {
      setForm({ ...existing })
    } else {
      setForm({
        km_actual: asset.km_actual,
        horometro_actual: asset.horometro_actual,
        fecha_ultimo_preventivo: '',
        lectura_ultimo_preventivo: 0,
        estado_tecnico_inicial: 'Buena',
        observacion_tecnica: '',
        calidad_dato: 'no disponible',
        recomendacion_manual: '',
        prioridad_manual: '',
      })
    }
  }

  const handleSave = async () => {
    if (!selectedAsset) return
    try {
      const existing = diagnoses.find((d) => d.asset_id === selectedAsset.id)
      if (existing) {
        await api.updateDiagnosis(selectedAsset.id, form)
      } else {
        await api.createDiagnosis({ ...form, asset_id: selectedAsset.id })
      }
      setToast('Diagnóstico guardado')
      setTimeout(() => setToast(null), 2500)
      setSelectedAsset(null)
      loadDiag()
    } catch (e: any) {
      setToast(e.message)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Buena': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
      case 'Regular': return 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]'
      case 'Deteriorada': return 'text-[var(--color-critical)] bg-[var(--color-critical-bg)]'
      case 'Crítica': return 'text-[var(--color-error)] bg-[var(--color-error-bg)]'
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
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Diagnóstico Inicial</h1>
        <p className="text-sm text-[var(--text-secondary)]">Evaluación técnica de activos</p>
      </div>

      {/* Assets grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.map((asset) => {
          const diag = diagnoses.find((d) => d.asset_id === asset.id)
          return (
            <button
              key={asset.id}
              onClick={() => startDiag(asset)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedAsset?.id === asset.id
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {asset.codigo_patrimonial}
                </span>
                {diag && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(diag.estado_tecnico_inicial)}`}>
                    {diag.estado_tecnico_inicial}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{asset.tipo_unidad}</p>
              {!diag && <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">Sin diagnóstico</p>}
            </button>
          )
        })}
      </div>

      {/* Diagnosis Form Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setSelectedAsset(null)}>
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{selectedAsset.codigo_patrimonial}</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedAsset.tipo_unidad}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Km Actual</label>
                  <input type="number" value={form.km_actual} onChange={(e) => set('km_actual', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Horómetro Actual</label>
                  <input type="number" value={form.horometro_actual} onChange={(e) => set('horometro_actual', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Estado Técnico</label>
                <select value={form.estado_tecnico_inicial} onChange={(e) => set('estado_tecnico_inicial', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="Buena">Buena</option>
                  <option value="Regular">Regular</option>
                  <option value="Deteriorada">Deteriorada</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Calidad del Dato</label>
                <select value={form.calidad_dato} onChange={(e) => set('calidad_dato', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="confirmado">Confirmado</option>
                  <option value="estimado">Estimado</option>
                  <option value="no disponible">No disponible</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Observación Técnica</label>
                <textarea value={form.observacion_tecnica} onChange={(e) => set('observacion_tecnica', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Recomendación</label>
                <textarea value={form.recomendacion_manual} onChange={(e) => set('recomendacion_manual', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setSelectedAsset(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
                Guardar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-sm text-[var(--text-primary)] animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}
