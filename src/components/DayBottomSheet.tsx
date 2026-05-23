import { useState, useEffect, useRef } from 'react'
import type { ShiftType } from '../lib/types'
import ShiftBadge from './ShiftBadge'

const SHIFT_OPTIONS: ShiftType[] = ['교1', '교2', '당', '비', '전진배치', '중요업무']

interface DayBottomSheetProps {
  dateStr: string | null
  autoShift: ShiftType | null
  overrideShift: ShiftType | null
  memos: string[]
  onClose: () => void
  onSave: (dateStr: string, shift: ShiftType | null, memos: string[]) => void
}

function formatDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${Number(m)}월 ${Number(d)}일 ${days[date.getDay()]}요일`
}

export default function DayBottomSheet({
  dateStr, autoShift, overrideShift, memos: initialMemos, onClose, onSave,
}: DayBottomSheetProps) {
  const [tab, setTab] = useState<'shift' | 'memo'>('memo')
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null)
  const [memos, setMemos] = useState<string[]>([])
  const [newMemo, setNewMemo] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!dateStr) return
    setSelectedShift(overrideShift)
    setMemos(initialMemos)
    setNewMemo('')
    setEditIdx(null)
    setTab('memo')
  }, [dateStr])

  if (!dateStr) return null

  const displayShift = selectedShift ?? autoShift ?? '비'
  const isOverridden = selectedShift !== null

  // 즉시 저장 헬퍼
  function save(shift: ShiftType | null, nextMemos: string[]) {
    onSave(dateStr!, shift, nextMemos)
  }

  function selectShift(s: ShiftType | null) {
    setSelectedShift(s)
    save(s, memos)
  }

  function addMemo() {
    const text = newMemo.trim()
    if (!text) return
    let next: string[]
    if (editIdx !== null) {
      next = [...memos]
      next[editIdx] = text
      setEditIdx(null)
    } else {
      next = [...memos, text]
    }
    setMemos(next)
    setNewMemo('')
    save(selectedShift, next)
  }

  function deleteMemo(idx: number) {
    const next = memos.filter((_, i) => i !== idx)
    setMemos(next)
    if (editIdx === idx) { setEditIdx(null); setNewMemo('') }
    save(selectedShift, next)
  }

  function startEdit(idx: number) {
    setEditIdx(idx)
    setNewMemo(memos[idx])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <>
      {/* 딤 — z-[100]으로 탭바 위에 */}
      <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose} />

      {/* 시트 */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl flex flex-col z-[101]"
        style={{ maxHeight: '60vh' }}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* 날짜 + 현재 근무 */}
        <div className="px-5 pt-2 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-base font-bold text-gray-900 mb-2">{formatDateStr(dateStr)}</p>
          <div className="flex items-center gap-2">
            <ShiftBadge shift={displayShift} size="lg" />
            {isOverridden
              ? <span className="text-xs text-[#E24B4A] font-semibold">수동 변경됨</span>
              : <span className="text-xs text-gray-400">자동 (패턴)</span>
            }
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(['memo', 'shift'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={{
                color: tab === t ? '#0C447C' : '#aaa',
                borderBottom: tab === t ? '2px solid #0C447C' : '2px solid transparent',
              }}
            >
              {t === 'shift' ? '근무' : '메모'}
            </button>
          ))}
        </div>

        {/* 근무 탭 */}
        {tab === 'shift' && (
          <div className="px-5 py-4 overflow-y-auto flex-1">
            <div className="flex flex-wrap gap-3">
              {/* 자동 */}
              <button
                onClick={() => selectShift(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: `2px solid ${selectedShift === null ? '#378ADD' : '#e0e0e0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: selectedShift === null ? '#378ADD' : '#aaa',
                }}>자동</span>
                {selectedShift === null && (
                  <span style={{ fontSize: 10, color: '#378ADD', fontWeight: 600 }}>현재</span>
                )}
              </button>

              {SHIFT_OPTIONS.map((s) => {
                const isSelected = selectedShift === s
                const isAuto = autoShift === s && selectedShift === null
                return (
                  <button
                    key={s}
                    onClick={() => selectShift(s)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 48, height: 48, borderRadius: '50%',
                      border: isSelected ? '2px solid #378ADD' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ShiftBadge shift={s} size="md" />
                    </span>
                    {isSelected && <span style={{ fontSize: 10, color: '#378ADD', fontWeight: 600 }}>선택</span>}
                    {isAuto && <span style={{ fontSize: 10, color: '#aaa' }}>본근무</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 메모 탭 */}
        {tab === 'memo' && (
          <div className="px-5 py-4 overflow-y-auto flex-1 flex flex-col gap-2">
            {/* 메모 목록 */}
            {memos.length === 0 && (
              <p className="text-sm text-gray-300 text-center py-2">메모가 없습니다</p>
            )}
            {memos.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-sm text-gray-700 leading-snug">{m}</span>
                <button onClick={() => startEdit(idx)} className="text-[#378ADD] text-xs font-semibold shrink-0">수정</button>
                <button onClick={() => deleteMemo(idx)} className="text-gray-300 text-lg leading-none shrink-0">×</button>
              </div>
            ))}

            {/* 입력창 */}
            <div className="flex gap-2 mt-1">
              <input
                ref={inputRef}
                type="text"
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMemo()}
                placeholder="메모 입력..."
                maxLength={30}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#378ADD]"
              />
              <button
                onClick={addMemo}
                disabled={!newMemo.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0"
                style={{ background: newMemo.trim() ? '#0C447C' : '#ccc' }}
              >
                {editIdx !== null ? '수정' : '추가'}
              </button>
            </div>
          </div>
        )}

        {/* 하단 여백 (탭바 높이만큼) */}
        <div className="flex-shrink-0" style={{ height: 'env(safe-area-inset-bottom, 8px)', minHeight: 8 }} />
      </div>
    </>
  )
}
