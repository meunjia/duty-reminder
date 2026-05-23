import { useMemo } from 'react'
import Holidays from 'date-holidays'
import type { ShiftType } from '../lib/types'
import { getShiftForDate } from '../utils/shiftEngine'
import ShiftBadge from './ShiftBadge'

const hd = new Holidays('KR')

interface MonthCalendarProps {
  year: number
  month: number
  startDate: string
  startShift: ShiftType
  overrides: Record<string, ShiftType>
  memos: Record<string, string[]>
  onDayClick: (dateStr: string) => void
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getHolidayName(date: Date): string | null {
  const result = hd.isHoliday(date)
  if (!result || result.length === 0) return null
  return result[0].name
}

interface Cell {
  date: Date
  day: number
  key: string
  isCurrentMonth: boolean
}

export default function MonthCalendar({
  year, month, startDate, startShift, overrides, memos, onDayClick,
}: MonthCalendarProps) {
  const today = new Date()
  const todayKey = toKey(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    const startWeekday = firstDay.getDay()
    const cells: Cell[] = []

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i)
      cells.push({ date: d, day: d.getDate(), key: toKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), isCurrentMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d)
      cells.push({ date, day: d, key: toKey(year, month, d), isCurrentMonth: true })
    }
    let next = 1
    while (cells.length % 7 !== 0) {
      const d = new Date(year, month, next++)
      cells.push({ date: d, day: d.getDate(), key: toKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), isCurrentMonth: false })
    }

    const result: Cell[][] = []
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
    return result
  }, [year, month])

  return (
    <div className="w-full" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-0.5">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className="text-center py-1.5" style={{
            fontSize: 12, fontWeight: 600,
            color: i === 0 ? '#E24B4A' : i === 6 ? '#378ADD' : '#aaa',
          }}>{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7" style={{ borderTop: '1px solid #f0f0f0' }}>
          {week.map((cell, di) => {
            const { date, day, key, isCurrentMonth } = cell
            const shift = getShiftForDate(date, startDate, startShift, overrides)
            const isToday = key === todayKey
            const holidayName = isCurrentMonth ? getHolidayName(date) : null
            const isHolidayDay = holidayName !== null
            const dayMemos = isCurrentMonth ? (memos[key] ?? []) : []
            const isOverridden = isCurrentMonth && !!overrides[key]

            const dayColor = !isCurrentMonth
              ? '#d0d0d0'
              : di === 0 || isHolidayDay ? '#E24B4A'
              : di === 6 ? '#378ADD'
              : '#1a1a1a'

            return (
              <button
                key={di}
                onClick={() => isCurrentMonth && onDayClick(key)}
                style={{
                  minHeight: 70,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '5px 2px 4px',
                  position: 'relative',
                  background: 'transparent',
                  border: 'none',
                  cursor: isCurrentMonth ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                  gap: 3,
                  boxShadow: isToday ? 'inset 0 0 0 2px #378ADD' : undefined,
                  borderRadius: isToday ? 8 : undefined,
                }}
              >
                {/* 날짜 + 공휴일 이름 한 줄 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  width: '100%', paddingLeft: 4, paddingRight: 4,
                  minHeight: 16,
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <span style={{
                      position: 'relative', fontSize: 12, fontWeight: 700,
                      color: isToday ? '#378ADD' : dayColor, lineHeight: 1, zIndex: 1,
                    }}>{day}</span>
                    {/* 빨간 점 — 숫자 우상단 바짝 */}
                    {isOverridden && (
                      <span style={{
                        position: 'absolute', top: 0, right: -5,
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#E24B4A', zIndex: 2,
                      }} />
                    )}
                  </div>
                  {isHolidayDay && (
                    <span style={{
                      fontSize: 8, color: '#E24B4A', fontWeight: 500,
                      flex: 1, minWidth: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
                    }}>{holidayName}</span>
                  )}
                </div>

                {/* 뱃지 */}
                {isCurrentMonth && <ShiftBadge shift={shift} size="sm" />}

                {/* 메모들 — data-memo-group으로 묶어 캡처 시 처리 */}
                {dayMemos.length > 0 && (
                  <span data-memo-group style={{ display: 'contents' }}>
                    {dayMemos.slice(0, 2).map((m, idx) => (
                      <span key={idx} data-memo style={{
                        fontSize: 9, color: '#378ADD', lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', width: '100%',
                        textAlign: 'center', padding: '0 2px',
                      }}>{m}</span>
                    ))}
                    {dayMemos.length > 2 && (
                      <span data-memo-overflow style={{ fontSize: 8, color: '#aaa' }}>
                        +{dayMemos.length - 2}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
