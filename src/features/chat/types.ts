export interface ChatProfile {
  id: string
  name: string
}

export interface ChatMessage {
  id: string
  profileId: string
  profileName: string
  text: string
  timestamp: number
  notifyAt: number
  notified: boolean
}
