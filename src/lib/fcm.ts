import { getToken, deleteToken } from 'firebase/messaging'
import { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { messaging, db } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

const LOCAL_KEY = 'fcm_token'

export function getPermissionState(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'default'
  return Notification.permission
}

export async function enableNotifications(calendarId: string): Promise<'ok' | 'denied' | string> {
  if (!messaging) return 'error: 이 브라우저는 알림을 지원하지 않습니다 (iOS는 홈화면 추가 후 앱으로 열어야 합니다)'
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (!token) return 'error: no token'

    // 기존 토큰 전부 삭제 (중복 방지)
    const existing = await getDocs(collection(db, 'calendars', calendarId, 'fcmTokens'))
    await Promise.all(existing.docs.filter(d => d.id !== token).map(d => deleteDoc(d.ref)))

    localStorage.setItem(LOCAL_KEY, token)
    await setDoc(
      doc(db, 'calendars', calendarId, 'fcmTokens', token),
      { token, updatedAt: serverTimestamp() }
    )
    return 'ok'
  } catch (e) {
    return 'error: ' + String(e)
  }
}

export async function disableNotifications(calendarId: string): Promise<void> {
  try {
    const token = localStorage.getItem(LOCAL_KEY)
    if (messaging) await deleteToken(messaging)
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
