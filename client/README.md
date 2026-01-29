# Among Us IRL - Client

React Native mobile client for Among Us IRL game.

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

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Installation

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Configure the API URL:
   - Edit `config.js` to set your backend server URL
   - Default is `http://localhost:3000`

## Running the App

Start the Expo development server:

```bash
npm start
```

This will open Expo DevTools in your browser. From there you can:
- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with Expo Go app on your physical device

### Running on Specific Platforms

```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing, limited functionality)
npm run web
```

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

### Dependency Issues

If you encounter peer dependency conflicts, use:
```bash
npm install --legacy-peer-deps
```

### Network Errors

- Ensure the backend server is running
- Check that the API_URL in `config.js` is correct
- On iOS Simulator, use `localhost`
- On Android Emulator, you may need to use `10.0.2.2` instead of `localhost`
- On physical devices, use your computer's IP address

### Assets Not Found

The app uses default Expo assets. If you want custom assets:
1. Add your images to the `assets/` folder
2. Update references in `app.json`

## Next Steps

- [ ] Implement proper navigation with React Navigation
- [ ] Add loading state when app starts (check for stored JWT)
- [ ] Implement lobby functionality
- [ ] Add game screens
- [ ] Add real-time Socket.IO integration
- [ ] Implement GPS location tracking
- [ ] Add map integration
