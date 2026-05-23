import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { computeShift } from './shiftEngine'

initializeApp()

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function sendToCalendarsWithShift(targetDate: string, targetShift: string, title: string, body: string) {
  const db = getFirestore()
  const messaging = getMessaging()

  const snap = await db.collection('calendars').get()

  for (const calDoc of snap.docs) {
    const data = calDoc.data()
    const settings = data.settings ?? {}
    const overrides = data.overrides ?? {}

    if (!settings.startDate || !settings.startShift) continue

    const shift = computeShift(settings.startDate, settings.startShift, overrides, targetDate)
    if (shift !== targetShift) continue

    const tokensSnap = await calDoc.ref.collection('fcmTokens').get()
    const tokens = tokensSnap.docs.map((d) => d.data().token as string).filter(Boolean)
    if (tokens.length === 0) continue

    const response = await messaging.sendEachForMulticast({ tokens, notification: { title, body } })

    // 만료/무효 토큰 정리
    const deletes = response.responses
      .map((r, i) => (!r.success ? tokensSnap.docs[i].ref.delete() : null))
      .filter(Boolean)
    await Promise.all(deletes)
  }
}

// 당직 당일 17:50 KST — 근무일지 알림
export const dutyReminder1 = onSchedule(
  { schedule: '50 17 * * *', timeZone: 'Asia/Seoul' },
  async () => {
    const today = toDateString(new Date())
    await sendToCalendarsWithShift(today, '당', '📋 근무일지 알림', '10분 후 근무일지 올리세요!')
  }
)

// 당직 익일 08:10 KST — 견사정비 알림
export const dutyReminder2 = onSchedule(
  { schedule: '10 8 * * *', timeZone: 'Asia/Seoul' },
  async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    await sendToCalendarsWithShift(toDateString(yesterday), '당', '🐕 견사정비 알림', '견사정비 이상유무 올릴 시간이에요!')
  }
)
