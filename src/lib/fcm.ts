import { getToken, deleteToken } from 'firebase/messaging'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { messaging, db } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

const LOCAL_KEY = 'fcm_token'

export function getPermissionState(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'default'
  return Notification.permission
}

export async function enableNotifications(calendarId: string): Promise<'ok' | 'denied' | 'error'> {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (!token) return 'error'

    localStorage.setItem(LOCAL_KEY, token)

    await setDoc(
      doc(db, 'calendars', calendarId, 'fcmTokens', token),
      { token, updatedAt: serverTimestamp() }
    )
    return 'ok'
  } catch {
    return 'error'
  }
}

export async function disableNotifications(calendarId: string): Promise<void> {
  try {
    const token = localStorage.getItem(LOCAL_KEY)
    await deleteToken(messaging)
    if (token) {
      localStorage.removeItem(LOCAL_KEY)
      await deleteDoc(doc(db, 'calendars', calendarId, 'fcmTokens', token))
    }
  } catch {
    // ignore — token already invalid
  }
}

export function isNotificationsEnabled(): boolean {
  return getPermissionState() === 'granted' && !!localStorage.getItem(LOCAL_KEY)
}
