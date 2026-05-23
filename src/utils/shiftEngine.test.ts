import { describe, it, expect } from 'vitest'
import {
  getShiftForDate,
  getShiftStyle,
  getNextOffDay,
} from './shiftEngine'

const START_DATE = '2026-01-01'
const START_SHIFT = '교1'

// 2026-01-01(목)=신정(공휴일)→비, 2026-01-05~08이 평일 교1→교2→당→비
describe('getShiftForDate — 기본 순환', () => {
  it('D+4(월) 교1', () => {
    expect(getShiftForDate(new Date(2026, 0, 5), START_DATE, START_SHIFT, {})).toBe('교1')
  })
  it('D+5(화) 교2', () => {
    expect(getShiftForDate(new Date(2026, 0, 6), START_DATE, START_SHIFT, {})).toBe('교2')
  })
  it('D+6(수) 당', () => {
    expect(getShiftForDate(new Date(2026, 0, 7), START_DATE, START_SHIFT, {})).toBe('당')
  })
  it('D+7(목) 비', () => {
    expect(getShiftForDate(new Date(2026, 0, 8), START_DATE, START_SHIFT, {})).toBe('비')
  })
  it('D+8(금) 교1 (순환)', () => {
    expect(getShiftForDate(new Date(2026, 0, 9), START_DATE, START_SHIFT, {})).toBe('교1')
  })
})

describe('getShiftForDate — 주말 자동 비 처리', () => {
  // 2026-01-03은 토요일이고 패턴상 당 → 당은 비 변환 안 됨
  // 주말에 교1·2이면 비 처리되는지 확인 필요
  // 2026-01-10은 토요일, D+9 = (1+9)%4 = 2 → 당, 당은 비 변환 안 됨
  // 2026-01-11은 일요일, D+10 = 3 → 비 (이미 비)
  // 2026-01-18은 일요일, D+17 = (1+17)%4 = 2 → 당
  // 주말 교1·2 → 비 변환 테스트: 시작을 교1=일요일로 맞춰야 함
  // 2026-01-04(일) = D+3 → 비 (이미 비라 변환 불필요)
  // 시작을 다르게 해서 주말이 교1 또는 교2가 되는 케이스
  // 2026-01-01(목)=교1, 2026-01-02(금)=교2, 2026-01-03(토)=당, 2026-01-04(일)=비
  // 2026-01-05(월)=교1, 2026-01-06(화)=교2, 2026-01-07(수)=당, 2026-01-08(목)=비
  // 2026-01-09(금)=교1, 2026-01-10(토)=교2 → 비 (토요일이므로)

  it('토요일에 교2 패턴이면 비로 변환', () => {
    // 2026-01-10 토 = D+9 → (1+9)%4=2 → 교2(idx=1) 아님, 당(idx=2)
    // 다시 계산: idx 0=교1, 1=교2, 2=당, 3=비
    // startShift='교1'=idx0, D+9: (0+9)%4=1 → 교2
    // 2026-01-10은 토요일 → 비 변환 됨
    expect(getShiftForDate(new Date(2026, 0, 10), START_DATE, START_SHIFT, {})).toBe('비')
  })

  it('일요일에 교1 패턴이면 비로 변환', () => {
    // 2026-01-13 화=D+12: (0+12)%4=0 → 교1
    // 2026-01-11 일=D+10: (0+10)%4=2 → 당 (비 변환 안 됨)
    // 2026-01-25 일=D+24: (0+24)%4=0 → 교1 → 일요일이므로 비
    expect(getShiftForDate(new Date(2026, 0, 25), START_DATE, START_SHIFT, {})).toBe('비')
  })
})

describe('getShiftForDate — 수동 오버라이드', () => {
  it('오버라이드 있으면 패턴 무시', () => {
    const overrides = { '2026-01-01': '전진배치' as const }
    expect(getShiftForDate(new Date(2026, 0, 1), START_DATE, START_SHIFT, overrides)).toBe('전진배치')
  })

  it('오버라이드는 주말 비 변환보다 우선', () => {
    // 2026-01-10은 토요일+교2 → 원래 비로 변환되지만 오버라이드 있으면 그 값 사용
    const overrides = { '2026-01-10': '중요업무' as const }
    expect(getShiftForDate(new Date(2026, 0, 10), START_DATE, START_SHIFT, overrides)).toBe('중요업무')
  })
})

describe('getShiftForDate — 음수 날짜 (시작일 이전)', () => {
  it('시작일 이전 날짜도 순환 계산', () => {
    // D-1: (0-1+4)%4=3 → 비
    expect(getShiftForDate(new Date(2025, 11, 31), START_DATE, START_SHIFT, {})).toBe('비')
  })
  it('D-2: (0-2+4)%4=2 → 당', () => {
    expect(getShiftForDate(new Date(2025, 11, 30), START_DATE, START_SHIFT, {})).toBe('당')
  })
})

describe('getShiftStyle', () => {
  it('교1은 노란 원형', () => {
    const s = getShiftStyle('교1')
    expect(s.type).toBe('circle')
    expect(s.bg).toBe('#f5e97a')
    expect(s.text).toBe('#5a4800')
  })
  it('당은 진회색 원형', () => {
    const s = getShiftStyle('당')
    expect(s.type).toBe('circle')
    expect(s.bg).toBe('#555555')
    expect(s.text).toBe('#ffffff')
  })
  it('비는 텍스트 빨간색', () => {
    const s = getShiftStyle('비')
    expect(s.type).toBe('text')
    expect(s.text).toBe('#E24B4A')
  })
  it('전진배치는 파란 pill', () => {
    const s = getShiftStyle('전진배치')
    expect(s.type).toBe('pill')
    expect(s.bg).toBe('#378ADD')
  })
  it('중요업무는 초록 pill', () => {
    const s = getShiftStyle('중요업무')
    expect(s.type).toBe('pill')
    expect(s.bg).toBe('#2eab6c')
  })
})

describe('getNextOffDay', () => {
  it('비번 D-day 계산', () => {
    // 2026-01-01(목)=교1, D+3=비=2026-01-04
    const result = getNextOffDay(new Date(2026, 0, 1), START_DATE, START_SHIFT, {})
    expect(result).not.toBeNull()
    expect(result!.daysLeft).toBe(3)
  })
})
