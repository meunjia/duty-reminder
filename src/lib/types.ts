export type ShiftType = '교1' | '교2' | '당' | '비' | '전진배치' | '중요업무'

export interface SavedLocation {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

export interface CalendarSettings {
  startDate: string
  startShift: ShiftType
  workplaceName: string
  workplaceAddress: string
  workplaceLat?: number
  workplaceLng?: number
  // 도착 목표 시간 (근무별) - 역산으로 출발시간 계산
  arrivalTimes: {
    교1: string
    교2: string
    당: string
    전진배치: string
    중요업무: string
  }
  wakeTimes: {
    교1: string
    교2: string
    당: string
    전진배치: string
    중요업무: string
  }
  retireTimes: {
    교1: string
    교2: string
    당: string
    전진배치: string
    중요업무: string
  }
  locations: SavedLocation[]
  defaultLocationId?: string
}

export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface CalendarData {
  settings: CalendarSettings
  overrides: Record<string, ShiftType>
  memos: Record<string, string[]>
  monthMemos: Record<string, string>
  todos: Todo[]
}

export const DEFAULT_SETTINGS: CalendarSettings = {
  startDate: '2026-01-01',
  startShift: '교1',
  workplaceName: '회사',
  workplaceAddress: '',
  arrivalTimes: {
    교1: '09:00',
    교2: '09:00',
    당: '09:00',
    전진배치: '06:00',
    중요업무: '09:00',
  },
  wakeTimes: {
    교1: '07:30',
    교2: '07:30',
    당: '07:30',
    전진배치: '04:30',
    중요업무: '07:30',
  },
  retireTimes: {
    교1: '18:00',
    교2: '18:00',
    당: '09:00',
    전진배치: '16:00',
    중요업무: '18:00',
  },
  locations: [],
}

export const DEFAULT_CALENDAR_DATA: CalendarData = {
  settings: DEFAULT_SETTINGS,
  overrides: {},
  memos: {},
  monthMemos: {},
  todos: [],
}
