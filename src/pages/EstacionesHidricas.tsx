import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { formatDateDMY } from '../utils/date'

type DetailTab = 'equipos' | 'mantenimiento' | 'registros'

export default function EstacionesHidricas() {
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [equipment, setEquipment] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [detailTab, setDetailTab] = useState<DetailTab>('equipos')
  const [toast, setToast] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<any>({ codigo: '', nombre: '', ubicacion: '', tipo_estacion: 'Cisterna', estado: 'Operativa', latitud: '', longitud: '' })
  const [showEquipForm, setShowEquipForm] = useState(false)
  const [equipForm, setEquipForm] = useState<any>({ codigo: '', tipo_equipo: 'Bomba', marca: '', modelo: '', serie: '', potencia_hp: '', estado: 'Operativo' })
  const [showMaintForm, setShowMaintForm] = useState(false)
  const [maintForm, setMaintForm] = useState<any>({ equipo_id: '', tipo_mantenimiento: 'Preventivo', descripcion: '', fecha_programada: '', estado: 'Programado' })

  useEffect(() => { loadStations() }, [])

  const loadStations = () => {
    setLoading(true)
    api.getStations().then((s) => {
      setStations(s); setLoading(false)
      if (s.length > 0 && !selectedId) setSelectedId(s[0].id)
    })
  }

  useEffect(() => {
    if (!selectedId) return
    api.getStationEquipment(selectedId).then(setEquipment)
    api.getStationMaintenance(selectedId).then(setMaintenance)
    api.getStationRecords(selectedId).then(setRecords)
  }, [selectedId])

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const setE = (k: string, v: any) => setEquipForm((f: any) => ({ ...f, [k]: v }))
  const setM = (k: string, v: any) => setMaintForm((f: any) => ({ ...f, [k]: v }))

  const openNew = () => { setEditingId(null); setForm({ codigo: '', nombre: '', ubicacion: '', tipo_estacion: 'Cisterna', estado: 'Operativa', latitud: '', longitud: '' }); setShowForm(true) }
  const openEdit = (s: any) => { setEditingId(s.id); setForm(s); setShowForm(true) }

  const handleSaveStation = async () => {
    try {
      if (editingId) {
        await api.updateStation(editingId, form)
      } else {
        await api.createStation(form)
      }
      setToast(editingId ? 'Estación actualizada' : 'Estación creada')
      setShowForm(false); setEditingId(null)
      loadStations()
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDeleteStation = async (id: number) => {
    if (!confirm('¿Eliminar esta estación?')) return
    await api.deleteStation(id)
    setStations((prev) => prev.filter((s) => s.id !== id))
    if (selectedId === id) setSelectedId(null)
    setToast('Estación eliminada')
    setTimeout(() => setToast(null), 2500)
  }

  const handleAddEquip = async () => {
    if (!selectedId) return
    try {
      await api.addStationEquipment(selectedId, equipForm)
      setToast('Equipo agregado')
      setShowEquipForm(false)
      setEquipForm({ codigo: '', tipo_equipo: 'Bomba', marca: '', modelo: '', serie: '', potencia_hp: '', estado: 'Operativo' })
      api.getStationEquipment(selectedId).then(setEquipment)
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDeleteEquip = async (id: number) => {
    if (!confirm('¿Eliminar este equipo?')) return
    await api.deleteStationEquipment(id)
    setEquipment((prev) => prev.filter((e) => e.id !== id))
    setToast('Equipo eliminado')
    setTimeout(() => setToast(null), 2500)
  }

  const handleAddMaint = async () => {
    if (!selectedId) return
    try {
      await api.addStationMaintenance(selectedId, maintForm)
      setToast('Mantenimiento registrado')
      setShowMaintForm(false)
      setMaintForm({ equipo_id: '', tipo_mantenimiento: 'Preventivo', descripcion: '', fecha_programada: '', estado: 'Programado' })
      api.getStationMaintenance(selectedId).then(setMaintenance)
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDeleteMaint = async (id: number) => {
    if (!confirm('¿Eliminar este mantenimiento?')) return
    await api.deleteStationMaintenance(id)
    setMaintenance((prev) => prev.filter((m) => m.id !== id))
    setToast('Mantenimiento eliminado')
    setTimeout(() => setToast(null), 2500)
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Operativa': case 'Operativo': case 'Completado': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
      case 'Inoperativa': case 'Inoperativo': case 'Vencido': return 'text-[var(--color-error)] bg-[var(--color-error-bg)]'
      case 'En Mantenimiento': case 'Programado': return 'text-[var(--color-warning)] bg-[var(--color-warning-bg)]'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Estaciones Hídricas</h1>
          <p className="text-sm text-[var(--text-secondary)]">{stations.length} estaciones</p>
        </div>
        <button onClick={openNew} className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
          Nueva Estación
        </button>
      </div>

      {stations.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">No hay estaciones registradas</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Station List */}
          <div className="lg:col-span-1 space-y-2">
            {stations.map((s) => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedId === s.id
                    ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{s.codigo}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(s.estado)}`}>{s.estado}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{s.nombre}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{s.ubicacion} · {s.tipo_estacion}</p>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selectedId ? (
              <div className="space-y-4">
                {/* Station header */}
                {(() => {
                  const s = stations.find((st) => st.id === selectedId)
                  if (!s) return null
                  return (
                    <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">{s.nombre}</h3>
                          <p className="text-sm text-[var(--text-secondary)]">{s.codigo} · {s.tipo_estacion}</p>
                          <p className="text-xs text-[var(--text-muted)]">{s.ubicacion}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"><span className="material-symbols-outlined text-sm">edit</span></button>
                          <button onClick={() => handleDeleteStation(s.id)} className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)]"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                      </div>
                      {s.latitud && s.longitud && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-2">📍 {s.latitud}, {s.longitud}</p>
                      )}
                    </div>
                  )
                })()}

                {/* Detail tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] w-fit">
                  {(['equipos', 'mantenimiento', 'registros'] as DetailTab[]).map((t) => (
                    <button key={t} onClick={() => setDetailTab(t)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
                        detailTab === t ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}>
                      {t === 'equipos' ? 'Equipos' : t === 'mantenimiento' ? 'Mantenimiento' : 'Registros'}
                    </button>
                  ))}
                </div>

                {/* Equipos Tab */}
                {detailTab === 'equipos' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setShowEquipForm(true)} className="px-3 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-medium rounded-lg hover:opacity-90">Agregar Equipo</button>
                    </div>
                    {equipment.length === 0 ? (
                      <p className="text-center text-[var(--text-muted)] py-8 text-sm">Sin equipos registrados</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                              <th className="text-left p-3">Código</th>
                              <th className="text-left p-3">Tipo</th>
                              <th className="text-left p-3">Marca / Modelo</th>
                              <th className="text-left p-3">Potencia (HP)</th>
                              <th className="text-left p-3">Estado</th>
                              <th className="text-left p-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {equipment.map((eq) => (
                              <tr key={eq.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="p-3 text-[var(--text-primary)] font-medium">{eq.codigo}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{eq.tipo_equipo}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{eq.marca} {eq.modelo}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{eq.potencia_hp ?? '—'}</td>
                                <td className="p-3">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(eq.estado)}`}>{eq.estado}</span>
                                </td>
                                <td className="p-3">
                                  <button onClick={() => handleDeleteEquip(eq.id)} className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)]"><span className="material-symbols-outlined text-sm">delete</span></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Mantenimiento Tab */}
                {detailTab === 'mantenimiento' && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setShowMaintForm(true)} className="px-3 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-medium rounded-lg hover:opacity-90">Nuevo Mantenimiento</button>
                    </div>
                    {maintenance.length === 0 ? (
                      <p className="text-center text-[var(--text-muted)] py-8 text-sm">Sin mantenimientos registrados</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                              <th className="text-left p-3">Fecha Prog.</th>
                              <th className="text-left p-3">Tipo</th>
                              <th className="text-left p-3">Descripción</th>
                              <th className="text-left p-3">Estado</th>
                              <th className="text-left p-3">Fecha Ejec.</th>
                              <th className="text-left p-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {maintenance.map((m) => (
                              <tr key={m.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="p-3 text-[var(--text-primary)]">{formatDateDMY(m.fecha_programada)}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{m.tipo_mantenimiento}</td>
                                <td className="p-3 text-[var(--text-secondary)] max-w-[200px] truncate">{m.descripcion}</td>
                                <td className="p-3">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusColor(m.estado)}`}>{m.estado}</span>
                                </td>
                                <td className="p-3 text-[var(--text-secondary)]">{formatDateDMY(m.fecha_ejecucion)}</td>
                                <td className="p-3">
                                  <button onClick={() => handleDeleteMaint(m.id)} className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)]"><span className="material-symbols-outlined text-sm">delete</span></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Registros Tab */}
                {detailTab === 'registros' && (
                  <>
                    {records.length === 0 ? (
                      <p className="text-center text-[var(--text-muted)] py-8 text-sm">Sin registros</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                              <th className="text-left p-3">Fecha</th>
                              <th className="text-left p-3">Detalle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {records.map((r: any) => (
                              <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="p-3 text-[var(--text-primary)]">{formatDateDMY(r.created_at || r.fecha)}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{r.detalle || r.observaciones || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                Selecciona una estación
              </div>
            )}
          </div>
        </div>
      )}

      {/* Station Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{editingId ? 'Editar Estación' : 'Nueva Estación'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Código</label>
                  <input type="text" value={form.codigo} onChange={(e) => set('codigo', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo</label>
                  <select value={form.tipo_estacion} onChange={(e) => set('tipo_estacion', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="Cisterna">Cisterna</option>
                    <option value="Rebombeo">Rebombeo</option>
                    <option value="Cloración">Cloración</option>
                    <option value="Bombeo">Bombeo</option>
                    <option value="Almacenamiento">Almacenamiento</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Nombre</label>
                  <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Ubicación</label>
                  <input type="text" value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Estado</label>
                  <select value={form.estado} onChange={(e) => set('estado', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="Operativa">Operativa</option>
                    <option value="Inoperativa">Inoperativa</option>
                    <option value="En Mantenimiento">En Mantenimiento</option>
                  </select>
                </div>
                <div></div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Latitud</label>
                  <input type="text" value={form.latitud} onChange={(e) => set('latitud', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Longitud</label>
                  <input type="text" value={form.longitud} onChange={(e) => set('longitud', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleSaveStation} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">{editingId ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Equip Form Modal */}
      {showEquipForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowEquipForm(false)}>
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Agregar Equipo</h3>
              <button onClick={() => setShowEquipForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Código</label>
                <input type="text" value={equipForm.codigo} onChange={(e) => setE('codigo', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo Equipo</label>
                <select value={equipForm.tipo_equipo} onChange={(e) => setE('tipo_equipo', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="Bomba">Bomba</option>
                  <option value="Motor">Motor</option>
                  <option value="Válvula">Válvula</option>
                  <option value="Tablero">Tablero</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Marca</label>
                  <input type="text" value={equipForm.marca} onChange={(e) => setE('marca', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Modelo</label>
                  <input type="text" value={equipForm.modelo} onChange={(e) => setE('modelo', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Serie</label>
                  <input type="text" value={equipForm.serie} onChange={(e) => setE('serie', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Potencia (HP)</label>
                  <input type="number" step="0.5" value={equipForm.potencia_hp} onChange={(e) => setE('potencia_hp', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Estado</label>
                <select value={equipForm.estado} onChange={(e) => setE('estado', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="Operativo">Operativo</option>
                  <option value="Inoperativo">Inoperativo</option>
                  <option value="En Mantenimiento">En Mantenimiento</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowEquipForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleAddEquip} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Maint Form Modal */}
      {showMaintForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowMaintForm(false)}>
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Nuevo Mantenimiento</h3>
              <button onClick={() => setShowMaintForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Equipo</label>
                <select value={maintForm.equipo_id} onChange={(e) => setM('equipo_id', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="">Seleccionar</option>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.codigo} — {eq.tipo_equipo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Tipo</label>
                <select value={maintForm.tipo_mantenimiento} onChange={(e) => setM('tipo_mantenimiento', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Predictivo">Predictivo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Descripción</label>
                <textarea value={maintForm.descripcion} onChange={(e) => setM('descripcion', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Fecha Programada</label>
                  <input type="date" value={maintForm.fecha_programada} onChange={(e) => setM('fecha_programada', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Estado</label>
                  <select value={maintForm.estado} onChange={(e) => setM('estado', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
                    <option value="Programado">Programado</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowMaintForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleAddMaint} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-sm text-[var(--text-primary)] animate-in">{toast}</div>
      )}
    </div>
  )
}
