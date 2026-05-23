# 당직 리마인더 — PWA 푸시 알림 구현 가이드

## 알림 목록

| 시간 | 내용 |
|------|------|
| 당직 당일 17:50 | "📋 10분 후 근무일지 올리세요!" |
| 당직 익일 08:10 | "🐕 견사정비 이상유무 올릴 시간이에요!" |

---

## 동작 조건

- iOS 16.4 이상
- 사파리에서 **홈화면에 추가**된 상태
- 사용자가 **알림 허용** 눌렀을 때 (최초 1회)

---

## 기술 구성

```
Firebase Firestore     → 당직 날짜 저장
Firebase Cloud Functions → 스케줄러 (매일 자동 실행)
Firebase Cloud Messaging → 푸시 알림 발송
Service Worker         → 앱에서 알림 수신
```

---

## 구현 순서

### 1. Firebase Cloud Messaging 설정

```bash
npm install firebase
```

```typescript
// src/lib/fcm.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const messaging = getMessaging()

// 알림 권한 요청 + FCM 토큰 발급
export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
  })

  return token
}
```

### 2. Service Worker 등록

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
})

const messaging = firebase.messaging()

// 백그라운드 알림 수신
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192.png'
  })
})
```

### 3. FCM 토큰 Firestore에 저장

```typescript
// 앱 시작 시 토큰 저장
async function saveFCMToken(calendarId: string) {
  const token = await requestNotificationPermission()
  if (!token) return

  await setDoc(doc(db, 'calendars', calendarId, 'fcmTokens', token), {
    token,
    updatedAt: serverTimestamp()
  })
}
```

### 4. Firebase Cloud Functions — 스케줄러

```typescript
// functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

// 매일 17:50 실행
export const dutyReminder1 = onSchedule('50 17 * * *', async () => {
  const db = getFirestore()
  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  // 오늘 당직인 캘린더 찾기
  const calendarsSnap = await db.collection('calendars').get()

  for (const calDoc of calendarsSnap.docs) {
    const data = calDoc.data()
    const override = data.overrides?.[today]
    const shift = override ?? computeShift(data.settings, today) // shiftEngine 로직

    if (shift !== '당') continue

    // 해당 캘린더의 FCM 토큰들에 발송
    const tokensSnap = await calDoc.ref.collection('fcmTokens').get()
    const tokens = tokensSnap.docs.map(d => d.data().token)

    if (tokens.length === 0) continue

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '📋 근무일지 알림',
        body: '10분 후 18:00 근무일지 올리세요!'
      }
    })
  }
})

// 매일 08:10 실행 — 어제 당직이었던 경우
export const dutyReminder2 = onSchedule('10 8 * * *', async () => {
  const db = getFirestore()

  // 어제 날짜 계산
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const calendarsSnap = await db.collection('calendars').get()

  for (const calDoc of calendarsSnap.docs) {
    const data = calDoc.data()
    const override = data.overrides?.[yesterdayStr]
    const shift = override ?? computeShift(data.settings, yesterdayStr)

    if (shift !== '당') continue

    const tokensSnap = await calDoc.ref.collection('fcmTokens').get()
    const tokens = tokensSnap.docs.map(d => d.data().token)

    if (tokens.length === 0) continue

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '🐕 견사정비 알림',
        body: '08:20 견사정비 이상유무 올리세요!'
      }
    })
  }
})
```

---

## Firestore 데이터 구조 추가

```json
{
  "calendars": {
    "{calendarId}": {
      "fcmTokens": {
        "{token}": {
          "token": "FCM_TOKEN_STRING",
          "updatedAt": "timestamp"
        }
      }
    }
  }
}
```

---

## 앱 UI — 알림 설정 (설정 탭에 추가)

```
[알림 설정]
  ├─ 당직 리마인더 토글 ON/OFF
  ├─ 17:50 근무일지 알림
  └─ 익일 08:10 견사정비 알림
```

알림 허용 안 한 상태면 → "알림 허용하기" 버튼 표시

---

## iOS 주의사항

- 반드시 **홈화면에 추가** 후 사용
- 처음 앱 열 때 알림 허용 팝업 → **허용** 선택
- iOS 배터리 최적화로 가끔 지연될 수 있음 (5~10분)
- 알림이 안 올 경우 대비로 홈 화면에 당직 당일 리마인더 텍스트도 표시 유지

---

## Claude Code 프롬프트

```
shift-calendar 프로젝트에 당직 리마인더 PWA 푸시 알림 추가해줘.

조건:
- 당직 당일 17:50 → "📋 10분 후 근무일지 올리세요!"
- 당직 익일 08:10 → "🐕 견사정비 이상유무 올릴 시간이에요!"

구성:
1. public/firebase-messaging-sw.js — Service Worker
2. src/lib/fcm.ts — 권한 요청 + 토큰 발급 + Firestore 저장
3. functions/src/index.ts — Cloud Functions 스케줄러 2개
   - dutyReminder1: 매일 17:50, 오늘 당직인 캘린더에 발송
   - dutyReminder2: 매일 08:10, 어제 당직인 캘린더에 발송
4. 설정 탭에 알림 ON/OFF 토글 추가

당직 여부 판단은 기존 shiftEngine.ts 의
getShiftForDate() 함수 재사용할 것.
Firebase project는 기존 연결된 것 사용.
```
