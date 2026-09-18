// Shared constants and formatters for the admin pages.

export const STATUS_TONE: Record<string, string> = {
  new: 'bg-accent-400/15 text-accent-200 ring-accent-400/30',
  requested: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
  contacted: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
  confirmed: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
  booked: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
  completed: 'bg-tint/10 text-fg-soft ring-line-strong',
  closed: 'bg-tint/10 text-fg-soft ring-line-strong',
  cancelled: 'bg-red-400/15 text-red-200 ring-red-400/30',
}

export const STATUS_LABEL: Record<string, string> = {
  requested: 'Pending',
  confirmed: 'Accepted',
  completed: 'Completed',
  cancelled: 'Declined',
}

export const INPUT = 'w-full rounded-lg border border-line-strong bg-tint/[0.04] px-3 py-2 text-sm text-fg focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-400/15'

export function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  return '$' + n.toLocaleString()
}

export function when(s: string) {
  return new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z')).toLocaleString()
}

export function prettyDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
