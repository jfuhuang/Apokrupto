import AnimatedBackground from '../components/AnimatedBackground.jsx'

export default function WelcomeScreen({ onLogin, onRegister }) {
  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.content}>
        <div style={styles.titleWrapper}>
          <h1 style={styles.title}>APOKRUPTO</h1>
          <div style={styles.titleGlow} />
        </div>
        <p style={styles.greek}>ἀποκρύπτω</p>
        <p style={styles.subtitle}>Real World Deception</p>
        <p style={styles.tagline}>A Social Deduction Experience</p>
        <div style={styles.buttons}>
          <button style={styles.primaryBtn} onClick={onLogin}>
            LOGIN
          </button>
          <button style={styles.secondaryBtn} onClick={onRegister}>
            CREATE ACCOUNT
          </button>
        </div>
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
    background: 'linear-gradient(180deg, #0B0C10 0%, #0d1117 50%, #0B0C10 100%)',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '40px 24px',
    animation: 'fadeIn 0.8s ease-out',
  },
  titleWrapper: {
    position: 'relative',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 'clamp(36px, 8vw, 64px)',
    fontWeight: 900,
    color: '#00D4FF',
    letterSpacing: '0.15em',
    textShadow: '0 0 20px #00D4FF, 0 0 40px #00D4FF, 0 0 80px rgba(0,212,255,0.5)',
    textAlign: 'center',
  },
  titleGlow: {
    position: 'absolute',
    inset: -20,
    background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  greek: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 18,
    color: 'rgba(0,212,255,0.6)',
    letterSpacing: '0.2em',
  },
  subtitle: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 'clamp(18px, 4vw, 28px)',
    fontWeight: 600,
    color: '#F8F9FA',
    letterSpacing: '0.1em',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    letterSpacing: '0.08em',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    maxWidth: 320,
    marginTop: 16,
  },
  primaryBtn: {
    padding: '14px 32px',
    background: 'transparent',
    border: '2px solid #00D4FF',
    borderRadius: 4,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.15em',
    boxShadow: '0 0 15px rgba(0,212,255,0.4), inset 0 0 15px rgba(0,212,255,0.05)',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '14px 32px',
    background: 'transparent',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#F8F9FA',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.1em',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
}
