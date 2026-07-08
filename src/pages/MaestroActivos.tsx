import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

const emptyForm = {
  codigo_patrimonial: '', tipo_unidad: '', fuente: '', placa_principal: '', placa_secundaria: '',
  anio_fabricacion: null as number | null, estado: 'Operativo', criticidad: 'Media',
  forma_control: 'Kilometraje', km_actual: 0, horometro_actual: 0,
  observaciones: '', calidad_dato_inicial: 'no disponible', horas_programadas_estandar: 8,
  marca: '', modelo: '', serie: '', potencia_hp: 0, potencia_kw: 0, voltaje: '',
}

export default function MaestroActivos() {
  const { assetType } = useAssetType()
  const [assets, setAssets] = useState<any[]>([])
  const [catalogos, setCatalogos] = useState<any>({})
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ ...emptyForm })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const cat = (t: string) => catalogos[t] || []

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getAssets({ categoria: assetType }),
      api.getCatalog('tipo_unidad'),
      api.getCatalog('estado_unidad'),
      api.getCatalog('criticidad'),
      api.getCatalog('forma_control'),
      assetType === 'stations' ? api.getStations() : [],
    ])
      .then(([a, tu, eu, cr, fc, st]) => {
        setAssets(a)
        setCatalogos({ tipo_unidad: tu.map((c: any) => c.valor), estado_unidad: eu.map((c: any) => c.valor), criticidad: cr.map((c: any) => c.valor), forma_control: fc.map((c: any) => c.valor) })
        if (assetType === 'stations') setStations(st as any[])
      })
      .finally(() => setLoading(false))
  }, [assetType])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const openNew = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      forma_control: assetType === 'fleet' ? 'Kilometraje' : 'Horómetro',
      categoria: assetType,
    })
    setShowForm(true)
  }

  const openEdit = (asset: any) => {
    setEditing(asset)
    setForm({ ...emptyForm, ...asset })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.updateAsset(editing.id, form)
        setToast('Activo actualizado')
      } else {
        await api.createAsset(form)
        setToast('Activo creado')
      }
      setShowForm(false)
      setEditing(null)
      const a = await api.getAssets({ categoria: assetType })
      setAssets(a)
    } catch (e: any) {
      setToast(e.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este activo?')) return
    try {
      await api.deleteAsset(id)
      setAssets((prev) => prev.filter((a) => a.id !== id))
      setToast('Activo eliminado')
    } catch (e: any) {
      setToast(e.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = assets.filter(
    (a) =>
      !search ||
      a.codigo_patrimonial?.toLowerCase().includes(search.toLowerCase()) ||
      a.tipo_unidad?.toLowerCase().includes(search.toLowerCase()) ||
      a.placa_principal?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Maestro de Activos</h1>
          <p className="text-sm text-[var(--text-secondary)]">{assetType === 'fleet' ? 'Flota Vehicular' : 'Estaciones Hídricas'} — {assets.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar activo..."
            className="px-3 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 w-48"
          />
          <button onClick={openNew} className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
            Nuevo Activo
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-lg">No hay activos registrados</p>
          <p className="text-sm mt-1">Agrega el primer activo usando el botón "Nuevo Activo"</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="text-left p-3">Placa</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Criticidad</th>
                <th className="text-left p-3">Km / Hrs</th>
                <th className="text-left p-3">Control</th>
                <th className="text-left p-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="p-3 text-[var(--text-primary)] font-medium">{a.placa_principal || a.codigo_patrimonial}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{a.tipo_unidad}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{a.codigo_patrimonial}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${a.estado === 'Operativo' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'}`}>
                      {a.estado}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      a.criticidad === 'Alta' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' : a.criticidad === 'Media' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' : 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    }`}>
                      {a.criticidad}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">
                    {a.km_actual ? `${a.km_actual.toLocaleString()} km` : a.horometro_actual ? `${a.horometro_actual} hrs` : '—'}
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{a.forma_control}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Editar">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)] transition-all" title="Eliminar">
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {editing ? 'Editar Activo' : 'Nuevo Activo'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Código Patrimonial *</label>
                <input type="text" name="codigo_patrimonial" value={form.codigo_patrimonial} onChange={(e) => set('codigo_patrimonial', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo Unidad</label>
                <select value={form.tipo_unidad} onChange={(e) => set('tipo_unidad', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="">Seleccionar</option>
                  {cat('tipo_unidad').map((v: string) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Estado</label>
                <select value={form.estado} onChange={(e) => set('estado', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  {cat('estado_unidad').map((v: string) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Criticidad</label>
                <select value={form.criticidad} onChange={(e) => set('criticidad', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  {cat('criticidad').map((v: string) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Forma Control</label>
                <select value={form.forma_control} onChange={(e) => set('forma_control', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  {cat('forma_control').map((v: string) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Placa Principal</label>
                <input type="text" name="placa_principal" value={form.placa_principal} onChange={(e) => set('placa_principal', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Km / Horómetro</label>
                <input type="number" name="km_horometro" value={form.km_actual || form.horometro_actual} onChange={(e) => {
                  const v = Number(e.target.value)
                  if (form.forma_control === 'Kilometraje') set('km_actual', v)
                  else set('horometro_actual', v)
                }}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Horas Estándar</label>
                <input type="number" name="horas_programadas_estandar" value={form.horas_programadas_estandar} onChange={(e) => set('horas_programadas_estandar', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Observaciones</label>
                <textarea name="observaciones" value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
                {editing ? 'Actualizar' : 'Crear'}
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
