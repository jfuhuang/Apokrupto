import { useState, useEffect } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function CountdownScreen({ onComplete }) {
  const [count, setCount] = useState(5)

  useEffect(() => {
    if (count <= 0) {
      onComplete()
      return
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.content}>
        <p style={styles.label}>GAME STARTING IN</p>
        <div key={count} style={styles.countWrapper}>
          <span style={styles.count}>{count}</span>
          <div style={styles.ring} />
        </div>
        <p style={styles.subtitle}>Prepare yourself...</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0B0C10',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  label: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: '#ADB5BD',
    letterSpacing: '0.2em',
  },
  countWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    animation: 'countdownPop 0.4s ease-out',
  },
  count: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 96,
    fontWeight: 900,
    color: '#00D4FF',
    textShadow: '0 0 30px #00D4FF, 0 0 60px rgba(0,212,255,0.5)',
    lineHeight: 1,
  },
  ring: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(0,212,255,0.3)',
    boxShadow: '0 0 20px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.05)',
  },
  subtitle: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    letterSpacing: '0.08em',
    animation: 'pulse 1s infinite',
  },
}
