/**
 * Apokrupto Color Palette
 * Theme: Modern futuristic deception game
 * Inspired by: Cyberpunk aesthetics, holographic interfaces, sci-fi thrillers
 */

export const colors = {
  // Primary Colors - Core brand identity
  primary: {
    neonRed: '#FF3366',       // Impostor neon red - danger, primary actions
    electricBlue: '#00D4FF',  // Crewmate electric blue - trust, technology
    crimson: '#DC143C',       // Deep crimson - intense moments
    cyan: '#00F0FF',          // Bright cyan - highlights, active states
  },

  // Accent Colors - Futuristic highlights
  accent: {
    neonPink: '#FF006E',      // Hot pink - special emphasis
    ultraviolet: '#8B5CF6',   // Purple - premium, mysterious
    neonGreen: '#00FF9F',     // Mint green - success, vitality
    holographic: '#B4F8C8',   // Light mint - holographic effects
    amber: '#FFA63D',         // Warm amber - warnings
    magenta: '#FF00FF',       // Pure magenta - special states
  },

  // Background Colors - Layered futuristic dark theme
  background: {
    space: '#0B0C10',         // Deep space black - base layer
    void: '#1F2833',          // Dark void - primary surface
    panel: '#2C3440',         // Panel background - cards
    elevated: '#3A4150',      // Elevated surface - modals
    frost: '#45525F',         // Frosted glass effect
  },

  // Gradient Stops - For animated backgrounds
  gradients: {
    cosmic: ['#0B0C10', '#1A1B2E', '#16213E', '#0F3460'],
    impostor: ['#1A0A1F', '#2D1B3D', '#FF006E', '#DC143C'],
    crewmate: ['#0A1929', '#1B3A52', '#00D4FF', '#00F0FF'],
    victory: ['#0F2027', '#203A43', '#2C5364', '#00FF9F'],
    holographic: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE'],
  },

  // Text Colors - Hierarchy and readability
  text: {
    primary: '#F8F9FA',       // Main text - crisp white
    secondary: '#E9ECEF',     // Secondary text - soft white
    tertiary: '#ADB5BD',      // Tertiary text - medium gray
    disabled: '#6C757D',      // Disabled state
    placeholder: '#495057',   // Input placeholders
    muted: '#868E96',         // Muted text
    glow: '#FFFFFF',          // Glowing text effects
  },

  // State Colors - UI feedback with neon vibes
  state: {
    success: '#00FF9F',       // Successful actions - neon green
    error: '#FF3366',         // Errors - neon red
    warning: '#FFA63D',       // Warnings - amber
    info: '#00D4FF',          // Information - electric blue
    loading: '#8B5CF6',       // Loading states - ultraviolet
    active: '#00F0FF',        // Active/selected - cyan
  },

  // Semantic Colors - Game-specific meanings
  game: {
    impostor: '#FF3366',      // Impostor indicators - neon red
    crewmate: '#00D4FF',      // Crewmate indicators - electric blue
    dead: '#495057',          // Dead players - dark gray
    alive: '#00FF9F',         // Alive indicators - neon green
    suspicious: '#FFA63D',    // Suspicion meter - amber
    emergency: '#DC143C',     // Emergency meetings - crimson
    special: '#8B5CF6',       // Special abilities - ultraviolet
    elite: '#FF006E',         // Elite/premium - neon pink
  },

  // Border Colors - Outlines and dividers with glow
  border: {
    default: 'rgba(255, 255, 255, 0.08)',
    focus: 'rgba(0, 212, 255, 0.6)',
    error: 'rgba(255, 51, 102, 0.6)',
    subtle: 'rgba(255, 255, 255, 0.04)',
    glow: 'rgba(0, 240, 255, 0.4)',
    neon: 'rgba(255, 0, 110, 0.5)',
  },

  // Overlay Colors - Semi-transparent layers
  overlay: {
    dark: 'rgba(11, 12, 16, 0.95)',
    medium: 'rgba(11, 12, 16, 0.85)',
    light: 'rgba(11, 12, 16, 0.7)',
    glass: 'rgba(31, 40, 51, 0.8)',
    frosted: 'rgba(44, 52, 64, 0.6)',
  },

  // Shadow Colors - Neon glow effects
  shadow: {
    neonRed: '#FF3366',
    electricBlue: '#00D4FF',
    neonPink: '#FF006E',
    ultraviolet: '#8B5CF6',
    cyan: '#00F0FF',
    white: '#FFFFFF',
  },

  // Input Colors - Form elements with futuristic feel
  input: {
    background: 'rgba(31, 40, 51, 0.4)',
    backgroundFocus: 'rgba(31, 40, 51, 0.7)',
    border: 'rgba(255, 255, 255, 0.15)',
    borderFocus: 'rgba(0, 212, 255, 0.6)',
    borderError: 'rgba(255, 51, 102, 0.8)',
    glow: 'rgba(0, 240, 255, 0.2)',
  },

  // Glass Morphism - Modern UI effects
  glass: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.1)',
  },

  // Neon Glows - For special effects
  glow: {
    red: {
      soft: 'rgba(255, 51, 102, 0.3)',
      medium: 'rgba(255, 51, 102, 0.5)',
      strong: 'rgba(255, 51, 102, 0.8)',
    },
    blue: {
      soft: 'rgba(0, 212, 255, 0.3)',
      medium: 'rgba(0, 212, 255, 0.5)',
      strong: 'rgba(0, 212, 255, 0.8)',
    },
    purple: {
      soft: 'rgba(139, 92, 246, 0.3)',
      medium: 'rgba(139, 92, 246, 0.5)',
      strong: 'rgba(139, 92, 246, 0.8)',
    },
  },
};

/**
 * Usage Examples:
 * 
 * import { colors } from '../theme/colors';
 * 
 * backgroundColor: colors.primary.red
 * color: colors.text.primary
 * borderColor: colors.border.focus
 */

export default colors;
