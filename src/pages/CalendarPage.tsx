import { useState, useEffect } from 'react'
import type { ShiftType } from '../lib/types'
import { useCalendar } from '../lib/useCalendar'
import { getShiftForDate } from '../utils/shiftEngine'
import MonthCalendar from '../components/MonthCalendar'
import DayBottomSheet from '../components/DayBottomSheet'
import dog1 from '../assets/dog1.png'
import dog2 from '../assets/dog2.png'

export default function CalendarPage() {
  const { data, loading, update } = useCalendar()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [privacyMode, setPrivacyMode] = useState(false)

  const monthMemoKey = `${year}-${String(month).padStart(2, '0')}`
  const [localMonthMemo, setLocalMonthMemo] = useState('')
  useEffect(() => {
    setLocalMonthMemo(data.monthMemos[monthMemoKey] ?? '')
  }, [monthMemoKey, data.monthMemos[monthMemoKey]])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function getAutoShift(dateStr: string): ShiftType {
    const [y, m, d] = dateStr.split('-').map(Number)
    return getShiftForDate(new Date(y, m - 1, d), data.settings.startDate, data.settings.startShift, {})
  }

  async function handleSaveDay(dateStr: string, shift: ShiftType | null, memos: string[]) {
    const newOverrides = { ...data.overrides }
    const newMemos = { ...data.memos }
    if (shift === null) delete newOverrides[dateStr]
    else newOverrides[dateStr] = shift
    if (memos.length === 0) delete newMemos[dateStr]
    else newMemos[dateStr] = memos
    await update({ overrides: newOverrides, memos: newMemos })
  }

  function handleMonthMemoBlur() {
    const newMonthMemos = { ...data.monthMemos }
    if (localMonthMemo.trim()) newMonthMemos[monthMemoKey] = localMonthMemo.trim()
    else delete newMonthMemos[monthMemoKey]
    update({ monthMemos: newMonthMemos })
  }

  // 보안 모드: 메모를 모두 "개인일정"으로 치환
  const displayMemos: typeof data.memos = privacyMode
    ? Object.fromEntries(
        Object.entries(data.memos)
          .filter(([, v]) => v.length > 0)
          .map(([k]) => [k, ['개인일정']])
      )
    : data.memos

  const autoShift = selectedDate ? getAutoShift(selectedDate) : null
  const overrideShift = selectedDate ? (data.overrides[selectedDate] ?? null) : null
  const selectedMemos = selectedDate ? (data.memos[selectedDate] ?? []) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="text-gray-400 text-xl leading-none px-1">‹</button>
          <h1 className="text-2xl font-bold text-gray-900">
            {year}.{String(month).padStart(2, '0')}
          </h1>
          <button onClick={nextMonth} className="text-gray-400 text-xl leading-none px-1">›</button>
        </div>
        {/* 캡처 모드 토글 버튼 (강아지) */}
        <button
          onClick={() => setPrivacyMode(v => !v)}
          title={privacyMode ? '메모 보기로 돌아가기' : '캡처 모드 켜기'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img
            src={privacyMode ? dog2 : dog1}
            alt={privacyMode ? '메모 보기' : '캡처 모드'}
            style={{
              width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
              border: `2.5px solid ${privacyMode ? '#E24B4A' : '#e0e0e0'}`,
              display: 'block',
            }}
          />
        </button>
      </div>


      {/* 캘린더 영역 */}
      <div
        style={{
          background: '#ffffff', margin: '0 12px',
          borderRadius: 16, padding: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{year}년 {month}월</span>
          <span style={{ fontSize: 11, color: '#d1d5db' }}>근무캘린더</span>
        </div>
        <MonthCalendar
          year={year}
          month={month}
          startDate={data.settings.startDate}
          startShift={data.settings.startShift}
          overrides={data.overrides}
          memos={displayMemos}
          onDayClick={setSelectedDate}
        />
      </div>

      {/* 월별 메모 */}
      <div className="mx-3 mt-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-1.5">월별 메모</p>
        {privacyMode ? (
          <p className="text-sm text-gray-300 italic">개인일정</p>
        ) : (
          <textarea
            value={localMonthMemo}
            onChange={(e) => setLocalMonthMemo(e.target.value)}
            onBlur={handleMonthMemoBlur}
            placeholder="이번 달 메모를 입력하세요..."
            rows={2}
            className="w-full text-sm text-gray-700 resize-none outline-none placeholder-gray-300"
          />
        )}
      </div>

      <div className="h-4" />

      <DayBottomSheet
        dateStr={selectedDate}
        autoShift={autoShift}
        overrideShift={overrideShift}
        memos={selectedMemos}
        onClose={() => setSelectedDate(null)}
        onSave={handleSaveDay}
      />
    </div>
  )
}
