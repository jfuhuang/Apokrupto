import { useState } from 'react'
import AnimatedBackground from '../components/AnimatedBackground.jsx'
import { login } from '../utils/api.js'

export default function LoginScreen({ onSuccess, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    if (!username.trim() || !password) return setError('Please fill in all fields.')
    setLoading(true)
    const res = await login(username.trim(), password)
    setLoading(false)
    if (!res.ok) return setError(res.data?.error || res.data?.message || 'Login failed.')
    onSuccess(res.data.token, res.data.username)
  }

  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.card}>
        <button style={styles.backBtn} onClick={onBack}>← BACK</button>
        <h2 style={styles.title}>LOGIN</h2>
        <p style={styles.subtitle}>Enter the shadows</p>

        <div style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>USERNAME</label>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="your_username"
              autoComplete="username"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>PASSWORD</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.submitBtn} onClick={handleLogin} disabled={loading}>
            {loading ? 'LOGGING IN...' : 'LOGIN'}
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
    padding: 24,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 420,
    background: 'rgba(31, 40, 51, 0.9)',
    border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: 8,
    padding: '40px 32px',
    boxShadow: '0 0 40px rgba(0,212,255,0.1)',
    animation: 'fadeIn 0.4s ease-out',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#ADB5BD',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    marginBottom: 24,
    padding: 0,
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#00D4FF',
    textShadow: '0 0 15px rgba(0,212,255,0.5)',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 14,
    color: '#ADB5BD',
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    color: '#ADB5BD',
    letterSpacing: '0.12em',
  },
  input: {
    background: 'rgba(11, 12, 16, 0.8)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '12px 14px',
    color: '#F8F9FA',
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#FF3366',
    fontFamily: 'Exo 2, sans-serif',
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: 8,
    padding: '14px 32px',
    background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))',
    border: '2px solid #00D4FF',
    borderRadius: 4,
    color: '#00D4FF',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(0,212,255,0.3)',
    transition: 'all 0.2s',
  },
}
