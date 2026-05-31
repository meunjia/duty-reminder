import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCalendarContext } from '../../lib/CalendarContext'
import type { ChatProfile, ChatMessage } from './types'

function todayNoonTs() {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

export function useChatData() {
  const { calendarId } = useCalendarContext()
  const [profiles, setProfiles] = useState<ChatProfile[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const msgsRef = useRef<ChatMessage[]>([])
  const profsRef = useRef<ChatProfile[]>([])

  useEffect(() => {
    const ref = doc(db, 'calendars', calendarId)
    return onSnapshot(ref, (snap) => {
      const d = snap.data() as Record<string, unknown>
      const profs = (d?.chatProfiles ?? []) as ChatProfile[]
      const msgs = (d?.chatMessages ?? []) as ChatMessage[]
      const lra = (d?.chatLastResetAt ?? 0) as number

      setProfiles(profs)
      setMessages(msgs)
      msgsRef.current = msgs
      profsRef.current = profs
      setLoading(false)

      // Noon auto-reset
      const noon = todayNoonTs()
      if (Date.now() >= noon && lra < noon) {
        setDoc(ref, { chatMessages: [], chatLastResetAt: Date.now() }, { merge: true })
      }
    })
  }, [calendarId])

  async function sendMessage(profile: ChatProfile, text: string) {
    const ref = doc(db, 'calendars', calendarId)
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      profileId: profile.id,
      profileName: profile.name,
      text: text.trim(),
      timestamp: Date.now(),
      notifyAt: Date.now() + 60_000,
      notified: false,
    }
    await setDoc(ref, { chatMessages: [...msgsRef.current, newMsg] }, { merge: true })
  }

  async function clearMessages() {
    const ref = doc(db, 'calendars', calendarId)
    await setDoc(ref, { chatMessages: [], chatLastResetAt: Date.now() }, { merge: true })
  }

  async function addProfile(name: string) {
    if (!name.trim()) return
    const ref = doc(db, 'calendars', calendarId)
    const p: ChatProfile = { id: Date.now().toString(), name: name.trim() }
    await setDoc(ref, { chatProfiles: [...profsRef.current, p] }, { merge: true })
  }

  async function deleteProfile(id: string) {
    const ref = doc(db, 'calendars', calendarId)
    await setDoc(ref, { chatProfiles: profsRef.current.filter(p => p.id !== id) }, { merge: true })
  }

  return { profiles, messages, loading, sendMessage, clearMessages, addProfile, deleteProfile }
}
