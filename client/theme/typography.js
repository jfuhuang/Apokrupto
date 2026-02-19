/**
 * Apokrupto Typography System
 * Modern futuristic font configuration
 */

// Font family constants
export const fonts = {
  // Primary display font - geometric, futuristic
  display: {
    regular: 'Orbitron_400Regular',
    medium: 'Orbitron_500Medium',
    bold: 'Orbitron_700Bold',
    black: 'Orbitron_900Black',
  },
  
  // Primary UI font - clean, modern, readable
  ui: {
    thin: 'Exo2_100Thin',
    light: 'Exo2_300Light',
    regular: 'Exo2_400Regular',
    medium: 'Exo2_500Medium',
    semiBold: 'Exo2_600SemiBold',
    bold: 'Exo2_700Bold',
    extraBold: 'Exo2_800ExtraBold',
    black: 'Exo2_900Black',
  },
  
  // Accent font - for numbers and stats
  accent: {
    light: 'Rajdhani_300Light',
    regular: 'Rajdhani_400Regular',
    medium: 'Rajdhani_500Medium',
    semiBold: 'Rajdhani_600SemiBold',
    bold: 'Rajdhani_700Bold',
  },
};

// Typography scale
export const typography = {
  // App title - "APOKRUPTO"
  appTitle: {
    fontFamily: fonts.display.black,
    fontSize: 36,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  
  // Screen titles - "LOGIN", "CREATE ACCOUNT"
  screenTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 32,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  
  // Large headings
  h1: {
    fontFamily: fonts.display.bold,
    fontSize: 28,
    letterSpacing: 2,
  },
  
  // Medium headings
  h2: {
    fontFamily: fonts.ui.bold,
    fontSize: 20,
    letterSpacing: 1,
  },
  
  // Small headings
  h3: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  
  // Subtitle text
  subtitle: {
    fontFamily: fonts.ui.medium,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  
  // Body text - regular
  body: {
    fontFamily: fonts.ui.regular,
    fontSize: 16,
    letterSpacing: 0,
  },
  
  // Body text - bold
  bodyBold: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
    letterSpacing: 0,
  },
  
  // Labels for inputs
  label: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  
  // Small text
  small: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    letterSpacing: 0,
  },
  
  // Button text
  button: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  
  // Secondary button
  buttonSecondary: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  
  // Numbers and stats
  numbers: {
    fontFamily: fonts.accent.bold,
    fontSize: 24,
    letterSpacing: 0,
  },
  
  // Tiny text (hints, footnotes)
  tiny: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    letterSpacing: 0,
  },
};

// Helper function to apply typography style
export const applyTypography = (variant) => {
  return typography[variant] || typography.body;
};

/**
 * Usage example:
 * 
 * import { typography } from '../theme/typography';
 * 
 * const styles = StyleSheet.create({
 *   title: {
 *     ...typography.screenTitle,
 *     color: colors.text.primary,
 *   },
 * });
 */

export default { fonts, typography, applyTypography };
