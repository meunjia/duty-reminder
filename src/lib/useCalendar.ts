import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { CalendarData } from './types'
import { DEFAULT_CALENDAR_DATA } from './types'

const CALENDAR_ID_KEY = 'shift_calendar_id'

function getOrCreateCalendarId(): string {
  // 공유 링크 ?cal=XXXX 로 접속한 경우 해당 캘린더로 전환
  const params = new URLSearchParams(window.location.search)
  const calFromUrl = params.get('cal')
  if (calFromUrl) {
    localStorage.setItem(CALENDAR_ID_KEY, calFromUrl)
    return calFromUrl
  }
  let id = localStorage.getItem(CALENDAR_ID_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    localStorage.setItem(CALENDAR_ID_KEY, id)
  }
  return id
}

export function useCalendar() {
  const [calendarId] = useState(getOrCreateCalendarId)
  const [data, setData] = useState<CalendarData>(DEFAULT_CALENDAR_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = doc(db, 'calendars', calendarId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setData({ ...DEFAULT_CALENDAR_DATA, ...(snap.data() as CalendarData) })
      } else {
        setDoc(ref, DEFAULT_CALENDAR_DATA)
      }
      setLoading(false)
    })
    return unsub
  }, [calendarId])

  async function update(partial: Partial<CalendarData>) {
    const ref = doc(db, 'calendars', calendarId)
    await setDoc(ref, partial, { merge: true })
  }

  return { calendarId, data, loading, update }
}
