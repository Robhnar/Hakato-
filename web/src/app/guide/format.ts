// Formatowanie dat i zakresów dla przewodnika po lądowaniu.
// Czyste funkcje: biorą stringi UTC / liczby i zwracają tekst dla UI.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Klucz miesiąca "YYYY-MM" z miesiąca indeksowanego od zera.
function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

// Parse "YYYY-MM" na rok i miesiąc (0–11); null przy pustym lub błędnym wejściu.
function parseMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year: Number(match[1]), month: month - 1 }
}

export function formatDay(utc: string): string {
  const d = new Date(utc)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function formatUtcTime(utc: string): string {
  const d = new Date(utc)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} UTC`
}

export function formatLocalTime(utc: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }
  if (timeZone) options.timeZone = timeZone
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(new Date(utc))
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hh}:${mm} your time`
}

export function formatDuration(hours: number): string {
  const rounded = Math.round(hours)
  if (hours <= 0 || rounded === 0) return 'none'
  if (rounded < 25) return rounded === 1 ? '1 hour' : `${rounded} hours`
  const days = Math.round(hours / 24)
  return days === 1 ? 'about 1 day' : `about ${days} days`
}

export function formatPercent(f: number): string {
  return `${Math.round(f * 100)}%`
}

export function defaultMonthRange(now: Date): { from: string; to: string } {
  const nowAbs = now.getUTCFullYear() * 12 + now.getUTCMonth()
  const fromAbs = nowAbs + 1
  const toAbs = fromAbs + 11
  return {
    from: monthKey(Math.floor(fromAbs / 12), fromAbs % 12),
    to: monthKey(Math.floor(toAbs / 12), toAbs % 12),
  }
}

export function monthRangeToSearch(
  from: string,
  to: string,
): { search_start_utc: string; search_end_utc: string } | { error: string } {
  const fromParsed = parseMonth(from)
  const toParsed = parseMonth(to)
  if (!fromParsed || !toParsed) return { error: 'Choose both months.' }
  const fromAbs = fromParsed.year * 12 + fromParsed.month
  const toAbs = toParsed.year * 12 + toParsed.month
  if (toAbs < fromAbs) return { error: 'The end month must be after the start month.' }
  if (toAbs - fromAbs + 1 > 24) return { error: 'Please choose at most 2 years.' }
  const endAbs = toAbs + 1
  return {
    search_start_utc: `${monthKey(fromParsed.year, fromParsed.month)}-01T00:00:00Z`,
    search_end_utc: `${monthKey(Math.floor(endAbs / 12), endAbs % 12)}-01T00:00:00Z`,
  }
}
