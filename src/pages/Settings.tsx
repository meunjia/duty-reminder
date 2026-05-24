import React, { useState, useEffect, useRef } from 'react'
import { useCalendar } from '../lib/useCalendar'
import type { CalendarSettings, SavedLocation } from '../lib/types'
import { geocodeAddress } from '../utils/geocode'
import { DEFAULT_SETTINGS } from '../lib/types'
import { enableNotifications, disableNotifications, getPermissionState, isNotificationsEnabled } from '../lib/fcm'

const SHIFT_KEYS = ['교1', '교2', '당', '전진배치', '중요업무'] as const
const FIRST_SHIFTS = ['교1', '교2', '당', '비'] as const

export default function Settings() {
  const { data, loading, calendarId, update } = useCalendar()
  const [s, setS] = useState<CalendarSettings>(merge(data.settings))
  const [autoSaved, setAutoSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [geocoding, setGeocoding] = useState<string | null>(null)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => getPermissionState())
  const [notifEnabled, setNotifEnabled] = useState(() => isNotificationsEnabled())
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifError, setNotifError] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => { setS(merge(data.settings)) }, [data.settings])

  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await update({ settings: s })
      setAutoSaved(true)
      setTimeout(() => setAutoSaved(false), 1500)
    }, 1000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [s])

  function setArr(key: typeof SHIFT_KEYS[number], val: string) {
    setS(p => ({ ...p, arrivalTimes: { ...p.arrivalTimes, [key]: val } }))
  }
  function setWake(key: typeof SHIFT_KEYS[number], val: string) {
    setS(p => ({ ...p, wakeTimes: { ...p.wakeTimes, [key]: val } }))
  }
  function setRet(key: typeof SHIFT_KEYS[number], val: string) {
    setS(p => ({ ...p, retireTimes: { ...p.retireTimes, [key]: val } }))
  }

  async function searchAddress(field: 'workplace' | string, address: string) {
    if (!address.trim()) return
    setGeocoding(field)
    const result = await geocodeAddress(address)
    setGeocoding(null)
    if (!result) { alert('주소를 찾을 수 없습니다. 더 자세히 입력해보세요.'); return }
    if (field === 'workplace') {
      setS(p => ({ ...p, workplaceLat: result.lat, workplaceLng: result.lng }))
    } else {
      setS(p => ({ ...p, locations: p.locations.map(l => l.id === field ? { ...l, lat: result.lat, lng: result.lng } : l) }))
    }
  }

  function addLocation() {
    if (s.locations.length >= 3) return
    const loc: SavedLocation = { id: Date.now().toString(), name: '', address: '', lat: 0, lng: 0 }
    setS(p => ({ ...p, locations: [...p.locations, loc] }))
  }

  function updateLocation(id: string, patch: Partial<SavedLocation>) {
    setS(p => ({ ...p, locations: p.locations.map(l => l.id === id ? { ...l, ...patch } : l) }))
  }

  function removeLocation(id: string) {
    setS(p => ({ ...p, locations: p.locations.filter(l => l.id !== id) }))
  }

  function handleCopyLink() {
    const url = `${window.location.origin}?cal=${calendarId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><span style={{ color: '#aaa' }}>불러오는 중...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 16px 80px', fontFamily: "'Noto Sans KR', sans-serif" }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: 0 }}>설정</h1>
        {autoSaved && <span style={{ fontSize: 12, color: '#2eab6c', fontWeight: 600 }}>✓ 저장됨</span>}
      </div>

      {/* 근무 패턴 */}
      <Card title="근무 패턴">
        <Row label="기준 시작일">
          <input type="date" value={s.startDate} onChange={e => setS(p => ({ ...p, startDate: e.target.value }))} style={inputSt} />
        </Row>
        <Row label="첫 근무 유형">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FIRST_SHIFTS.map(sh => (
              <button key={sh} onClick={() => setS(p => ({ ...p, startShift: sh }))} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: `2px solid ${s.startShift === sh ? '#0C447C' : '#e0e0e0'}`,
                background: s.startShift === sh ? '#0C447C' : '#fff',
                color: s.startShift === sh ? '#fff' : '#555',
              }}>{sh}</button>
            ))}
          </div>
        </Row>
      </Card>

      {/* 근무별 시간 설정 */}
      <Card title="근무별 시간 설정">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '8px 6px', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>근무</span>
          <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textAlign: 'center' }}>도착목표</span>
          <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textAlign: 'center' }}>기상</span>
          <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textAlign: 'center' }}>퇴근</span>
          {SHIFT_KEYS.map(sh => (
            <React.Fragment key={sh}>
              <span style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{sh}</span>
              <input type="time" value={s.arrivalTimes[sh]} onChange={e => setArr(sh, e.target.value)}
                style={{ ...inputSt, width: '100%', textAlign: 'center', padding: '6px 2px' }} />
              <input type="time" value={s.wakeTimes?.[sh] ?? ''} onChange={e => setWake(sh, e.target.value)}
                style={{ ...inputSt, width: '100%', textAlign: 'center', padding: '6px 2px' }} />
              <input type="time" value={s.retireTimes?.[sh] ?? ''} onChange={e => setRet(sh, e.target.value)}
                style={{ ...inputSt, width: '100%', textAlign: 'center', padding: '6px 2px' }} />
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* 회사 위치 */}
      <Card title="회사 위치">
        <Row label="회사 이름">
          <input value={s.workplaceName} onChange={e => setS(p => ({ ...p, workplaceName: e.target.value }))}
            placeholder="예: 광화문사옥" style={{ ...inputSt, flex: 1, minWidth: 0 }} />
        </Row>
        <AddressRow
          value={s.workplaceAddress}
          onChange={v => setS(p => ({ ...p, workplaceAddress: v }))}
          onSearch={() => searchAddress('workplace', s.workplaceAddress)}
          loading={geocoding === 'workplace'}
          confirmed={!!s.workplaceLat}
        />
      </Card>

      {/* 추가 출발지 */}
      <Card title={`추가 출발지 (${s.locations.length}/3)`}>
        {s.locations.map(loc => {
          const isDefault = s.defaultLocationId === loc.id
          return (
            <div key={loc.id} style={{ border: `1.5px solid ${isDefault ? '#0C447C' : '#f0f0f0'}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={loc.name} onChange={e => updateLocation(loc.id, { name: e.target.value })}
                  placeholder="별명 (예: 집, 부모님댁)"
                  style={{ ...inputSt, flex: 1, minWidth: 0 }} />
                <button
                  onClick={() => setS(p => ({ ...p, defaultLocationId: p.defaultLocationId === loc.id ? undefined : loc.id }))}
                  title={isDefault ? '기본 출발지 해제' : '기본 출발지로 설정'}
                  style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 8, border: `1.5px solid ${isDefault ? '#0C447C' : '#e0e0e0'}`, background: isDefault ? '#0C447C' : '#fff', color: isDefault ? '#fff' : '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {isDefault ? '★ 기본' : '☆'}
                </button>
                <button onClick={() => {
                  if (s.defaultLocationId === loc.id) setS(p => ({ ...p, defaultLocationId: undefined }))
                  removeLocation(loc.id)
                }} style={{ color: '#E24B4A', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
              {isDefault && <p style={{ fontSize: 11, color: '#0C447C', fontWeight: 600, margin: 0 }}>★ 홈화면에서 자동 선택</p>}
              <AddressRow
                value={loc.address}
                onChange={v => updateLocation(loc.id, { address: v })}
                onSearch={() => searchAddress(loc.id, loc.address)}
                loading={geocoding === loc.id}
                confirmed={loc.lat !== 0}
              />
            </div>
          )
        })}
        {s.locations.length < 3 && (
          <button onClick={addLocation} style={{
            width: '100%', padding: 10, borderRadius: 12,
            border: '2px dashed #e0e0e0', background: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer',
          }}>+ 출발지 추가</button>
        )}
      </Card>

      {/* 알림 설정 */}
      <Card title="알림 설정">
        {notifPerm === 'denied' ? (
          <p style={{ fontSize: 13, color: '#E24B4A', margin: 0 }}>기기 설정에서 알림을 허용해주세요.</p>
        ) : notifPerm !== 'granted' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>당직 리마인더를 받으려면 알림을 허용하세요.</p>
            <button
              onClick={async () => {
                setNotifLoading(true)
                setNotifError('')
                const result = await enableNotifications(calendarId)
                setNotifLoading(false)
                if (result === 'ok') { setNotifPerm('granted'); setNotifEnabled(true) }
                else if (result === 'denied') setNotifPerm('denied')
                else setNotifError(result)
              }}
              disabled={notifLoading}
              style={{ ...btnSt, background: notifLoading ? '#aaa' : '#0C447C', padding: 12 }}
            >{notifLoading ? '처리 중...' : '🔔 알림 허용하기'}</button>
            {notifError && (
              <p style={{ fontSize: 11, color: '#E24B4A', margin: 0, wordBreak: 'break-all' }}>
                {notifError}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 2px' }}>당직 리마인더</p>
                <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>당일 17:50 · 익일 08:10</p>
              </div>
              <button
                onClick={async () => {
                  setNotifLoading(true)
                  if (notifEnabled) {
                    await disableNotifications(calendarId)
                    setNotifEnabled(false)
                  } else {
                    const result = await enableNotifications(calendarId)
                    if (result === 'ok') setNotifEnabled(true)
                  }
                  setNotifLoading(false)
                }}
                disabled={notifLoading}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: notifEnabled ? '#2eab6c' : '#ddd',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  left: notifEnabled ? 23 : 3,
                }} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 공유 */}
      <Card title="공유">
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>링크를 가진 사람 누구나 이 캘린더를 수정할 수 있습니다.</p>
        <button onClick={handleCopyLink} style={{ ...btnSt, width: '100%', padding: 12 }}>
          {copied ? '✓ 복사됨' : '🔗 공유 링크 복사'}
        </button>
        <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', margin: 0 }}>캘린더 ID: {calendarId}</p>
      </Card>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc' }}>Made by Sid</p>
    </div>
  )
}

function AddressRow({ value, onChange, onSearch, loading, confirmed }: {
  value: string; onChange: (v: string) => void
  onSearch: () => void; loading: boolean; confirmed: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="주소 입력 후 검색"
          style={{ ...inputSt, flex: 1, minWidth: 0 }}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          style={{ ...btnSt, flexShrink: 0, padding: '7px 14px', background: loading ? '#aaa' : '#0C447C' }}
        >{loading ? '...' : '검색'}</button>
      </div>
      {confirmed && <p style={{ fontSize: 11, color: '#2eab6c', margin: '4px 0 0' }}>✓ 위치 확인됨</p>}
    </div>
  )
}

function merge(raw: Partial<CalendarSettings>): CalendarSettings {
  return {
    ...DEFAULT_SETTINGS, ...raw,
    arrivalTimes: { ...DEFAULT_SETTINGS.arrivalTimes, ...(raw.arrivalTimes ?? {}) },
    wakeTimes: { ...DEFAULT_SETTINGS.wakeTimes, ...(raw.wakeTimes ?? {}) },
    retireTimes: { ...DEFAULT_SETTINGS.retireTimes, ...(raw.retireTimes ?? {}) },
    locations: raw.locations ?? [],
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.5, margin: 0 }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 14, color: '#333', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

const inputSt: React.CSSProperties = {
  border: '1px solid #e8e8e8', borderRadius: 10,
  padding: '7px 10px', fontSize: 13, outline: 'none',
  color: '#333', background: '#fafafa',
}
const btnSt: React.CSSProperties = {
  borderRadius: 10, border: 'none',
  background: '#0C447C', color: '#fff',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 16px',
  whiteSpace: 'nowrap',
}
