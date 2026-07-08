export function n2(v: number | string | null | undefined, fallback = '—'): string {
  if (v == null || v === '') return fallback
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return fallback
  return n.toFixed(2)
}
