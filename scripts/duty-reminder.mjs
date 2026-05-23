import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import Holidays from 'date-holidays'

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })

const db = getFirestore()
const messaging = getMessaging()
const hd = new Holidays('KR')

const MODE = process.argv[2] // 'duty1' | 'duty2'
if (!MODE) { console.error('Usage: node duty-reminder.mjs duty1|duty2'); process.exit(1) }

function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isHoliday(date) {
  const r = hd.isHoliday(date)
  return r !== false && r.length > 0
}

function isWeekend(date) {
  const d = date.getDay()
  return d === 0 || d === 6
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dayDiff(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86400000)
}

function computeShift(startDate, startShift, overrides, dateStr) {
  if (overrides[dateStr]) return overrides[dateStr]
  const CYCLE = ['교1', '교2', '당', '비']
  const start = parseDate(startDate)
  const startIdx = CYCLE.indexOf(startShift)
  const date = parseDate(dateStr)
  const diff = dayDiff(start, date)
  const rawIdx = ((startIdx + diff) % CYCLE.length + CYCLE.length) % CYCLE.length
  const rawShift = CYCLE[rawIdx]
  if ((rawShift === '교1' || rawShift === '교2') && (isWeekend(date) || isHoliday(date))) return '비'
  return rawShift
}

async function sendToCalendarsWithShift(targetDate, targetShift, title, body) {
  const snap = await db.collection('calendars').get()

  // 토큰→docRef 맵 (중복 토큰 제거)
  const tokenMap = new Map() // token → docRef

  for (const calDoc of snap.docs) {
    const data = calDoc.data()
    const settings = data.settings ?? {}
    const overrides = data.overrides ?? {}
    if (!settings.startDate || !settings.startShift) continue

    const shift = computeShift(settings.startDate, settings.startShift, overrides, targetDate)
    if (shift !== targetShift) continue

    const tokensSnap = await calDoc.ref.collection('fcmTokens').get()
    for (const doc of tokensSnap.docs) {
      const token = doc.data().token
      if (token && !tokenMap.has(token)) {
        tokenMap.set(token, doc.ref)
      }
    }
  }

  if (tokenMap.size === 0) { console.log('no tokens found'); return }

  const tokens = [...tokenMap.keys()]
  const refs = [...tokenMap.values()]

  const response = await messaging.sendEachForMulticast({ tokens, notification: { title, body } })
  console.log(`sent ${response.successCount}/${tokens.length}`)

  const deletes = response.responses
    .map((r, i) => (!r.success ? refs[i].delete() : null))
    .filter(Boolean)
  await Promise.all(deletes)
}

// KST 기준 오늘 날짜 계산
const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
const today = toDateString(new Date(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate()))
const yesterdayDate = new Date(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate() - 1)
const yesterday = toDateString(yesterdayDate)

if (MODE === 'duty1') {
  // 당직 당일 17:50 KST — 근무일지 알림
  await sendToCalendarsWithShift(today, '당', '📋 근무일지 알림', '10분 후 근무일지 올리세요!')
} else if (MODE === 'duty2') {
  // 당직 익일 08:10 KST — 견사정비 알림
  await sendToCalendarsWithShift(yesterday, '당', '🐕 견사정비 알림', '견사정비 이상유무 올릴 시간이에요!')
}
