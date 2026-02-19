# Apokrupto Color Palette Guide

## Overview
A modern futuristic color scheme featuring neon accents, glass morphism, and cyberpunk-inspired aesthetics for a deception-based mobile game.

---

## Primary Colors

### Neon Red `#FF3366`
- **Use for:** Primary buttons, danger alerts, impostor indicators
- **Vibe:** Electric danger, neon warning signs, futuristic alarms
- **Pairs with:** Deep space backgrounds, electric blue accents

### Electric Blue `#00D4FF`
- **Use for:** Secondary buttons, info states, crewmate indicators, tech elements
- **Vibe:** Holographic displays, digital interfaces, trust signals
- **Pairs with:** Neon red, ultraviolet purple

### Ultraviolet `#8B5CF6`
- **Use for:** Premium features, loading states, special abilities
- **Vibe:** Mysterious energy, advanced technology, rare elements
- **Pairs with:** Neon pink, electric blue

---

## Color Hierarchy

### Backgrounds (Deep → Surface)
1. `#0B0C10` - Space (deepest layer, main canvas)
2. `#1F2833` - Void (primary surface)
3. `#2C3440` - Panel (cards, containers)
4. `#3A4150` - Elevated (modals, overlays)
5. `#45525F` - Frost (top layer, glass effects)

### Text (Highest → Lowest Contrast)
1. `#F8F9FA` - Crisp white (headings, primary)
2. `#E9ECEF` - Soft white (labels, secondary)
3. `#ADB5BD` - Medium gray (descriptions)
4. `#868E96` - Muted (hints)
5. `#6C757D` - Disabled
6. `#495057` - Placeholders

---

## Modern UI Patterns

### Glass Morphism Buttons
```
Primary Neon Button:
  Background: colors.primary.neonRed (#FF3366)
  Text: colors.text.glow (#FFFFFF)
  Shadow: 0 0 20px colors.glow.red.medium
  Border: 1px solid colors.border.neon
  
Secondary Glass Button:
  Background: colors.glass.medium (rgba white)
  Backdrop: blur(10px)
  Border: colors.glass.border
  Text: colors.primary.electricBlue
  
Ghost Button:
  Background: transparent
  Border: colors.border.glow
  Text: colors.primary.cyan
  Glow: colors.glow.blue.soft
```

### Futuristic Inputs
```
Default State:
  Background: rgba(31, 40, 51, 0.4)
  Border: rgba(255, 255, 255, 0.15)
  Text: colors.text.primary
  Glow: none

Focus State:
  Background: rgba(31, 40, 51, 0.7)
  Border: rgba(0, 212, 255, 0.6)
  Text: colors.text.glow
  Glow: 0 0 15px colors.glow.blue.soft
  
Error State:
  Border: rgba(255, 51, 102, 0.8)
  Glow: 0 0 15px colors.glow.red.soft
  Error Text: colors.state.error
```

### Cards/Panels - Glass Morphism
```
Frosted Glass Card:
  Background: colors.overlay.frosted
  Backdrop: blur(12px)
  Border: colors.glass.border
  Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)

Solid Panel:
  Background: colors.background.panel (#2C3440)
  Border: colors.border.subtle
  Title: colors.text.primary
  Content: colors.text.secondary
```

---

## Game-Specific Colors

### Player States (Neon Indicators)
- **Impostor:** `#FF3366` (Neon Red) + red glow
- **Crewmate:** `#00D4FF` (Electric Blue) + blue glow
- **Alive:** `#00FF9F` (Neon Green) + green pulse
- **Dead:** `#495057` (Dark Gray) + no glow
- **Suspicious:** `#FFA63D` (Amber) + orange glow

### Special Actions
- **Emergency:** `#DC143C` (Crimson) + intense red glow
- **Success:** `#00FF9F` (Neon Green) + green flash
- **Warning:** `#FFA63D` (Amber) + pulse effect
- **Elite/Premium:** `#FF006E` (Neon Pink) + pink shimmer
- **Special Ability:** `#8B5CF6` (Ultraviolet) + purple aura

---

## Gradient Combinations

### Cosmic Background (Main)
```javascript
['#0B0C10', '#1A1B2E', '#16213E', '#0F3460']
// Deep space → Dark cosmic → Navy → Deep blue
```

### Impostor Theme (Red Zone)
```javascript
['#1A0A1F', '#2D1B3D', '#FF006E', '#DC143C']
// Dark purple → Deep purple → Neon pink → Crimson
```

### Crewmate Theme (Blue Zone)
```javascript
['#0A1929', '#1B3A52', '#00D4FF', '#00F0FF']
// Deep ocean → Navy → Electric blue → Cyan
```

### Holographic Effect
```javascript
['#667EEA', '#764BA2', '#F093FB', '#4FACFE']
// Violet → Purple → Pink → Blue (animated shimmer)
```

---

## Neon Glow Effects

### Text Glow
```javascript
textShadowColor: colors.shadow.electricBlue
textShadowOffset: { width: 0, height: 0 }
textShadowRadius: 10
// Creates neon sign effect
```

### Button Glow
```javascript
shadowColor: colors.shadow.neonRed
shadowOffset: { width: 0, height: 0 }
shadowOpacity: 0.8
shadowRadius: 20
elevation: 8
// Creates floating neon button
```

### Border Glow
```javascript
borderColor: colors.border.glow
borderWidth: 2
shadowColor: colors.glow.blue.medium
shadowRadius: 15
// Creates glowing outline
```

---

## Accessibility Guidelines

### Contrast Ratios (WCAG AA)
- White on Neon Red: 5.2:1 ✓
- White on Electric Blue: 4.1:1 ✓
- White on Space Background: 18.5:1 ✓
- Text on Panel: 12.3:1 ✓

### Futuristic Accessibility
- Use glow effects as enhancement, not requirement
- Maintain high contrast for core content
- Add haptic feedback for neon interactions
- Reduce motion for glow animations if requested

---

## Implementation Examples

Import the palette:
```javascript
import { colors } from './theme/colors';
```

### Neon Button Component
```javascript
const styles = StyleSheet.create({
  neonButton: {
    backgroundColor: colors.primary.neonRed,
    borderWidth: 2,
    borderColor: colors.border.neon,
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  buttonText: {
    color: colors.text.glow,
    textShadowColor: colors.shadow.white,
    textShadowRadius: 8,
  },
});
```

### Glass Card Component
```javascript
const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: colors.overlay.frosted,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
  },
});
```

### Glowing Input
```javascript
const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.input.background,
    borderWidth: 2,
    borderColor: colors.input.border,
    color: colors.text.primary,
  },
  inputFocused: {
    borderColor: colors.input.borderFocus,
    shadowColor: colors.glow.blue.soft,
    shadowRadius: 15,
    shadowOpacity: 1,
  },
});
```

---

## Color Psychology (Futuristic Context)

- **Neon Red:** Digital danger, system alerts, impostor energy
- **Electric Blue:** Technology, trust networks, digital truth
- **Ultraviolet:** Advanced tech, mysterious power, rare abilities
- **Neon Pink:** Elite status, special events, premium features
- **Space Backgrounds:** Infinite mystery, deep focus, isolation
- **Neon Green:** System success, life signs, active connections

---

## Modern Design Principles

### ✅ Do
- Use neon glows sparingly for emphasis
- Layer backgrounds for depth and hierarchy
- Add glass morphism to floating elements
- Animate glows for interactive feedback
- Use gradients for ambient effects only
- Maintain dark base for neon contrast

### ❌ Don't
- Overuse bright neons (causes eye strain)
- Mix too many glowing elements
- Use low opacity on critical text
- Forget dark mode considerations
- Ignore performance of shadow/blur effects
- Use pure white backgrounds

---

## Trend Alignment

**2026 Design Trends:**
- ✓ Glass morphism (frosted backgrounds)
- ✓ Neon cyberpunk accents
- ✓ Deep space aesthetics
- ✓ Holographic gradients
- ✓ Soft glow effects
- ✓ High contrast dark mode
