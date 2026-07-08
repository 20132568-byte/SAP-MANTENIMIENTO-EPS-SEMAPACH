import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Catalogos() {
  const [types, setTypes] = useState<string[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newValor, setNewValor] = useState('')

  useEffect(() => {
    api.getCatalogTypes().then((t) => {
      setTypes(t)
      if (t.length > 0) setSelectedType(t[0])
    })
  }, [])

  useEffect(() => {
    if (!selectedType) return
    setLoading(true)
    api.getCatalog(selectedType).then((d) => { setItems(d); setLoading(false) })
  }, [selectedType])

  const handleAdd = async () => {
    if (!newValor.trim()) return
    try {
      await api.createCatalogItem({ tipo: selectedType, valor: newValor.trim() })
      setToast('Valor agregado')
      setNewValor('')
      setShowForm(false)
      const d = await api.getCatalog(selectedType)
      setItems(d)
    } catch (e: any) { setToast(e.message) }
    setTimeout(() => setToast(null), 2500)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este valor?')) return
    await api.deleteCatalogItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setToast('Valor eliminado')
    setTimeout(() => setToast(null), 2500)
  }

  if (loading && items.length === 0) {
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
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Catálogos</h1>
          <p className="text-sm text-[var(--text-secondary)]">Valores parametrizables del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
            {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90 transition-all">
            Agregar
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">{items.length} valores en "{selectedType.replace(/_/g, ' ')}"</p>

      {items.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-12">Catálogo vacío</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-all">
              <span className="text-sm text-[var(--text-primary)]">{item.valor}</span>
              <button onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--text-muted)] hover:text-[var(--color-error)] transition-all">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-[var(--bg-overlay)]" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Nuevo Valor</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[var(--text-muted)]">Catálogo: {selectedType.replace(/_/g, ' ')}</p>
              <input type="text" value={newValor} onChange={(e) => setNewValor(e.target.value)}
                placeholder="Nuevo valor"
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button onClick={handleAdd} className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:opacity-90">Agregar</button>
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
