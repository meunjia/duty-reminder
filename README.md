# 근무캘린더

교대근무(교1·교2·당·비) 일정 관리 PWA. 근무 패턴 자동 계산, 날씨·출퇴근 소요시간, 당직 리마인더 푸시 알림 제공.

**배포 URL**: https://shift-calendar-6945f.web.app

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| 클라우드 DB | Firebase Firestore |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| 알림 스케줄러 | GitHub Actions cron |
| 날씨 | Open-Meteo API (무료, 키 불필요) |
| 경로 소요시간 | Tmap Routes API |
| 주소→좌표 | Nominatim (OpenStreetMap, 무료) |

---

## 아키텍처

### 데이터 구조 (Firestore)

```
calendars/{calendarId}
  settings: CalendarSettings     # 근무 패턴, 시간, 위치, 출발지
  overrides: {날짜: ShiftType}   # 수동 변경된 날짜
  memos: {날짜: string[]}        # 날짜별 메모 (최대 30자, 복수)
  monthMemos: {년월: string}     # 월별 메모
  todos: Todo[]                  # 아 맞다! 할일 목록
  fcmTokens/{token}              # 알림 수신 기기 토큰
    token: string
    updatedAt: Timestamp
```

### 캘린더 ID

- 최초 접속 시 `localStorage`에 8자리 랜덤 ID 자동 생성
- 모든 데이터는 이 ID 키로 Firestore에 저장·동기화
- **다른 기기에서 같은 캘린더 열기**: 설정 → 공유 링크 복사 → URL `?cal=XXXX` 파라미터로 접속

### 근무 계산 (`src/utils/shiftEngine.ts`)

- 4일 사이클: `교1 → 교2 → 당 → 비`
- 교1·교2가 주말/공휴일이면 자동으로 비번 처리
- `date-holidays` 라이브러리로 한국 공휴일 판단
- 오버라이드(수동 변경)가 자동 계산보다 우선 적용

### 홈 화면 로직 (`src/pages/Home.tsx`)

| 조건 | 표시 내용 |
|------|-----------|
| 비번 (어제 당직 아님) | 비번 안내 |
| 비번 (어제 당직, 오전 11시 전) | 퇴근시간(09:00) + 귀가도착 |
| 당직, 오전 | 기상 + 출발시간 + 익일퇴근(+귀가) |
| 당직, 오후 | 익일 퇴근(09:00) + 귀가도착 |
| 교번, 오전 | 기상 + 지금 출발 시 도착 예정 |
| 교번, 오후 | 퇴근 예정 + 지금 출발 시 귀가 도착 |

오전/오후 기준: 11시 (`today.getHours() < 11`)

---

## 로컬 개발

```bash
cd shift-calendar
npm install
npm run dev
```

### 환경변수 (`.env.local` — git에 올리지 않음)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=      # FCM Web Push 인증서 (Firebase Console → 클라우드 메시징 → 웹 푸시 인증서)
VITE_TMAP_KEY=                 # Tmap API 키
```

---

## 배포

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

GitHub에 push해도 자동 배포 안 됨 — 로컬에서 직접 `firebase deploy` 필요.

---

## 푸시 알림

### 클라이언트 흐름

1. 설정 탭 → "알림 허용하기" 버튼
2. 브라우저 권한 요청 → 수락
3. FCM 토큰 발급 → `calendars/{calendarId}/fcmTokens/{token}` 에 저장
4. 기존 토큰 중복 자동 정리 (같은 기기 재등록 시)

### 서버 흐름 (GitHub Actions)

```
.github/workflows/duty-reminder.yml
scripts/duty-reminder.mjs
```

| 트리거 | 모드 | 대상 | 메시지 |
|--------|------|------|--------|
| 매일 17:50 KST | duty1 | 오늘 당직인 캘린더 | 근무일지 알림 |
| 매일 08:10 KST | 다음날 00:10 UTC | duty2 | 어제 당직인 캘린더 | 견사정비 알림 |
| 수동 (workflow_dispatch) | test | 토큰 있는 모든 캘린더 | 테스트 알림 |

**GitHub Secret 설정**: `Settings → Secrets → FIREBASE_SERVICE_ACCOUNT` = 서비스 계정 JSON 전체 내용  
(Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성)

### iOS 주의사항

- **iOS 16.4 이상** 필수
- Safari 브라우저에서는 웹 푸시 **불가** → 반드시 홈화면 추가 후 아이콘으로 열어야 함
- 홈화면 추가: Safari → 공유 → 홈 화면에 추가

### 알림 지연 문제

GitHub Actions cron은 최대 1시간 지연될 수 있음. 정확한 시간이 필요하면 [cron-job.org](https://cron-job.org)에서 GitHub API(`workflow_dispatch`)를 호출하도록 설정 권장.

---

## 보안

Firestore 규칙은 calendarId를 아는 모든 사용자에게 읽기·쓰기를 허용 (`allow read, write: if true`).  
인증 없이 동작하는 개인용 앱으로 설계되어 있으며, calendarId는 랜덤 8자리 문자열로 추측이 매우 어렵습니다.  
**공유 링크는 신뢰하는 사람에게만 전송하세요.**

---

## 알려진 제한사항 및 개선 포인트

| 항목 | 현황 | 개선 방향 |
|------|------|-----------|
| 알림 지연 | GitHub Actions 최대 1시간 지연 | cron-job.org로 교체 |
| 탭 전환 시 재연산 | 탭 이동 시 컴포넌트 언마운트 → Tmap API 재호출 | CSS visibility로 마운트 유지 |
| 날씨 로딩 실패 | API 실패 시 "날씨 로딩..." 영구 표시 | 에러 상태 별도 관리 |
| 오프라인 지원 없음 | SW가 푸시만 처리, 앱 셸 캐싱 없음 | Workbox 도입 고려 |
| Firestore 보안 | 인증 없음, calendarId로만 보호 | Firebase Auth 도입 시 규칙 강화 가능 |
