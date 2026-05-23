import { useState, useEffect } from 'react'
import { useCalendar } from '../lib/useCalendar'
import { getShiftForDate } from '../utils/shiftEngine'
import { fetchWeather, getOutfitShort, type WeatherData } from '../utils/weather'
import { getTmapDuration } from '../utils/geocode'
import type { ShiftType, Todo } from '../lib/types'
import { DEFAULT_SETTINGS } from '../lib/types'
import ShiftBadge from '../components/ShiftBadge'

type Tab = 'home' | 'calendar' | 'settings'
interface HomeProps { onNavigate: (tab: Tab) => void }

const F = "'Noto Sans KR', sans-serif"

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function subtractMins(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = ((h * 60 + m - mins) % 1440 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function addMins(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = ((h * 60 + m + mins) % 1440 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function nowTimeStr(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

// 가로 시간 컬럼 — 모든 시간 동일 크기, dimmed는 opacity만 낮춤
function TimeBlock({ label, value, sub, color, dimmed, flex }: {
  label: string; value: string | null; sub?: string; color?: string; dimmed?: boolean; flex?: boolean
}) {
  return (
    <div style={{ flex: flex ? 1 : undefined, textAlign: 'center' }}>
      <p style={{ fontSize: 13, opacity: 0.92, margin: '0 0 6px', fontWeight: 700 }}>{label}</p>
      <p style={{
        fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1,
        color: color ?? '#fff', opacity: value ? (dimmed ? 0.68 : 1) : 0.28,
      }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: 11, opacity: 0.75, margin: '5px 0 0' }}>{sub}</p>}
    </div>
  )
}

// 날씨 뱃지 행 (옷차림 + extras) — 작게
function WeatherBadges({ w }: { w: WeatherData }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
      <span style={{ background: 'rgba(255,255,255,0.22)', fontSize: 11, borderRadius: 99, padding: '3px 9px', fontWeight: 600 }}>
        {getOutfitShort(w.temp)}
      </span>
      {w.extras.map((ex, i) => (
        <span key={i} style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, borderRadius: 99, padding: '3px 9px' }}>
          {ex.label}
        </span>
      ))}
    </div>
  )
}

export default function Home({ onNavigate: _onNavigate }: HomeProps) {
  const { data, loading, update } = useCalendar()
  const [weather, setWeather] = useState<{ today: WeatherData; tomorrow: WeatherData } | null>(null)
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null)
  const [commuteMin, setCommuteMin] = useState<number | null>(null)
  const [commuteLoading, setCommuteLoading] = useState(false)
  const [returnCommuteMin, setReturnCommuteMin] = useState<number | null>(null)
  const [nowStr, setNowStr] = useState(nowTimeStr)

  useEffect(() => {
    const id = setInterval(() => setNowStr(nowTimeStr()), 60000)
    return () => clearInterval(id)
  }, [])

  const today = new Date()
  const todayKey = toKey(today)
  const settings = {
    ...DEFAULT_SETTINGS, ...data.settings,
    arrivalTimes: { ...DEFAULT_SETTINGS.arrivalTimes, ...(data.settings.arrivalTimes ?? {}) },
    wakeTimes: { ...DEFAULT_SETTINGS.wakeTimes, ...(data.settings.wakeTimes ?? {}) },
    retireTimes: { ...DEFAULT_SETTINGS.retireTimes, ...(data.settings.retireTimes ?? {}) },
    locations: data.settings.locations ?? [],
  }
  const { overrides, memos, todos } = data

  const yesterday = addDays(today, -1)
  const todayShift: ShiftType = getShiftForDate(today, settings.startDate, settings.startShift, overrides)
  const yesterdayShift: ShiftType = getShiftForDate(yesterday, settings.startDate, settings.startShift, overrides)
  const tomorrow = addDays(today, 1)
  const tomorrowShift: ShiftType = getShiftForDate(tomorrow, settings.startDate, settings.startShift, overrides)
  const isPostNightShift = todayShift === '비' && yesterdayShift === '당'

  const todayArrival = settings.arrivalTimes[todayShift as keyof typeof settings.arrivalTimes] ?? '09:00'
  const tomorrowArrival = settings.arrivalTimes[tomorrowShift as keyof typeof settings.arrivalTimes] ?? '09:00'
  const todayWake = settings.wakeTimes[todayShift as keyof typeof settings.wakeTimes] ?? null
  const tomorrowWake = settings.wakeTimes[tomorrowShift as keyof typeof settings.wakeTimes] ?? null

  const isBeforeEleven = today.getHours() < 11
  const needsDeparture = (s: ShiftType) => s !== '비'

  const todayDeparture = commuteMin !== null && needsDeparture(todayShift) ? subtractMins(todayArrival, commuteMin) : null
  const tomorrowDeparture = commuteMin !== null && needsDeparture(tomorrowShift) ? subtractMins(tomorrowArrival, commuteMin) : null

  const retireTime: string | null = (todayShift !== '비' && todayShift !== '당')
    ? (settings.retireTimes[todayShift as keyof typeof settings.retireTimes] ?? null)
    : null
  const retireHomeArrival = retireTime !== null && returnCommuteMin !== null ? addMins(retireTime, returnCommuteMin) : null
  const nowHomeArrival = returnCommuteMin !== null ? addMins(nowStr, returnCommuteMin) : null

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i)
    return {
      date: d, key: toKey(d),
      shift: getShiftForDate(d, settings.startDate, settings.startShift, overrides),
      label: ['월', '화', '수', '목', '금', '토', '일'][((d.getDay() + 6) % 7)],
    }
  })

  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${DOW[today.getDay()]}요일`

  useEffect(() => {
    const lat = settings.workplaceLat ?? 37.5665
    const lng = settings.workplaceLng ?? 126.9780
    fetchWeather(lat, lng).then(setWeather).catch(() => {})
  }, [settings.workplaceLat, settings.workplaceLng])

  const validLocs = settings.locations.filter(l => l.lat !== 0)

  useEffect(() => {
    if (loading) return
    const defId = settings.defaultLocationId
    if (defId && validLocs.find(l => l.id === defId)) {
      setSelectedLocId(defId)
    } else if (!defId) {
      setSelectedLocId(null)
    }
  }, [loading, settings.defaultLocationId])

  useEffect(() => {
    if (!selectedLocId || !settings.workplaceLat) { setCommuteMin(null); return }
    const loc = validLocs.find(l => l.id === selectedLocId)
    if (!loc) return
    setCommuteLoading(true)
    const estimatedDep = subtractMins(todayArrival, 60)
    getTmapDuration({ originLat: loc.lat, originLng: loc.lng, destLat: settings.workplaceLat!, destLng: settings.workplaceLng!, departureTime: estimatedDep })
      .then(min => { setCommuteMin(min); setCommuteLoading(false) })
      .catch(() => { setCommuteMin(null); setCommuteLoading(false) })
  }, [selectedLocId, todayArrival, settings.workplaceLat, settings.workplaceLng])

  // 퇴근 방향 소요시간 (회사→집): 당직/당직다음비번은 09:00 기준, 일반 오후는 퇴근시간 기준
  useEffect(() => {
    const isNightShift = todayShift === '당' || isPostNightShift
    const isRegularAfternoon = !isBeforeEleven && todayShift !== '비' && todayShift !== '당'
    if ((!isNightShift && !isRegularAfternoon) || !selectedLocId || !settings.workplaceLat) {
      setReturnCommuteMin(null); return
    }
    const loc = validLocs.find(l => l.id === selectedLocId)
    if (!loc) return
    const deptTime = isNightShift ? '09:00' : (retireTime ?? '18:00')
    getTmapDuration({ originLat: settings.workplaceLat!, originLng: settings.workplaceLng!, destLat: loc.lat, destLng: loc.lng, departureTime: deptTime })
      .then(setReturnCommuteMin)
      .catch(() => setReturnCommuteMin(null))
  }, [todayShift, isPostNightShift, isBeforeEleven, retireTime, selectedLocId, settings.workplaceLat, settings.workplaceLng])

  function openAlarm() { window.location.href = 'clock://' }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><span style={{ color: '#aaa', fontFamily: F }}>불러오는 중...</span></div>

  const todayW = weather?.today
  const tmrW = weather?.tomorrow

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 12px 80px', background: '#eeecea', minHeight: '100svh' }}>

      {/* ── 히어로 카드 ── */}
      <div style={{ background: 'linear-gradient(165deg, #0a3d73 0%, #1260aa 55%, #176dc4 100%)', borderRadius: 22, padding: '16px 16px 14px', color: '#fff' }}>

        {/* 날짜 — 상단 단독, 뱃지 없음 */}
        <p style={{ fontSize: 13, fontWeight: 500, opacity: 0.7, margin: '0 0 10px' }}>{dateLabel}</p>

        {/* ── 오늘 패널 ── */}
        <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>

          {/* 헤더행: [뱃지] "오늘"  |  날씨아이콘 기온 ↑↓ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShiftBadge shift={todayShift} size="md" />
              <span style={{ fontSize: 17, fontWeight: 800, opacity: 1 }}>오늘</span>
            </div>
            {todayW ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{todayW.icon}</span>
                  <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{todayW.temp}°</span>
                </div>
                <p style={{ fontSize: 12, opacity: 0.58, margin: '3px 0 0' }}>↑{todayW.tempMax}° ↓{todayW.tempMin}°</p>
              </div>
            ) : (
              <span style={{ fontSize: 11, opacity: 0.3 }}>날씨 로딩...</span>
            )}
          </div>

          {/* 뱃지행: 옷차림 + extras */}
          {todayW && <WeatherBadges w={todayW} />}

          {/* 구분선 */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 0 12px' }} />

          {/* 상태행 */}
          {isPostNightShift && isBeforeEleven ? (
            // 어제 당직 + 비번 + 오전: 09:00 퇴근 정보
            <div style={{ display: 'flex' }}>
              <TimeBlock label="🌙 퇴근" value="09:00" color="#a5f3fc" flex />
              <TimeBlock
                label="🏠 귀가 도착"
                value={returnCommuteMin !== null ? addMins('09:00', returnCommuteMin) : null}
                sub={returnCommuteMin !== null ? `소요 ${returnCommuteMin}분` : undefined}
                color="#a5f3fc"
                flex
              />
            </div>
          ) : todayShift === '비' ? (
            <p style={{ fontSize: 19, fontWeight: 700, opacity: 0.88, margin: 0 }}>🏖️ 비번</p>
          ) : isBeforeEleven ? (
            // 오전: 기상 + 출발 (당직이면 익일퇴근 추가)
            <div style={{ display: 'flex' }}>
              {todayWake && <TimeBlock label="⏰ 기상" value={todayWake} flex />}
              <TimeBlock
                label={`🚗 출발${commuteMin ? ` · ${commuteMin}분` : ''}`}
                value={commuteLoading ? null : todayDeparture}
                flex
              />
              {todayShift === '당' && (
                <TimeBlock
                  label="🌙 익일 퇴근"
                  value="09:00"
                  sub={returnCommuteMin !== null ? `소요 ${returnCommuteMin}분` : undefined}
                  color="#a5f3fc"
                  flex
                />
              )}
            </div>
          ) : todayShift === '당' ? (
            // 오후 당직: 내일 퇴근 + 귀가 도착
            <div style={{ display: 'flex' }}>
              <TimeBlock label="🌙 내일 퇴근" value="09:00" color="#a5f3fc" flex />
              <TimeBlock
                label="🏠 귀가 도착"
                value={returnCommuteMin !== null ? addMins('09:00', returnCommuteMin) : null}
                sub={returnCommuteMin !== null ? `소요 ${returnCommuteMin}분` : undefined}
                color="#a5f3fc"
                flex
              />
            </div>
          ) : (
            // 오후 일반: 퇴근 예정 시간 + 지금 출발시
            <div style={{ display: 'flex' }}>
              <TimeBlock
                label="🏢 퇴근 예정"
                value={retireTime}
                sub={retireHomeArrival ? `도착 ${retireHomeArrival}` : undefined}
                flex
              />
              <TimeBlock
                label="🚗 지금 출발"
                value={nowStr}
                sub={nowHomeArrival ? `도착 ${nowHomeArrival}` : undefined}
                flex
              />
            </div>
          )}
        </div>

        {/* ── 내일 패널 (button → 알람앱) ── */}
        <button
          onClick={openAlarm}
          style={{ width: '100%', background: 'rgba(0,10,40,0.30)', borderRadius: 16, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', textAlign: 'left', color: '#fff', marginBottom: 10, boxSizing: 'border-box' }}
        >
          {/* 헤더행: [뱃지] "내일 · 요일"  |  날씨아이콘 기온 ↑↓  탭→알람 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShiftBadge shift={tomorrowShift} size="md" />
              <span style={{ fontSize: 17, fontWeight: 800, opacity: 1 }}>내일 · {DOW[tomorrow.getDay()]}요일</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                {tmrW ? (
                  <>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{tmrW.icon}</span>
                    <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{tmrW.temp}°</span>
                  </>
                ) : (
                  <span style={{ fontSize: 11, opacity: 0.3 }}>날씨 로딩...</span>
                )}
              </div>
              {tmrW && <p style={{ fontSize: 11, opacity: 0.55, margin: '3px 0 0' }}>↑{tmrW.tempMax}° ↓{tmrW.tempMin}°</p>}
              <span style={{ fontSize: 10, opacity: 0.28 }}>탭→알람</span>
            </div>
          </div>

          {/* 뱃지행 */}
          {tmrW && <WeatherBadges w={tmrW} />}

          {/* 구분선 */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '0 0 12px' }} />

          {/* 시간행 — 비번이면 텍스트, 아니면 가로 3-컬럼 */}
          {tomorrowShift === '비' ? (
            <p style={{ fontSize: 19, fontWeight: 700, opacity: 0.88, margin: 0 }}>🏖️ 비번</p>
          ) : (
            <div style={{ display: 'flex' }}>
              {tomorrowWake && <TimeBlock label="⏰ 기상" value={tomorrowWake} flex />}
              <TimeBlock
                label={`🚗 출발${commuteMin ? ` · ${commuteMin}분` : ''}`}
                value={tomorrowDeparture}
                flex
              />
              <TimeBlock label="🏢 도착목표" value={tomorrowArrival} flex />
            </div>
          )}
        </button>

        {/* ── 출발지 탭 ── */}
        {validLocs.length > 0 && (
          <div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 0 10px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>출발지</span>
              {validLocs.map(loc => {
                const isSelected = selectedLocId === loc.id
                const isDefault = settings.defaultLocationId === loc.id
                return (
                  <button key={loc.id} onClick={() => setSelectedLocId(isSelected ? null : loc.id)} style={{
                    flexShrink: 0, padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.22)'}`,
                    background: isSelected ? '#fff' : 'transparent',
                    color: isSelected ? '#0C447C' : '#fff',
                  }}>
                    {isDefault && !isSelected ? '★ ' : ''}{loc.name || '위치'}
                  </button>
                )
              })}
              {selectedLocId && (
                <span style={{ fontSize: 13, opacity: 0.85, marginLeft: 2, fontWeight: 600 }}>
                  {commuteLoading ? '계산 중...' : commuteMin !== null ? `${commuteMin}분 소요` : '계산 실패'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 이번 주 ── */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '13px 13px' }}>
        <p style={{ fontSize: 10, color: '#c0bdb8', fontWeight: 700, margin: '0 0 10px 2px', letterSpacing: 0.5 }}>이번 주</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {weekDays.map(({ date, key, shift, label }) => {
            const isToday = key === todayKey
            const dayMemos = memos[key] ?? []
            const dow = date.getDay()
            return (
              <div key={key} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                paddingTop: 3, paddingBottom: 3,
                boxShadow: isToday ? 'inset 0 0 0 1.5px #378ADD' : undefined,
                borderRadius: isToday ? 8 : undefined,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? '#378ADD' : dow === 0 ? '#E24B4A' : dow === 6 ? '#378ADD' : '#ccc' }}>{label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: isToday ? '#378ADD' : dow === 0 ? '#E24B4A' : dow === 6 ? '#378ADD' : '#555',
                  width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{date.getDate()}</span>
                <ShiftBadge shift={shift} size="sm" />
                {dayMemos[0] && <span style={{ fontSize: 7, color: '#378ADD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 36, textAlign: 'center' }}>{dayMemos[0]}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 아 맞다! ── */}
      <TodoSection todos={todos} update={update} />
    </div>
  )
}

function TodoSection({ todos, update }: { todos: Todo[]; update: (p: any) => void }) {
  const [text, setText] = useState('')
  const [showInput, setShowInput] = useState(false)

  function addTodo() {
    if (!text.trim()) return
    update({ todos: [...todos, { id: Date.now().toString(), text: text.trim(), done: false }] })
    setText(''); setShowInput(false)
  }
  function toggle(id: string) { update({ todos: todos.map(t => t.id === id ? { ...t, done: !t.done } : t) }) }
  function del(id: string) { update({ todos: todos.filter(t => t.id !== id) }) }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '13px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111', fontFamily: F }}>💡 아 맞다!</span>
        <button onClick={() => setShowInput(v => !v)}
          style={{ background: '#f0f0f0', border: 'none', borderRadius: 20, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: '#666', cursor: 'pointer' }}>
          + 추가
        </button>
      </div>
      {todos.length === 0 && !showInput && (
        <p style={{ fontSize: 12, color: '#ccc', textAlign: 'center', padding: '4px 0', fontFamily: F }}>잊지 말 것을 추가하세요</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {todos.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => toggle(t.id)} style={{ width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: t.done ? '#2eab6c' : '#e8e8e8' }} />
            <span style={{ flex: 1, fontSize: 13, color: t.done ? '#bbb' : '#333', textDecoration: t.done ? 'line-through' : 'none', fontFamily: F }}>{t.text}</span>
            <button onClick={() => del(t.id)} style={{ color: '#ddd', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
      {showInput && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="할 일 입력..."
            style={{ flex: 1, border: '1px solid #e5e5e5', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: F }} />
          <button onClick={addTodo} disabled={!text.trim()}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: text.trim() ? '#0C447C' : '#ccc', color: '#fff', fontSize: 13, fontWeight: 700 }}>추가</button>
        </div>
      )}
    </div>
  )
}
