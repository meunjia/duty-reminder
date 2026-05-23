"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dutyReminder2 = exports.dutyReminder1 = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const shiftEngine_1 = require("./shiftEngine");
(0, app_1.initializeApp)();
function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
async function sendToCalendarsWithShift(targetDate, targetShift, title, body) {
    var _a, _b;
    const db = (0, firestore_1.getFirestore)();
    const messaging = (0, messaging_1.getMessaging)();
    const snap = await db.collection('calendars').get();
    for (const calDoc of snap.docs) {
        const data = calDoc.data();
        const settings = (_a = data.settings) !== null && _a !== void 0 ? _a : {};
        const overrides = (_b = data.overrides) !== null && _b !== void 0 ? _b : {};
        if (!settings.startDate || !settings.startShift)
            continue;
        const shift = (0, shiftEngine_1.computeShift)(settings.startDate, settings.startShift, overrides, targetDate);
        if (shift !== targetShift)
            continue;
        const tokensSnap = await calDoc.ref.collection('fcmTokens').get();
        const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
        if (tokens.length === 0)
            continue;
        const response = await messaging.sendEachForMulticast({ tokens, notification: { title, body } });
        // 만료/무효 토큰 정리
        const deletes = response.responses
            .map((r, i) => (!r.success ? tokensSnap.docs[i].ref.delete() : null))
            .filter(Boolean);
        await Promise.all(deletes);
    }
}
// 당직 당일 17:50 KST — 근무일지 알림
exports.dutyReminder1 = (0, scheduler_1.onSchedule)({ schedule: '50 17 * * *', timeZone: 'Asia/Seoul' }, async () => {
    const today = toDateString(new Date());
    await sendToCalendarsWithShift(today, '당', '📋 근무일지 알림', '10분 후 근무일지 올리세요!');
});
// 당직 익일 08:10 KST — 견사정비 알림
exports.dutyReminder2 = (0, scheduler_1.onSchedule)({ schedule: '10 8 * * *', timeZone: 'Asia/Seoul' }, async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await sendToCalendarsWithShift(toDateString(yesterday), '당', '🐕 견사정비 알림', '견사정비 이상유무 올릴 시간이에요!');
});
//# sourceMappingURL=index.js.map