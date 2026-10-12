const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2004-07-21" -> "21 Jul 2004"
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// "2004-07-21" -> "22 yr" (or months for babies under one year)
export function formatAge(iso: string, today: Date = new Date()): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const tm = today.getMonth() + 1
  const td = today.getDate()

  let years = today.getFullYear() - y
  if (tm < m || (tm === m && td < d)) years -= 1
  if (years >= 1) return `${years} yr`

  const months = (today.getFullYear() - y) * 12 + (tm - m) - (td < d ? 1 : 0)
  return `${Math.max(0, months)} mo`
}

const pad = (n: number) => String(n).padStart(2, '0')

// A date as YYYY-MM-DD in the phone's own time zone, never shifted by UTC
export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Today plus a number of days, as YYYY-MM-DD
export function addDaysLocal(days: number, from: Date = new Date()): string {
  return toLocalIso(new Date(from.getFullYear(), from.getMonth(), from.getDate() + days))
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// "2026-10-27" -> "Tuesday"
export function weekdayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}