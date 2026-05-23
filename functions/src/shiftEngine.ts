import Holidays from 'date-holidays'

type ShiftType = '교1' | '교2' | '당' | '비' | '전진배치' | '중요업무'

const CYCLE: ShiftType[] = ['교1', '교2', '당', '비']
const hd = new Holidays('KR')

function isHoliday(date: Date): boolean {
  const result = hd.isHoliday(date)
  return result !== false && result.length > 0
}

function isWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dayDiff(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86400000)
}

export function computeShift(
  startDate: string,
  startShift: string,
  overrides: Record<string, string>,
  dateStr: string
): string {
  if (overrides[dateStr]) return overrides[dateStr]

  const start = parseDate(startDate)
  const startIdx = CYCLE.indexOf(startShift as ShiftType)
  const date = parseDate(dateStr)
  const diff = dayDiff(start, date)
  const rawIdx = ((startIdx + diff) % CYCLE.length + CYCLE.length) % CYCLE.length
  const rawShift = CYCLE[rawIdx]

  if ((rawShift === '교1' || rawShift === '교2') && (isWeekend(date) || isHoliday(date))) {
    return '비'
  }

  return rawShift
}
