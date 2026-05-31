import { useEffect, useRef } from 'react'
import type { ChatMessage, ChatProfile } from './types'

interface Props {
  messages: ChatMessage[]
  selectedProfile: ChatProfile | null
}

function fmt(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const EMPTY_ROWS = 6

export default function MessageList({ messages, selectedProfile }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length])

  const totalRows = messages.length + EMPTY_ROWS

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontFamily: "'Calibri','Arial',sans-serif", fontSize: 11,
        tableLayout: 'fixed',
      }}>
        <colgroup>
          <col style={{ width: 28 }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: '#f2f2f2', border: '1px solid #d0d7de', color: '#777', fontWeight: 400, fontSize: 10, padding: '1px' }} />
            <th style={{ background: '#f2f2f2', border: '1px solid #d0d7de', color: '#000', fontWeight: 600, fontSize: 10, textAlign: 'center', padding: '2px' }}>A</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: totalRows }, (_, i) => {
            const msg = messages[i]
            const isMe = msg?.profileId === selectedProfile?.id
            return (
              <tr key={i} style={{ height: 20 }}>
                <td style={{
                  textAlign: 'right', paddingRight: 4,
                  background: '#f2f2f2', border: '1px solid #d0d7de',
                  color: '#777', fontSize: 10, userSelect: 'none',
                }}>{i + 1}</td>
                <td style={{
                  border: '1px solid #d0d7de',
                  padding: '1px 5px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  background: isMe ? '#f0fff4' : '#fff',
                  color: '#000',
                }}>
                  {msg && (
                    <>
                      <span style={{ fontWeight: 700, color: isMe ? '#107C41' : '#1565C0' }}>{msg.profileName}</span>
                      <span style={{ color: '#000' }}>: {msg.text}</span>
                      <span style={{ color: '#bbb', fontSize: 10, marginLeft: 6 }}>{fmt(msg.timestamp)}</span>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div ref={bottomRef} />
    </div>
  )
}
