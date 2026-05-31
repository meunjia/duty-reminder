import { useState } from 'react'
import { useChatData } from './ChatStore'
import ProfileBar from './ProfileBar'
import MessageList from './MessageList'
import InputBar from './InputBar'
import type { ChatProfile } from './types'

const MENU = ['파일', '홈', '삽입', '페이지 레이아웃', '수식', '데이터', '검토', '보기']

export default function ChatPage() {
  const { profiles, messages, loading, sendMessage, clearMessages, addProfile, deleteProfile } = useChatData()
  const [selectedProfile, setSelectedProfile] = useState<ChatProfile | null>(null)

  async function handleSend(text: string) {
    if (!selectedProfile) return
    await sendMessage(selectedProfile, text)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60svh', fontFamily: "'Calibri','Arial',sans-serif", color: '#888', fontSize: 12 }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100svh', paddingBottom: 64,
      boxSizing: 'border-box',
      fontFamily: "'Calibri','Arial',sans-serif",
      fontSize: 11, color: '#000', background: '#fff',
    }}>
      {/* Excel 리본 (위장용) */}
      <div style={{ background: '#217346', color: '#fff', flexShrink: 0 }}>
        <div style={{ padding: '3px 10px', fontSize: 11, opacity: 0.8, letterSpacing: 0.2 }}>
          통합 문서1.xlsx - Microsoft Excel
        </div>
        <div style={{ display: 'flex', padding: '0 4px 3px', gap: 0 }}>
          {MENU.map(m => (
            <span key={m} style={{ padding: '3px 7px', fontSize: 11, cursor: 'default', borderRadius: 2 }}>{m}</span>
          ))}
        </div>
      </div>

      {/* 프로필 바 */}
      <ProfileBar
        profiles={profiles}
        selected={selectedProfile}
        onSelect={setSelectedProfile}
        onAdd={addProfile}
        onDelete={id => { deleteProfile(id); if (selectedProfile?.id === id) setSelectedProfile(null) }}
        onClear={clearMessages}
      />

      {/* 열 헤더 */}
      <div style={{ display: 'flex', background: '#f2f2f2', borderBottom: '1px solid #d0d7de', flexShrink: 0 }}>
        <div style={{ width: 28, borderRight: '1px solid #d0d7de', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '2px 5px', fontWeight: 700, fontSize: 11, textAlign: 'center', color: '#000', background: '#f2f2f2' }}>A</div>
      </div>

      {/* 메시지 목록 */}
      <MessageList messages={messages} selectedProfile={selectedProfile} />

      {/* 수식 입력줄 */}
      <InputBar
        selectedProfile={selectedProfile}
        rowCount={messages.length}
        onSend={handleSend}
      />
    </div>
  )
}
