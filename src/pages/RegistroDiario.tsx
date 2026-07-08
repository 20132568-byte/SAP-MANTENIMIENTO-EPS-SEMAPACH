import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { formatDateDMY } from '../utils/date'

const emptyInicioForm = {
  fecha: new Date().toISOString().split('T')[0], asset_id: '', operador_id: '',
  horas_programadas: 8, km_inicial: '', horometro_inicial: '', hora_inicio_jornada: '',
}

const emptyCierreForm = {
  km_final: '', horometro_final: '', hora_fin_jornada: '', horas_reales: 8,
  horas_parada: 0, hora_inicio_parada: '', hora_fin_parada: '',
  estado_dia: 'Operativo', observaciones: '',
}

function FormDateInputDMY({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const parts = (value || '').split('T')[0].split('-')
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  const displayDate = y && m && d ? `${d}/${m}/${y}` : 'Seleccionar fecha...'

  const handleContainerClick = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker()
      } catch (err) {
        inputRef.current.focus()
      }
    }
  }

  return (
    <div 
      onClick={handleContainerClick}
      className="relative w-full cursor-pointer"
    >
      {/* Texto visual en formato Dia/Mes/Año fijo e inalterable */}
      <div className="w-full px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] flex items-center justify-between">
        <span>{displayDate}</span>
        <span className="material-symbols-outlined text-sm text-[var(--text-muted)]">calendar_month</span>
      </div>
      {/* Input nativo de fecha invisible superpuesto pero accesible vía ref */}
      <input
        ref={inputRef}
        type="date"
        value={value ? value.split('T')[0] : ''}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
    </div>
  )
}

export default function RegistroDiario() {
  const [activeTab, setActiveTab] = useState<'operaciones' | 'historial'>('operaciones')
  const [records, setRecords] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  
  // Estados para inicio in-situ (panel izquierdo)
  const [inicioForm, setInicioForm] = useState<any>({ ...emptyInicioForm })
  
  // Estados para cierre in-situ (panel derecho)
  const [closingRecordId, setClosingRecordId] = useState<number | null>(null)
  const [cierreForm, setCierreForm] = useState<any>({ ...emptyCierreForm })

  // Estados para edición del historial (modal simple)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  // Estados para paginación y búsqueda en historial
  const [searchQuery, setSearchQuery] = useState('')
  const [historyLimit, setHistoryLimit] = useState(15)

  useEffect(() => {
    api.getAssets({ categoria: 'fleet' }).then(setAssets)
    api.getOperators().then(setOperators)
  }, [])

  const loadRecords = () => {
    setLoading(true)
    api.getDailyRecords({ categoria: 'fleet' }).then((d) => {
      setRecords(d)
      setLoading(false)
    })
  }
  useEffect(() => { loadRecords() }, [])

  // Mapeos rápidos para visualización
  const assetNames = Object.fromEntries(assets.map((a: any) => [a.id, a.placa_principal || a.codigo_patrimonial]))
  const operatorNames = Object.fromEntries(operators.map((o: any) => [o.id, o.nombre]))

  // Filtrados
  const activeRecords = records.filter(r => !r.jornada_completa)
  
  const historyRecords = records.filter(r => r.jornada_completa)
  const filteredHistory = historyRecords.filter(r => {
    const assetName = (assetNames[r.asset_id] || r.asset_codigo || '').toLowerCase()
    const operatorName = (operatorNames[r.operador_id] || r.operador_nombre || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return assetName.includes(query) || operatorName.includes(query)
  })

  // Funciones Inicio
  const handleSelectInicioAsset = (assetId: string) => {
    const selected = assets.find(a => String(a.id) === assetId)
    setInicioForm((prev: any) => {
      const updated = { ...prev, asset_id: assetId ? Number(assetId) : '' }
      if (selected) {
        updated.km_inicial = selected.km_actual ?? 0
        updated.horometro_inicial = selected.horometro_actual ?? 0
      } else {
        updated.km_inicial = ''
        updated.horometro_inicial = ''
      }
      return updated
    })
  }

  const handleSaveInicio = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!inicioForm.asset_id) {
        setToast('Por favor, selecciona un vehículo')
        setTimeout(() => setToast(null), 3000)
        return
      }
      await api.createDailyRecord({ ...inicioForm, jornada_completa: false })
      setToast('Jornada iniciada correctamente')
      setInicioForm({ ...emptyInicioForm, fecha: new Date().toISOString().split('T')[0] })
      loadRecords()
    } catch (err: any) {
      setToast(err.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  // Funciones Cierre
  const startCierre = (r: any) => {
    setClosingRecordId(r.id)
    setCierreForm({
      ...emptyCierreForm,
      km_final: r.km_inicial !== null ? r.km_inicial : '',
      horometro_final: r.horometro_inicial !== null ? r.horometro_inicial : '',
      hora_fin_jornada: new Date().toTimeString().split(' ')[0].slice(0, 5),
      horas_reales: 8,
      horas_parada: 0,
      estado_dia: 'Operativo',
      observaciones: ''
    })
  }

  const handleSaveCierre = async (recordId: number) => {
    try {
      const record = records.find(r => r.id === recordId)
      if (!record) return
      
      const kmInicial = Number(record.km_inicial || 0)
      const kmFinal = Number(cierreForm.km_final || 0)
      
      if (kmFinal < kmInicial) {
        setToast(`El Kilometraje Final (${kmFinal}) no puede ser menor al inicial (${kmInicial})`)
        setTimeout(() => setToast(null), 3000)
        return
      }

      // Combinamos el registro existente (que tiene fecha, asset_id, etc.) con los datos de cierre
      const updateData = {
        ...record,
        ...cierreForm,
        jornada_completa: true
      }

      await api.updateDailyRecord(recordId, updateData)
      setToast('Jornada cerrada correctamente')
      setClosingRecordId(null)
      loadRecords()
    } catch (err: any) {
      setToast(err.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  // Funciones Edición Historial
  const startEdit = (r: any) => {
    setEditingRecord(r)
    setEditForm({ ...r, asset_id: r.asset_id || '', operador_id: r.operador_id || '' })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      if (!editForm.asset_id) {
        setToast('Por favor, selecciona un vehículo')
        setTimeout(() => setToast(null), 3000)
        return
      }
      await api.updateDailyRecord(editingRecord.id, editForm)
      setToast('Registro actualizado correctamente')
      setShowEditModal(false)
      setEditingRecord(null)
      loadRecords()
    } catch (err: any) {
      setToast(err.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este registro del historial?')) return
    try {
      await api.deleteDailyRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      setToast('Registro eliminado correctamente')
    } catch (err: any) {
      setToast(err.message)
    }
    setTimeout(() => setToast(null), 2500)
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Operativo': return 'text-[var(--color-success)] bg-[var(--color-success-bg)]'
      case 'Inoperativo': return 'text-[var(--color-error)] bg-[var(--color-error-bg)]'
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
      {/* Encabezado y Selector de Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Operación de Vehículos</h1>
          <p className="text-xs text-[var(--text-secondary)]">Monitoreo y registro de salidas y retornos de flota</p>
        </div>
        <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border)] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('operaciones')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'operaciones'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Control Diario
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'historial'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {activeTab === 'operaciones' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LADO IZQUIERDO: Formulario de Inicio (40% de ancho) */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Iniciar Nueva Jornada</h2>
              <p className="text-xs text-[var(--text-secondary)]">Registra la salida de un vehículo a ruta</p>
            </div>
            
            <form onSubmit={handleSaveInicio} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Fecha de Inicio</label>
                <FormDateInputDMY value={inicioForm.fecha} onChange={(val) => setInicioForm((prev: any) => ({ ...prev, fecha: val }))} />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Vehículo (Placa)</label>
                <select
                  value={inicioForm.asset_id}
                  onChange={(e) => handleSelectInicioAsset(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                >
                  <option value="">Seleccionar vehículo...</option>
                  {assets.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.placa_principal || a.codigo_patrimonial} — {a.tipo_unidad || 'Sin Tipo'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Operador</label>
                <select
                  value={inicioForm.operador_id}
                  onChange={(e) => setInicioForm((prev: any) => ({ ...prev, operador_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                >
                  <option value="">Seleccionar operador...</option>
                  {operators.map((o: any) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Km Inicial</label>
                  <input
                    type="number"
                    value={inicioForm.km_inicial}
                    onChange={(e) => setInicioForm((prev: any) => ({ ...prev, km_inicial: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Horómetro Inicial</label>
                  <input
                    type="number"
                    value={inicioForm.horometro_inicial}
                    onChange={(e) => setInicioForm((prev: any) => ({ ...prev, horometro_inicial: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Hora Salida</label>
                  <input
                    type="time"
                    value={inicioForm.hora_inicio_jornada}
                    onChange={(e) => setInicioForm((prev: any) => ({ ...prev, hora_inicio_jornada: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Horas Prog.</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inicioForm.horas_programadas}
                    onChange={(e) => setInicioForm((prev: any) => ({ ...prev, horas_programadas: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-bold rounded-xl hover:opacity-95 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                Registrar Salida
              </button>
            </form>
          </div>

          {/* LADO DERECHO: Jornadas en Curso / Vehículos en Ruta (60% de ancho) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Vehículos en Ruta
                {activeRecords.length > 0 && (
                  <span className="px-2 py-0.5 bg-[var(--color-warning-bg)] text-[var(--color-warning)] text-[10px] rounded-full font-bold">
                    {activeRecords.length} activos
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">Registros que no han realizado el retorno de jornada</p>
            </div>

            {activeRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
                <span className="material-symbols-outlined text-3xl text-[var(--text-muted)] mb-2">done_all</span>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Todos los vehículos están en cochera</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Inicia una jornada a la izquierda para verla aquí</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {activeRecords.map((r) => {
                  const isClosing = closingRecordId === r.id
                  return (
                    <div
                      key={r.id}
                      className={`bg-[var(--bg-card)] border rounded-2xl transition-all overflow-hidden ${
                        isClosing ? 'border-[var(--accent)] shadow-md' : 'border-[var(--border)] shadow-sm hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {/* Cabecera Tarjeta */}
                      <div className="p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
                              {assetNames[r.asset_id] || r.asset_codigo || '—'}
                            </span>
                            <span className="px-2 py-0.5 bg-[var(--color-warning-bg)] text-[var(--color-warning)] text-[10px] font-semibold rounded">
                              En Curso
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] font-medium">
                            Operador: <span className="text-[var(--text-primary)] font-semibold">{operatorNames[r.operador_id] || r.operador_nombre || 'Sin asignar'}</span>
                          </p>
                          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] pt-1">
                            <span>Salida: {r.hora_inicio_jornada || '—'}</span>
                            <span>Km Inicial: {r.km_inicial ?? '—'} km</span>
                            <span>Horómetro: {r.horometro_inicial ?? '—'} h</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)] transition-all flex items-center justify-center"
                            title="Eliminar Jornada"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                          <button
                            onClick={() => startEdit(r)}
                            className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                            title="Editar Datos de Salida"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => (isClosing ? setClosingRecordId(null) : startCierre(r))}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              isClosing
                                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]'
                                : 'bg-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90'
                            }`}
                          >
                            {isClosing ? 'Cancelar' : 'Cerrar Jornada'}
                          </button>
                        </div>
                      </div>

                      {/* Formulario de Cierre Expansible In-Situ */}
                      {isClosing && (
                        <div className="bg-[var(--bg-secondary)] border-t border-[var(--border)] p-4 space-y-4">
                          <div className="border-b border-[var(--border)] pb-2 mb-2">
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Registrar Retorno del Vehículo</h4>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Km Final</label>
                              <input
                                type="number"
                                placeholder={`Min: ${r.km_inicial}`}
                                value={cierreForm.km_final}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, km_final: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Horómetro Final</label>
                              <input
                                type="number"
                                value={cierreForm.horometro_final}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, horometro_final: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Hora Fin</label>
                              <input
                                type="time"
                                value={cierreForm.hora_fin_jornada}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, hora_fin_jornada: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Estado Unidad</label>
                              <select
                                value={cierreForm.estado_dia}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, estado_dia: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              >
                                <option value="Operativo">Operativo</option>
                                <option value="Inoperativo">Inoperativo</option>
                                <option value="En Mantenimiento">En Mantenimiento</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Horas Reales</label>
                              <input
                                type="number"
                                step="0.1"
                                value={cierreForm.horas_reales}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, horas_reales: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Horas Parada</label>
                              <input
                                type="number"
                                step="0.1"
                                value={cierreForm.horas_parada}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, horas_parada: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">Observaciones</label>
                              <input
                                type="text"
                                placeholder="Opcional..."
                                value={cierreForm.observaciones}
                                onChange={(e) => setCierreForm((prev: any) => ({ ...prev, observaciones: e.target.value }))}
                                className="w-full px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                            <button
                              onClick={() => handleSaveCierre(r.id)}
                              className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-bold rounded-lg hover:opacity-95 shadow-sm"
                            >
                              Guardar Cierre
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PESTAÑA HISTORIAL (Tabla ligera bajo demanda) */
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Historial de Operaciones</h2>
              <p className="text-xs text-[var(--text-secondary)]">Consulta las jornadas anteriores de los vehículos</p>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-[var(--text-muted)]">search</span>
              <input
                type="text"
                placeholder="Buscar por placa o por operador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-12">No hay registros cerrados que coincidan</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      <th className="text-left p-3">Fecha</th>
                      <th className="text-left p-3">Vehículo (Placa)</th>
                      <th className="text-left p-3">Operador</th>
                      <th className="text-left p-3">Hora Salida/Retorno</th>
                      <th className="text-left p-3">Km (Ini/Fin)</th>
                      <th className="text-left p-3">H. Prog / Real</th>
                      <th className="text-left p-3">Estado</th>
                      <th className="text-left p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredHistory.slice(0, historyLimit).map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="p-3 text-[var(--text-primary)] font-medium">{formatDateDMY(r.fecha)}</td>
                        <td className="p-3 text-[var(--text-primary)] font-bold uppercase">{assetNames[r.asset_id] || r.asset_codigo || '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{operatorNames[r.operador_id] || r.operador_nombre || '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{r.hora_inicio_jornada || '—'} a {r.hora_fin_jornada || '—'}</td>
                        <td className="p-3 text-[var(--text-secondary)] font-medium">
                          {r.km_inicial ?? '0'} → {r.km_final ?? '0'} ({r.km_recorridos ?? '0'} km)
                        </td>
                        <td className="p-3 text-[var(--text-secondary)]">
                          {r.horas_programadas ?? '0'}h / {r.horas_reales ?? '0'}h
                        </td>
                        <td className="p-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getStatusColor(r.estado_dia)}`}>
                            {r.estado_dia}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(r)}
                              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredHistory.length > historyLimit && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setHistoryLimit(prev => prev + 15)}
                    className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                  >
                    Cargar más registros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EDICIÓN HISTÓRICA COMPLETO (Solo uso administrativo) */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[var(--bg-overlay)] overflow-y-auto" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg mb-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Editar Registro del Historial
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Fecha</label>
                  <FormDateInputDMY value={editForm.fecha} onChange={(val) => setEditForm((prev: any) => ({ ...prev, fecha: val }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Activo (Vehículo)</label>
                  <select
                    value={editForm.asset_id}
                    onChange={(e) => {
                      const selected = assets.find(a => String(a.id) === e.target.value)
                      setEditForm((prev: any) => ({
                        ...prev,
                        asset_id: e.target.value ? Number(e.target.value) : '',
                        km_inicial: selected ? (selected.km_actual ?? 0) : prev.km_inicial
                      }))
                    }}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Seleccionar vehículo...</option>
                    {assets.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.placa_principal || a.codigo_patrimonial} — {a.tipo_unidad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Operador</label>
                  <select
                    value={editForm.operador_id}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, operador_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Sin operador</option>
                    {operators.map((o: any) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Estado del Día</label>
                  <select
                    value={editForm.estado_dia}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, estado_dia: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Operativo">Operativo</option>
                    <option value="Inoperativo">Inoperativo</option>
                    <option value="En Mantenimiento">En Mantenimiento</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">H. Programadas</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.horas_programadas || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, horas_programadas: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">H. Reales</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.horas_reales || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, horas_reales: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Km Inicial</label>
                  <input
                    type="number"
                    value={editForm.km_inicial !== null ? editForm.km_inicial : ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, km_inicial: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Km Final</label>
                  <input
                    type="number"
                    value={editForm.km_final !== null ? editForm.km_final : ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, km_final: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Horómetro Inicial</label>
                  <input
                    type="number"
                    value={editForm.horometro_inicial !== null ? editForm.horometro_inicial : ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, horometro_inicial: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Horómetro Final</label>
                  <input
                    type="number"
                    value={editForm.horometro_final !== null ? editForm.horometro_final : ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, horometro_final: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">H. Parada</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.horas_parada || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, horas_parada: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Hora Inicio Salida</label>
                  <input
                    type="time"
                    value={editForm.hora_inicio_jornada || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, hora_inicio_jornada: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Hora Fin Retorno</label>
                  <input
                    type="time"
                    value={editForm.hora_fin_jornada || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, hora_fin_jornada: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">H. Inicio Parada</label>
                  <input
                    type="time"
                    value={editForm.hora_inicio_parada || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, hora_inicio_parada: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">H. Fin Parada</label>
                  <input
                    type="time"
                    value={editForm.hora_fin_parada || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, hora_fin_parada: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Observaciones</label>
                <textarea
                  value={editForm.observaciones || ''}
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg text-xs text-[var(--text-primary)] animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}
