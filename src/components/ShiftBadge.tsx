import type { ShiftType } from '../lib/types'
import { getShiftStyle } from '../utils/shiftEngine'

interface ShiftBadgeProps {
  shift: ShiftType
  size?: 'sm' | 'md' | 'lg'
}

export default function ShiftBadge({ shift, size = 'md' }: ShiftBadgeProps) {
  const style = getShiftStyle(shift)

  const circleDim = size === 'lg' ? 40 : size === 'md' ? 28 : 24
  const fontSize = size === 'lg' ? 13 : size === 'md' ? 11 : 10
  const pillPad = size === 'lg' ? '3px 10px' : size === 'md' ? '3px 8px' : '2px 6px'
  const pillFontSize = size === 'lg' ? 12 : size === 'md' ? 10 : 9

  if (style.type === 'text') {
    return (
      <span style={{ color: style.text, fontSize, fontWeight: 700, lineHeight: 1 }}>
        {shift}
      </span>
    )
  }

  if (style.type === 'pill') {
    return (
      <span
        style={{
          background: style.bg,
          color: style.text,
          fontSize: pillFontSize,
          fontWeight: 700,
          borderRadius: 99,
          padding: pillPad,
          lineHeight: 1.5,
          display: 'inline-block',
          whiteSpace: 'nowrap',
        }}
      >
        {shift}
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: circleDim,
        height: circleDim,
        borderRadius: '50%',
        background: style.bg,
        color: style.text,
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {shift}
    </span>
  )
}
