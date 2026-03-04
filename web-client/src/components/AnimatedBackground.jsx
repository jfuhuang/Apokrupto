import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const particleCount = 18
    const particles = []

    for (let i = 0; i < particleCount; i++) {
      const span = document.createElement('span')
      const size = Math.random() * 4 + 2
      const left = Math.random() * 100
      const delay = Math.random() * 8
      const duration = Math.random() * 10 + 8
      const colors = ['#00D4FF', '#FF3366', '#8B5CF6', '#00FF9F', '#FF006E']
      const color = colors[Math.floor(Math.random() * colors.length)]

      span.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        bottom: -10px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 ${size * 2}px ${color};
        animation: floatUp ${duration}s ${delay}s infinite linear;
        pointer-events: none;
      `
      container.appendChild(span)
      particles.push(span)
    }

    return () => {
      particles.forEach((p) => {
        if (container.contains(p)) container.removeChild(p)
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  )
}
