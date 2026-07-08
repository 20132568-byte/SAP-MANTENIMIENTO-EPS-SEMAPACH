export default function KpiCard({ title, value, unit, icon, colorClass, bgClass }: { title: string; value: string | number; unit?: string; icon: string; colorClass: string; bgClass: string }) {
  return (
    <div className="rounded-2xl p-6 border border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-300 bg-[var(--bg-card)] relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-10 transition-opacity ${colorClass}`}>
        <span className="material-symbols-outlined text-6xl">{icon}</span>
      </div>
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgClass} ${colorClass}`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
          {unit && <span className="text-xs font-medium text-[var(--text-muted)]">{unit}</span>}
        </div>
      </div>
    </div>
  )
}
