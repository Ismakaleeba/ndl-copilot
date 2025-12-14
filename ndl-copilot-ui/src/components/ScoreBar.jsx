import React from 'react'

export default function ScoreBar({ label, value = 0 }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const tone = clamped >= 80 ? 'bg-success/80' : clamped >= 50 ? 'bg-warn/80' : 'bg-red-500'

  return (
    <div className="flex items-center gap-4">
      <div className="w-36 text-sm text-muted">{label}</div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`${tone} h-full rounded-full transition-all`} style={{ width: `${clamped}%` }} />
      </div>
      <div className="w-12 text-right font-semibold">{clamped}%</div>
    </div>
  )
}
