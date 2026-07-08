import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { formatDateDMY } from '../utils/date'

const emptyForm = {
  fecha: new Date().toISOString().split('T')[0], asset_id: '', operador_id: '',
  hora_inicio: '', hora_fin: '', tipo_evento: 'Correctivo no programado',
  clasificacion_falla: '', sistema_afectado: '', severidad: '',
  descripcion: '', causa_probable: '', accion_correctiva: '',
  inmovilizo_unidad: false, es_correctiva_no_programada: true,
  costo_reparacion: '', observaciones: '',
}

export default function RegistroFallas() {
  const { assetType } = useAssetType()
  const [failures, setFailures] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [catalogos, setCatalogos] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchAsset, setSearchAsset] = useState('')
  const [isOpenAsset, setIsOpenAsset] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...emptyForm })

  useEffect(() => {
    api.getAssets({ categoria: assetType }).then(setAssets)
    api.getOperators().then(setOperators)
    Promise.all([
      api.getCatalog('clasificacion_falla'), api.getCatalog('sistema_afectado'),
      api.getCatalog('severidad'), api.getCatalog('causa_probable'), api.getCatalog('tipo_evento'),
    ]).then(([clf, sis, sev, cau, tip]) => {
      setCatalogos({
        clasificaciones: clf.map((c: any) => c.valor), sistemas: sis.map((c: any) => c.valor),
        severidades: sev.map((c: any) => c.valor), causas: cau.map((c: any) => c.valor),
        tipos: tip.map((c: any) => c.valor),
      })
    })
  }, [assetType])

  const loadFailures = () => {
    setLoading(true)
    api.getFailures({ categoria: assetType }).then((d) => { setFailures(d); setLoading(false) })
  }
  useEffect(() => { loadFailures() }, [assetType])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const openNew = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const openEdit = (f: any) => {
    setEditingId(f.id)
    setForm({ ...f, asset_id: f.asset_id || '', operador_id: f.operador_id || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      const payload = { ...form, inmovilizo_unidad: form.inmovilizo_unidad ? 1 : 0, es_correctiva_no_programada: form.es_correctiva_no_programada ? 1 : 0 }
      if (editingId) {
        await api.updateFailure(editingId, payload)
      } else {
        await api.createFailure(payload)
      }
      setToast(editingId ? 'Falla actualizada' : 'Falla registrada')
      setShowForm(false)
      setEditingId(null)
      loadFailures()
    } catch (e: any) {
      setToast(e.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return
    await api.deleteFailure(id)
    setFailures((prev) => prev.filter((f) => f.id !== id))
    setToast('Falla eliminada')
    setTimeout(() => setToast(null), 2500)
  }

  const filteredAssets = assets.filter(
    (a) => a.codigo_patrimonial?.toLowerCase().includes(searchAsset.toLowerCase()) || a.placa_principal?.toLowerCase().includes(searchAsset.toLowerCase())
  )

  const assetNames = Object.fromEntries(assets.map((a: any) => [a.id, a.placa_principal || a.codigo_patrimonial]))
  const operatorNames = Object.fromEntries(operators.map((o: any) => [o.id, o.nombre]))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Registro de Fallas</h1>
          <p className="text-sm text-[var(--text-secondary)]">{failures.length} registros</p>
        </div>
        <button onClick={openNew} className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
          Nueva Falla
        </button>
      </div>

      {failures.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">No hay fallas registradas</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Activo</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Clasificación</th>
                <th className="text-left p-3">Severidad</th>
                <th className="text-left p-3">Duración</th>
                <th className="text-left p-3">Costo</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {failures.map((f) => (
                <tr key={f.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="p-3 text-[var(--text-primary)]">{formatDateDMY(f.fecha)}</td>
                  <td className="p-3 text-[var(--text-primary)] font-medium">{assetNames[f.asset_id] || f.asset_codigo || '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{f.tipo_evento}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{f.clasificacion_falla}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      f.severidad === 'Crítica' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' :
                      f.severidad === 'Alta' ? 'bg-[var(--color-critical-bg)] text-[var(--color-critical)]' :
                      f.severidad === 'Media' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' :
                      'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    }`}>
                      {f.severidad}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{f.duracion_horas ? `${f.duracion_horas.toFixed(1)}h` : '—'}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{f.costo_reparacion ? `S/${Number(f.costo_reparacion).toFixed(2)}` : '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)]">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{editingId ? 'Editar Falla' : 'Nueva Falla'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Fecha</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={(e) => set('fecha', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div className="relative">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Activo</label>
                  <div className="relative">
                    <input type="text" name="searchAsset" value={searchAsset} onChange={(e) => { setSearchAsset(e.target.value); setIsOpenAsset(true) }}
                      onFocus={() => setIsOpenAsset(true)}
                      placeholder={assetNames[form.asset_id] || 'Buscar activo...'}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                    {isOpenAsset && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                        {filteredAssets.map((a) => (
                          <button key={a.id} type="button" onClick={() => { set('asset_id', a.id); setSearchAsset(''); setIsOpenAsset(false) }}
                            className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                            {a.placa_principal || a.codigo_patrimonial} — {a.tipo_unidad}
                          </button>
                        ))}
                        {filteredAssets.length === 0 && <p className="px-3 py-2 text-sm text-[var(--text-muted)]">Sin resultados</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Hora Inicio</label>
                  <input type="time" name="hora_inicio" value={form.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Hora Fin</label>
                  <input type="time" name="hora_fin" value={form.hora_fin} onChange={(e) => set('hora_fin', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo Evento</label>
                  <select value={form.tipo_evento} onChange={(e) => set('tipo_evento', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    {catalogos.tipos?.map((v: string) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Clasificación</label>
                  <select value={form.clasificacion_falla} onChange={(e) => set('clasificacion_falla', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="">Seleccionar</option>
                    {catalogos.clasificaciones?.map((v: string) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Sistema Afectado</label>
                  <select value={form.sistema_afectado} onChange={(e) => set('sistema_afectado', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="">Seleccionar</option>
                    {catalogos.sistemas?.map((v: string) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Severidad</label>
                  <select value={form.severidad} onChange={(e) => set('severidad', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="">Seleccionar</option>
                    {catalogos.severidades?.map((v: string) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Costo Reparación</label>
                  <input type="number" step="0.01" name="costo_reparacion" value={form.costo_reparacion} onChange={(e) => set('costo_reparacion', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input type="checkbox" name="inmovilizo_unidad" checked={form.inmovilizo_unidad} onChange={(e) => set('inmovilizo_unidad', e.target.checked)}
                      className="rounded border-[var(--border)]" />
                    Inmovilizó unidad
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input type="checkbox" name="es_correctiva_no_programada" checked={form.es_correctiva_no_programada} onChange={(e) => set('es_correctiva_no_programada', e.target.checked)}
                      className="rounded border-[var(--border)]" />
                    Correctiva no programada
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Causa Probable</label>
                <textarea value={form.causa_probable} onChange={(e) => set('causa_probable', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Acción Correctiva</label>
                <textarea value={form.accion_correctiva} onChange={(e) => set('accion_correctiva', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">
                {editingId ? 'Actualizar' : 'Guardar'}
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
