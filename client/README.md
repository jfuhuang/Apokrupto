# Apokrupto - Client

React Native mobile client for Apokrupto game.

## Features

- **Welcome Screen** with animated background featuring floating dots
  - Red "impostor" dots that can "kill" connected green dots
  - Dots regenerate after being killed
  - Beautiful particle connection effect
  
- **User Registration**
  - Form validation (username, email, password)
  - Error handling and user feedback
  - API integration with backend
  
- **Login**
  - Username or email login
  - Secure JWT token storage
  - Form validation and error handling
  
- **Lobby** (placeholder)
  - Basic authenticated screen
  - Logout functionality

## Prerequisites

- **Node.js v20 or higher** (recommended: v20 LTS)
- npm or yarn
- Expo Go app on your mobile device, or:
  - iOS Simulator (macOS only)
  - Android Emulator (requires Android Studio)

## Installation

### 1. Install Node.js (if needed)

**Using nvm (recommended):**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell or source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v  # should show v20.x.x
```

**Alternative:** Download from [nodejs.org](https://nodejs.org)

### 2. Install dependencies

```bash
npm install
```

**Note:** If you encounter peer dependency conflicts, try:
```bash
npm install --legacy-peer-deps
```

### 3. Configure the API URL

Edit `config.js` to set your backend server URL:
- Default is `http://localhost:3000`
- For physical devices, use your computer's IP address (e.g., `http://192.168.1.100:3000`)

## Running the App

### Start the development server

```bash
npx expo start
```

This will start Metro bundler and show a QR code in your terminal.

### Run on your device or emulator

**Option 1: Physical device (easiest)**
1. Install the **Expo Go** app from the App Store (iOS) or Google Play (Android)
2. Ensure your device is on the same Wi-Fi network as your development machine
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

**Option 2: Emulator/Simulator**
```bash
# Android (requires Android Studio & emulator running)
npx expo run:android

# iOS (macOS only, requires Xcode)
npx expo run:ios
```

**Keyboard shortcuts in terminal:**
- Press `a` to open Android emulator
- Press `i` to open iOS simulator (macOS only)
- Press `r` to reload app
- Press `m` to toggle menu
- Press `c` to clear cache and restart

## Project Structure

```
client/
├── App.js                      # Main app component with navigation
├── app.json                    # Expo configuration
├── config.js                   # API configuration
├── components/
│   └── AnimatedBackground.js   # Animated dots background
└── screens/
    ├── WelcomeScreen.js        # Initial screen with login/register buttons
    ├── RegistrationScreen.js   # User registration form
    ├── LoginScreen.js          # Login form
    └── LobbyScreen.js          # Authenticated lobby (placeholder)
```

## Configuration

### API URL

Edit `config.js` to change the backend server URL:

```javascript
export const API_URL = 'http://your-server-url:3000';
```

### Expo Configuration

Edit `app.json` to customize:
- App name and slug
- Icon and splash screen
- Platform-specific settings

## Backend Integration

The app expects the following API endpoints on the backend:

- `POST /api/users/register` - Create new user account
  - Body: `{ username, email, password }`
  - Returns: `{ user }` on success, `{ error }` on failure

- `POST /api/users/login` - Login user
  - Body: `{ usernameOrEmail, password }`
  - Returns: `{ token }` (JWT) on success, `{ error }` on failure

## Development Notes

- The app uses `expo-secure-store` to securely store JWT tokens
- Form validation is performed client-side before API calls
- The animated background runs at 30 FPS for smooth performance
- Navigation is currently implemented using component state (can be upgraded to React Navigation)
- Password requirements: minimum 8 characters with uppercase, lowercase, and number

## Troubleshooting

### Node.js Version Issues

**Error: `Unexpected token '?'` or `toReversed is not a function`**

You're using an outdated Node.js version. Expo SDK 50+ requires Node 18+, and Metro bundler requires Node 20+ for full compatibility.

**Solution:**
```bash
# Using nvm
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v  # should show v20.x.x

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Expo Go SDK Version Mismatch

**Error: `Project is incompatible with this version of Expo Go`**

Your project's Expo SDK version doesn't match the Expo Go app on your device.

**Solutions:**
1. **Upgrade project (recommended):**
   ```bash
   npx expo upgrade
   npm install
   ```

2. **Install matching Expo Go:** Download the SDK-specific version from [expo.dev/go](https://expo.dev/go)

3. **Use development build (advanced):**
   ```bash
   npx expo run:android  # or run:ios
   ```

### Dependency Issues

If you encounter peer dependency conflicts:
```bash
npm install --legacy-peer-deps
```

### Network/Connection Errors

**Cannot connect to backend API:**

- Ensure the backend server is running
- Check that `API_URL` in `config.js` is correct:
  - **iOS Simulator:** Use `http://localhost:3000`
  - **Android Emulator:** Use `http://10.0.2.2:3000` (Android's special alias for host)
  - **Physical device:** Use your computer's local IP (e.g., `http://192.168.1.100:3000`)

**Find your local IP:**
```bash
# Linux/macOS
ip addr show | grep "inet " | grep -v 127.0.0.1

# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Metro Bundler Issues

**Error: Metro bundler won't start or shows cache errors**

Clear the cache and restart:
```bash
npx expo start -c
```

### Missing Assets

**Error: `Unable to resolve asset "./assets/icon.png"`**

The app references assets in `app.json` that may not exist:
1. Create an `assets/` folder if it doesn't exist
2. Add placeholder images, or
3. Remove/update asset references in `app.json`

## Next Steps

- [ ] Implement proper navigation with React Navigation
- [ ] Add loading state when app starts (check for stored JWT)
- [ ] Implement lobby functionality
- [ ] Add game screens
- [ ] Add real-time Socket.IO integration
- [ ] Implement GPS location tracking
- [ ] Add map integration
