import { useMemo } from 'react'
import Holidays from 'date-holidays'
import type { ShiftType } from '../lib/types'
import { getShiftForDate } from '../utils/shiftEngine'
import ShiftBadge from './ShiftBadge'

const hd = new Holidays('KR')

interface CalendarPrintProps {
  year: number
  month: number
  startDate: string
  startShift: ShiftType
  overrides: Record<string, ShiftType>
  memos: Record<string, string[]>
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getHolidayName(date: Date): string | null {
  const r = hd.isHoliday(date)
  return r && r.length > 0 ? r[0].name : null
}

export default function CalendarPrint({ year, month, startDate, startShift, overrides, memos }: CalendarPrintProps) {
  const today = new Date()
  const todayKey = toKey(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    const startWeekday = firstDay.getDay()
    const cells: { date: Date; day: number; key: string; cur: boolean }[] = []

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i)
      cells.push({ date: d, day: d.getDate(), key: toKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), cur: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d)
      cells.push({ date, day: d, key: toKey(year, month, d), cur: true })
    }
    let next = 1
    while (cells.length % 7 !== 0) {
      const d = new Date(year, month, next++)
      cells.push({ date: d, day: d.getDate(), key: toKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), cur: false })
    }
    const result: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
    return result
  }, [year, month])

  const DAYS = ['일', '월', '화', '수', '목', '금', '토']
  const DAY_COLORS = ['#E24B4A', '#444', '#444', '#444', '#444', '#444', '#378ADD']

  return (
    <div style={{
      width: 390, background: '#ffffff',
      fontFamily: "'Noto Sans KR', sans-serif",
      padding: '16px 12px 20px',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{year}년 {month}월</span>
        <span style={{ fontSize: 11, color: '#bbb' }}>근무캘린더</span>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: DAY_COLORS[i], paddingBottom: 6 }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #f0f0f0' }}>
          {week.map((cell, di) => {
            const { date, day, key, cur } = cell
            const shift = getShiftForDate(date, startDate, startShift, overrides)
            const isToday = key === todayKey
            const holidayName = cur ? getHolidayName(date) : null
            const isHoliday = holidayName !== null
            const hasMemo = cur && (memos[key]?.length ?? 0) > 0
            const isOverridden = cur && !!overrides[key]

            const numColor = !cur ? '#d0d0d0'
              : di === 0 || isHoliday ? '#E24B4A'
              : di === 6 ? '#378ADD'
              : '#1a1a1a'

            return (
              <div key={di} style={{
                minHeight: 70,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '5px 2px 4px',
                position: 'relative',
                gap: 3,
              }}>
                {/* 날짜 + 공휴일 한 줄 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', paddingLeft: 3, paddingRight: 3, minHeight: 16 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {isToday && (
                      <span style={{ position: 'absolute', inset: '-3px -4px', background: '#378ADD', borderRadius: 5 }} />
                    )}
                    {isOverridden && (
                      <span style={{ position: 'absolute', top: 0, right: -5, width: 5, height: 5, borderRadius: '50%', background: '#E24B4A', zIndex: 2 }} />
                    )}
                    <span style={{ position: 'relative', fontSize: 12, fontWeight: 700, color: isToday ? '#fff' : numColor, lineHeight: 1, zIndex: 1 }}>
                      {day}
                    </span>
                  </div>
                  {isHoliday && (
                    <span style={{ fontSize: 8, color: '#E24B4A', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {holidayName}
                    </span>
                  )}
                </div>

                {/* 뱃지 */}
                {cur && <ShiftBadge shift={shift} size="sm" />}

                {/* 메모 → "개인일정" */}
                {hasMemo && (
                  <span style={{ fontSize: 9, color: '#378ADD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center', padding: '0 2px' }}>
                    개인일정
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
