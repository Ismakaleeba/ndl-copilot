import React from 'react'

export default function Badge({ children, tone = 'default', className = '' }) {
  const toneClass = tone === 'warn' ? 'badge warn' : tone === 'success' ? 'badge success' : 'badge'
  return <span className={`${toneClass} ${className}`}>{children}</span>
}
