import { useState } from 'react'
import type { ChatProfile } from './types'

interface Props {
  profiles: ChatProfile[]
  selected: ChatProfile | null
  onSelect: (p: ChatProfile) => void
  onAdd: (name: string) => void
  onDelete: (id: string) => void
  onClear: () => void
}

const cell: React.CSSProperties = {
  padding: '2px 8px', border: '1px solid #d0d7de',
  background: '#f2f2f2', fontSize: 11, cursor: 'pointer',
  fontFamily: "'Calibri','Arial',sans-serif", color: '#000',
  lineHeight: '20px',
}

export default function ProfileBar({ profiles, selected, onSelect, onAdd, onDelete, onClear }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  function handleAdd() {
    if (newName.trim()) {
      onAdd(newName)
      setNewName('')
      setAdding(false)
    }
  }

  function handleClearClick() {
    if (confirmClear) {
      onClear()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap',
      padding: '3px 4px', gap: 3,
      background: '#f2f2f2', borderBottom: '1px solid #bbb',
    }}>
      {profiles.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button
            onClick={() => onSelect(p)}
            style={{
              ...cell,
              background: selected?.id === p.id ? '#fff' : '#f2f2f2',
              fontWeight: selected?.id === p.id ? 700 : 400,
              border: selected?.id === p.id ? '2px solid #107C41' : '1px solid #d0d7de',
              borderRight: editMode ? 'none' : undefined,
            }}
          >{p.name}</button>
          {editMode && (
            <button
              onClick={() => onDelete(p.id)}
              style={{ ...cell, padding: '2px 5px', color: '#c00', borderLeft: 'none', fontWeight: 700 }}
            >×</button>
          )}
        </div>
      ))}

      {adding ? (
        <>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="이름"
            style={{
              width: 56, padding: '2px 4px', fontSize: 11,
              border: '1px solid #107C41', outline: 'none',
              fontFamily: "'Calibri','Arial',sans-serif",
            }}
          />
          <button onClick={handleAdd} style={{ ...cell, color: '#107C41', fontWeight: 700 }}>✓</button>
          <button onClick={() => { setAdding(false); setNewName('') }} style={cell}>✕</button>
        </>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...cell, color: '#107C41' }}>+ 추가</button>
      )}

      <button
        onClick={() => setEditMode(v => !v)}
        style={{ ...cell, color: editMode ? '#107C41' : '#888', marginLeft: 2 }}
        title="프로필 편집"
      >✎</button>

      <div style={{ flex: 1 }} />

      <button
        onClick={handleClearClick}
        style={{
          ...cell,
          color: confirmClear ? '#c00' : '#aaa',
          border: confirmClear ? '1px solid #c00' : '1px solid #d0d7de',
          fontSize: 12,
        }}
        title="메시지 초기화"
      >{confirmClear ? '확인?' : '⌫'}</button>
    </div>
  )
}
