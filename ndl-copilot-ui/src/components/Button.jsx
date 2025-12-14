import React from 'react'

export default function Button({ children, variant = 'primary', className = '', ...rest }) {
  const base = 'btn'
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  return (
    <button className={`${base} ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  )
}
