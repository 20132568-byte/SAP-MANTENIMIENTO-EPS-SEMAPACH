import { useCallback, useEffect } from 'react'

function getCurrentWeek() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

function parseWeek(week: string) {
  const [y, w] = week.split('-W')
  return { year: parseInt(y, 10), week: parseInt(w, 10) }
}

function formatWeek(year: number, week: number) {
  return `${year}-W${week.toString().padStart(2, '0')}`
}

function shiftWeek(week: string, delta: number) {
  const { year, week: w } = parseWeek(week)
  let totalDays = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)
  totalDays += (w - 1) * 7
  totalDays += delta * 7

  let y = year
  let remaining = totalDays
  while (true) {
    const daysInYear = 365 + (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 1 : 0)
    if (remaining < daysInYear) break
    remaining -= daysInYear
    y++
  }
  const newWeek = Math.floor(remaining / 7) + 1
  return formatWeek(y, Math.min(newWeek, 53))
}

export default function WeekPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const prev = useCallback(() => onChange(shiftWeek(value, -1)), [value, onChange])
  const next = useCallback(() => onChange(shiftWeek(value, 1)), [value, onChange])
  const goToday = useCallback(() => onChange(getCurrentWeek()), [onChange])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && (e.altKey || e.metaKey)) { prev(); e.preventDefault() }
      if (e.key === 'ArrowRight' && (e.altKey || e.metaKey)) { next(); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next])

  const { year, week } = parseWeek(value)
  const label = `Sem ${week} - ${year}`

  return (
    <div className="flex items-center gap-1">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all cursor-pointer" title="Semana anterior (Alt+←)">
        <span className="material-symbols-outlined text-sm">chevron_left</span>
      </button>
      <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-all cursor-pointer min-w-[100px] text-center">
        {label}
      </button>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all cursor-pointer" title="Semana siguiente (Alt+→)">
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  )
}

export { getCurrentWeek, shiftWeek }
