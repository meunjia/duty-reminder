import { useState } from 'react'
import type { ChatProfile } from './types'

interface Props {
  selectedProfile: ChatProfile | null
  rowCount: number
  onSend: (text: string) => void
}

export default function InputBar({ selectedProfile, rowCount, onSend }: Props) {
  const [text, setText] = useState('')

  function handleSend() {
    if (!text.trim() || !selectedProfile) return
    onSend(text)
    setText('')
  }

  const cellRef = `A${rowCount + 1}`
  const F = "'Calibri','Arial',sans-serif"

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#f2f2f2', borderTop: '2px solid #217346',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '4px 8px', color: '#107C41', fontWeight: 700,
        fontFamily: 'Georgia,serif', fontSize: 13, lineHeight: 1,
        borderRight: '1px solid #d0d7de', flexShrink: 0,
      }}>fx</div>
      <div style={{
        padding: '4px 7px', fontSize: 11, color: '#333', minWidth: 38,
        borderRight: '1px solid #d0d7de', fontFamily: F, textAlign: 'center',
        flexShrink: 0,
      }}>{cellRef}</div>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder={selectedProfile ? `${selectedProfile.name}: 입력...` : '위에서 프로필 선택'}
        disabled={!selectedProfile}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          padding: '6px 8px', fontSize: 11, color: '#000', fontFamily: F,
        }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || !selectedProfile}
        style={{
          padding: '6px 12px', flexShrink: 0,
          background: text.trim() && selectedProfile ? '#107C41' : '#ccc',
          color: '#fff', border: 'none', cursor: text.trim() && selectedProfile ? 'pointer' : 'default',
          fontSize: 13, fontWeight: 700, lineHeight: 1,
        }}
      >✓</button>
    </div>
  )
}
