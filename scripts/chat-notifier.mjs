import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })

const db = getFirestore()
const messaging = getMessaging()
const now = Date.now()

const snap = await db.collection('calendars').get()

for (const calDoc of snap.docs) {
  const data = calDoc.data()
  const chatMessages = data.chatMessages ?? []

  const pending = chatMessages.filter(m => !m.notified && m.notifyAt <= now)
  if (pending.length === 0) continue

  const tokensSnap = await calDoc.ref.collection('fcmTokens').get()
  const tokenMap = new Map()
  for (const d of tokensSnap.docs) {
    const token = d.data().token
    if (token && !tokenMap.has(token)) tokenMap.set(token, d.ref)
  }

  if (tokenMap.size === 0) continue

  const tokens = [...tokenMap.keys()]
  const tokenRefs = [...tokenMap.values()]
  const latest = pending[pending.length - 1]

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: latest.profileName,
      body: pending.length > 1 ? `${latest.text} 외 ${pending.length - 1}개` : latest.text,
    },
  })

  console.log(`[${calDoc.id}] sent ${response.successCount}/${tokens.length}, pending=${pending.length}`)

  const deletes = response.responses
    .map((r, i) => (!r.success ? tokenRefs[i].delete() : null))
    .filter(Boolean)
  await Promise.all(deletes)

  const pendingIds = new Set(pending.map(m => m.id))
  const updated = chatMessages.map(m => pendingIds.has(m.id) ? { ...m, notified: true } : m)
  await calDoc.ref.update({ chatMessages: updated })
}

console.log('chat-notifier done')
