import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { formatDateDMY } from '../utils/date'

type Tab = 'eventos' | 'backlog' | 'config'

const emptyEvent = {
  asset_id: '', fecha: new Date().toISOString().split('T')[0],
  tipo_mtto: 'Preventivo', descripcion: '', estado: 'Pendiente',
  hora_inicio: '', hora_fin: '', duracion_horas: 0,
  realizado_por: '', costo_real: '', notas: '',
}

const emptyConfig = {
  asset_id: '', frecuencia_km: 0, frecuencia_horas: 0, frecuencia_dias: 0,
  odometro_base: 0, horometro_base: 0, tipo_preventivo: 'Mantenimiento Preventivo',
  actividades: '', materiales: '', personal_asignado: '',
}

export default function GestionPreventivos() {
  const { assetType } = useAssetType()
  const [tab, setTab] = useState<Tab>('eventos')
  const [assets, setAssets] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [backlog, setBacklog] = useState<any[]>([])
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchAssetE, setSearchAssetE] = useState('')
  const [isOpenAssetE, setIsOpenAssetE] = useState(false)
  const [searchAssetC, setSearchAssetC] = useState('')
  const [isOpenAssetC, setIsOpenAssetC] = useState(false)
  const [form, setForm] = useState<any>({ ...emptyEvent })
  const [configForm, setConfigForm] = useState<any>({ ...emptyConfig })
  const [toast, setToast] = useState<string | null>(null)
  const [configAssetId, setConfigAssetId] = useState<number | null>(null)

  useEffect(() => {
    api.getAssets({ categoria: assetType }).then(setAssets)
  }, [assetType])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.getPreventiveEvents({ categoria: assetType }),
      api.getPreventiveBacklog({ categoria: assetType }),
      api.getPreventiveConfig(),
    ]).then(([evt, bck, cfg]) => {
      setEvents(evt); setBacklog(bck); setConfigs(cfg); setLoading(false)
    })
  }
  useEffect(() => { loadData() }, [assetType])

  const set = (key: string, v: any) => setForm((f: any) => ({ ...f, [key]: v }))
  const setC = (key: string, v: any) => setConfigForm((f: any) => ({ ...f, [key]: v }))

  const assetNames = Object.fromEntries(assets.map((a: any) => [a.id, a.placa_principal || a.codigo_patrimonial]))
  const filteredAssetsE = assets.filter((a) =>
    (a.placa_principal || a.codigo_patrimonial)?.toLowerCase().includes(searchAssetE.toLowerCase())
  )
  const filteredAssetsC = assets.filter((a) =>
    (a.placa_principal || a.codigo_patrimonial)?.toLowerCase().includes(searchAssetC.toLowerCase())
  )

  const openNew = () => {
    setEditingId(null); setForm({ ...emptyEvent }); setShowForm(true)
  }

  const openEdit = (e: any) => {
    setEditingId(e.id); setForm({ ...e, asset_id: e.asset_id || '' }); setShowForm(true)
  }

  const handleSaveEvent = async () => {
    try {
      if (editingId) {
        await api.updatePreventiveEvent(editingId, form)
      } else {
        await api.createPreventiveEvent(form)
      }
      setToast(editingId ? 'Evento actualizado' : 'Evento creado')
      setShowForm(false); setEditingId(null)
      loadData()
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await api.deletePreventiveEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      setToast('Evento eliminado')
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDeleteConfig = async (id: number) => {
    if (!confirm('¿Eliminar esta configuración?')) return
    await api.deletePreventiveConfig(id)
    setConfigs((prev) => prev.filter((c) => c.id !== id))
    setToast('Configuración eliminada')
    setTimeout(() => setToast(null), 2500)
  }

  const openConfig = (assetId: number) => {
    const existing = configs.find((c) => c.asset_id === assetId)
    if (existing) {
      setConfigForm({ ...existing })
    } else {
      setConfigForm({ ...emptyConfig, asset_id: assetId })
    }
    setConfigAssetId(assetId)
  }

  const handleSaveConfig = async () => {
    try {
      const existing = configs.find((c) => c.asset_id === configForm.asset_id)
      if (existing) {
        await api.updatePreventiveConfig(existing.id, configForm)
      } else {
        await api.createPreventiveConfig(configForm)
      }
      setToast('Configuración guardada')
      setConfigAssetId(null)
      loadData()
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Pendiente': return 'text-[var(--color-critical)] bg-[var(--color-critical-bg)]'
      case 'En Progreso': return 'text-[var(--color-info)] bg-[var(--color-info-bg)]'
      case 'Completado': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
      default: return 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]'
    }
  }

  const getPrioridadColor = (p: string) => {
    switch (p) {
      case 'Crítica': return 'text-[var(--color-error)] bg-[var(--color-error-bg)]'
      case 'Alta': return 'text-[var(--color-critical)] bg-[var(--color-critical-bg)]'
      case 'Media': return 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]'
      case 'Baja': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
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
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Gestión de Preventivos</h1>
        <p className="text-sm text-[var(--text-secondary)]">Planificación y seguimiento de mantenimiento preventivo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
        {(['eventos', 'backlog', 'config'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {t === 'eventos' ? 'Eventos' : t === 'backlog' ? 'Backlog' : 'Configuración'}
          </button>
        ))}
      </div>

      {/* Eventos Tab */}
      {tab === 'eventos' && (
        <>
          <div className="flex justify-end">
            <button onClick={openNew} className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">
              Nuevo Evento
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-12">No hay eventos registrados</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-left p-3">Activo</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Duración</th>
                    <th className="text-left p-3">Costo</th>
                    <th className="text-left p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-3 text-[var(--text-primary)]">{formatDateDMY(ev.fecha)}</td>
                      <td className="p-3 text-[var(--text-primary)] font-medium">{assetNames[ev.asset_id] || ev.asset_codigo || '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{ev.tipo_mtto}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(ev.estado)}`}>{ev.estado}</span>
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">{ev.duracion_horas ? `${ev.duracion_horas}h` : '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{ev.costo_real ? `S/${Number(ev.costo_real).toFixed(2)}` : '—'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(ev)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"><span className="material-symbols-outlined text-sm">edit</span></button>
                          <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)]"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Backlog Tab */}
      {tab === 'backlog' && (
        <>
          {backlog.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-12">No hay tareas pendientes</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="text-left p-3">Activo</th>
                    <th className="text-left p-3">Preventivo</th>
                    <th className="text-left p-3">Control</th>
                    <th className="text-left p-3">Último</th>
                    <th className="text-left p-3">Actual</th>
                    <th className="text-left p-3">Vence</th>
                    <th className="text-left p-3">Atraso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {backlog.map((b: any) => (
                    <tr key={b.config_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="p-3 text-[var(--text-primary)] font-medium">{b.asset_placa || b.asset_codigo || '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{b.tipo_preventivo}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{b.unidad_control === 'fecha' ? 'Fecha' : b.unidad_control === 'km' ? 'Kilometraje' : b.unidad_control === 'horometro' ? 'Horómetro' : b.unidad_control}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{b.ultima_lectura > 0 ? `${b.ultima_lectura} ${b.unidad_control}` : '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{b.unidad_control === 'km' ? b.km_actual : b.horometro_actual ?? '—'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{formatDateDMY(b.fecha_vencimiento)}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold ${b.dias_vencidos > 30 ? 'text-[var(--color-error)]' : b.dias_vencidos > 7 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                          {b.dias_vencidos != null ? `${b.dias_vencidos}d` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">Configurar frecuencias de mantenimiento por activo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assets.map((asset) => {
              const cfg = configs.find((c) => c.asset_id === asset.id)
              return (
                <button key={asset.id} onClick={() => openConfig(asset.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    configAssetId === asset.id
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{asset.placa_principal || asset.codigo_patrimonial}</span>
                    {cfg && <span className="text-[10px] text-[var(--color-success)] bg-[var(--color-success-bg)] px-2 py-0.5 rounded font-semibold">Configurado</span>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{asset.tipo_unidad}</p>
                  {cfg && (
                    <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                      {cfg.frecuencia_km > 0 && <span>Cada {cfg.frecuencia_km} km </span>}
                      {cfg.frecuencia_horas > 0 && <span>Cada {cfg.frecuencia_horas} h </span>}
                      {cfg.frecuencia_dias > 0 && <span>Cada {cfg.frecuencia_dias} días</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{editingId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
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
                  <input type="text" name="searchAssetE" value={searchAssetE} onChange={(e) => { setSearchAssetE(e.target.value); setIsOpenAssetE(true) }}
                    onFocus={() => setIsOpenAssetE(true)}
                    placeholder={assetNames[form.asset_id] || 'Buscar...'}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                  {isOpenAssetE && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {filteredAssetsE.map((a) => (
                        <button key={a.id} type="button" onClick={() => { set('asset_id', a.id); setSearchAssetE(''); setIsOpenAssetE(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                          {a.placa_principal || a.codigo_patrimonial} — {a.tipo_unidad}
                        </button>
                      ))}
                      {filteredAssetsE.length === 0 && <p className="px-3 py-2 text-sm text-[var(--text-muted)]">Sin resultados</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo</label>
                  <select value={form.tipo_mtto} onChange={(e) => set('tipo_mtto', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="Preventivo">Preventivo</option>
                    <option value="Predictivo">Predictivo</option>
                    <option value="Correctivo">Correctivo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Estado</label>
                  <select value={form.estado} onChange={(e) => set('estado', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
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
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Costo</label>
                  <input type="number" step="0.01" name="costo_real" value={form.costo_real} onChange={(e) => set('costo_real', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Duración (h)</label>
                  <input type="number" step="0.1" name="duracion_horas" value={form.duracion_horas} onChange={(e) => set('duracion_horas', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Notas</label>
                <textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleSaveEvent} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Form Modal */}
      {configAssetId !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setConfigAssetId(null)}>
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Configurar — {assetNames[configForm.asset_id] || 'Activo'}
              </h3>
              <button onClick={() => setConfigAssetId(null)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Frec. KM</label>
                  <input type="number" name="frecuencia_km" value={configForm.frecuencia_km} onChange={(e) => setC('frecuencia_km', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Frec. Horas</label>
                  <input type="number" name="frecuencia_horas" value={configForm.frecuencia_horas} onChange={(e) => setC('frecuencia_horas', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Frec. Días</label>
                  <input type="number" name="frecuencia_dias" value={configForm.frecuencia_dias} onChange={(e) => setC('frecuencia_dias', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Odómetro Base</label>
                  <input type="number" name="odometro_base" value={configForm.odometro_base} onChange={(e) => setC('odometro_base', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Horómetro Base</label>
                  <input type="number" name="horometro_base" value={configForm.horometro_base} onChange={(e) => setC('horometro_base', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo Preventivo</label>
                <select value={configForm.tipo_preventivo} onChange={(e) => setC('tipo_preventivo', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                  <option value="Mantenimiento Predictivo">Mantenimiento Predictivo</option>
                  <option value="Inspección">Inspección</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Actividades</label>
                <textarea value={configForm.actividades} onChange={(e) => setC('actividades', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Materiales</label>
                <textarea value={configForm.materiales} onChange={(e) => setC('materiales', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setConfigAssetId(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleSaveConfig} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">Guardar</button>
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
