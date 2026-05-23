import Holidays from 'date-holidays'
import type { ShiftType } from '../lib/types'

const CYCLE: ShiftType[] = ['교1', '교2', '당', '비']

const hd = new Holidays('KR')

function isHoliday(date: Date): boolean {
  const result = hd.isHoliday(date)
  return result !== false && result.length > 0
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dayDiff(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / msPerDay)
}

export function getShiftForDate(
  date: Date,
  startDate: string,
  startShift: ShiftType,
  overrides: Record<string, ShiftType>
): ShiftType {
  const key = toDateString(date)

  if (overrides[key]) return overrides[key]

  const start = parseDate(startDate)
  const startIdx = CYCLE.indexOf(startShift)
  const diff = dayDiff(start, date)
  const rawIdx = ((startIdx + diff) % CYCLE.length + CYCLE.length) % CYCLE.length
  const rawShift = CYCLE[rawIdx]

  if ((rawShift === '교1' || rawShift === '교2') && (isWeekend(date) || isHoliday(date))) {
    return '비'
  }

  return rawShift
}

export type ShiftStyle = {
  bg: string
  text: string
  type: 'circle' | 'pill' | 'text'
}

export function getShiftStyle(shift: ShiftType): ShiftStyle {
  switch (shift) {
    case '교1':
    case '교2':
      return { bg: '#f5e97a', text: '#5a4800', type: 'circle' }
    case '당':
      return { bg: '#555555', text: '#ffffff', type: 'circle' }
    case '비':
      return { bg: 'transparent', text: '#E24B4A', type: 'text' }
    case '전진배치':
      return { bg: '#378ADD', text: '#ffffff', type: 'pill' }
    case '중요업무':
      return { bg: '#2eab6c', text: '#ffffff', type: 'pill' }
  }
}

export function getNextOffDay(
  fromDate: Date,
  startDate: string,
  startShift: ShiftType,
  overrides: Record<string, ShiftType>
): { date: Date; daysLeft: number } | null {
  for (let i = 1; i <= 30; i++) {
    const d = new Date(fromDate)
    d.setDate(fromDate.getDate() + i)
    const shift = getShiftForDate(d, startDate, startShift, overrides)
    if (shift === '비') {
      return { date: d, daysLeft: i }
    }
  }
  return null
}

export function getMonthShifts(
  year: number,
  month: number,
  startDate: string,
  startShift: ShiftType,
  overrides: Record<string, ShiftType>
): Record<string, ShiftType> {
  const result: Record<string, ShiftType> = {}
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const key = toDateString(date)
    result[key] = getShiftForDate(date, startDate, startShift, overrides)
  }
  return result
}

export { toDateString, isHoliday, isWeekend }
