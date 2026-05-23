"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeShift = void 0;
const date_holidays_1 = __importDefault(require("date-holidays"));
const CYCLE = ['교1', '교2', '당', '비'];
const hd = new date_holidays_1.default('KR');
function isHoliday(date) {
    const result = hd.isHoliday(date);
    return result !== false && result.length > 0;
}
function isWeekend(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
}
function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}
function dayDiff(a, b) {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
}
function computeShift(startDate, startShift, overrides, dateStr) {
    if (overrides[dateStr])
        return overrides[dateStr];
    const start = parseDate(startDate);
    const startIdx = CYCLE.indexOf(startShift);
    const date = parseDate(dateStr);
    const diff = dayDiff(start, date);
    const rawIdx = ((startIdx + diff) % CYCLE.length + CYCLE.length) % CYCLE.length;
    const rawShift = CYCLE[rawIdx];
    if ((rawShift === '교1' || rawShift === '교2') && (isWeekend(date) || isHoliday(date))) {
        return '비';
    }
    return rawShift;
}
exports.computeShift = computeShift;
//# sourceMappingURL=shiftEngine.js.map