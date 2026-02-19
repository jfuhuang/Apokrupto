# Apokrupto Font Selection Guide

## Recommended Fonts for Modern Futuristic Theme

### Primary Recommendations

#### 1. **Orbitron** (Highly Recommended)
- **Style:** Geometric, futuristic, tech-inspired
- **Best for:** Titles, headings, game UI
- **Vibe:** Sci-fi, cyberpunk, digital displays
- **Weights:** Regular (400), Medium (500), Bold (700), Black (900)
- **Free:** Yes (Google Fonts)
- **Perfect for:** "APOKRUPTO" title, button text, headers

#### 2. **Exo 2** (Highly Recommended)
- **Style:** Modern geometric sans-serif with tech feel
- **Best for:** Body text, UI elements, labels
- **Vibe:** Clean, futuristic, readable
- **Weights:** Thin to Black (100-900)
- **Free:** Yes (Google Fonts)
- **Perfect for:** Form labels, descriptions, secondary text

#### 3. **Rajdhani** (Alternative Primary)
- **Style:** Bold, condensed, tech-inspired
- **Best for:** Headings, stats, numbers
- **Vibe:** Industrial, modern, strong
- **Weights:** Light (300) to Bold (700)
- **Free:** Yes (Google Fonts)
- **Perfect for:** Game stats, player names, scores

---

## Secondary Options

### Tech/Cyber Fonts

#### **Audiowide**
- Futuristic, retro-tech aesthetic
- Great for logos and titles
- Single weight, bold presence

#### **Saira Condensed**
- Modern, tech-inspired condensed font
- Good for UI where space is limited
- Multiple weights

#### **Space Grotesk**
- Contemporary geometric sans
- Tech startup vibe
- Clean and modern

### Display Fonts (Use Sparingly)

#### **Monoton**
- Neon sign aesthetic
- Use for special moments (emergency alerts)
- Single weight

---

## Recommended Font Pairing

### Option 1: Bold & Clean (RECOMMENDED)
```
Primary Display: Orbitron Bold (900)
  - APOKRUPTO title
  - Major headings
  - Button text

Primary UI: Exo 2 (400-700)
  - Body text
  - Form labels
  - Descriptions
  - Stats

Accent/Numbers: Rajdhani Bold
  - Player counts
  - Scores
  - Timers
```

### Option 2: Geometric & Modern
```
Primary: Rajdhani (all text)
  - Consistent, industrial look
  - Use weights to create hierarchy

Accent: Orbitron (titles only)
  - Just for "APOKRUPTO" and major headers
```

### Option 3: Maximum Readability
```
Primary Display: Orbitron (titles)
Primary UI: Space Grotesk (everything else)
  - Most readable for long form
  - Still modern aesthetic
```

---

## Font Hierarchy

### For Best Results:

**Level 1 - App Title**
- Font: Orbitron Black (900)
- Size: 36-48px
- Use: "APOKRUPTO" branding

**Level 2 - Screen Titles**
- Font: Orbitron Bold (700)
- Size: 28-32px
- Use: "LOGIN", "CREATE ACCOUNT", "LOBBY"

**Level 3 - Section Headers**
- Font: Exo 2 Bold (700)
- Size: 18-20px
- Use: Form sections, card headers

**Level 4 - Body Text**
- Font: Exo 2 Regular (400)
- Size: 16px
- Use: Descriptions, info text

**Level 5 - Labels**
- Font: Exo 2 SemiBold (600)
- Size: 14px
- Use: Input labels, small headers

**Level 6 - Small Text**
- Font: Exo 2 Regular (400)
- Size: 12-14px
- Use: Hints, footnotes, tertiary info

**Special - Button Text**
- Font: Orbitron Bold (700) or Exo 2 Bold (700)
- Size: 16-18px
- Letter spacing: 2-3px
- Use: All buttons

**Special - Numbers/Stats**
- Font: Rajdhani Bold (700)
- Size: Variable
- Use: Scores, timers, counts

---

## Implementation Notes

### Letter Spacing
- Titles: 3-4px (wide spacing for tech feel)
- Buttons: 2-3px (emphasis and readability)
- Body: 0-1px (normal readability)

### Text Effects for Neon Theme
- Use text shadows for glow effect
- Increase letter spacing for futuristic feel
- ALL CAPS for titles and buttons
- Mixed case for body text (better readability)

### Accessibility
- Never go below 14px for body text
- Maintain high contrast (already good with your colors)
- Avoid all caps for long paragraphs
- Use bold weights sparingly (they glow more)

---

## Installation Instructions

1. Install expo-font:
```bash
npx expo install expo-font
```

2. Download fonts from Google Fonts or use expo-google-fonts

3. Add to app.json or load in App.js

4. Use in StyleSheet with fontFamily property

---

## Quick Start

For fastest implementation, use **expo-google-fonts**:

```bash
npx expo install expo-font @expo-google-fonts/orbitron @expo-google-fonts/exo-2 @expo-google-fonts/rajdhani
```

This gives you instant access to all weights without manual font file management.
