# Test Plan for Initial Loading Page

## Overview
This document outlines the test scenarios for the initial loading page implementation.

## Test Scenarios

### 1. Welcome Screen
**Objective**: Verify the welcome screen displays correctly with animated background

**Test Steps**:
1. Launch the app for the first time
2. Verify the welcome screen appears with:
   - "APOKRUPTO" title
   - "Real World Deception" subtitle
   - "CREATE ACCOUNT" button
   - "LOGIN" button
3. Observe the animated background:
   - Multiple green dots floating around
   - Some red dots (impostors) moving
   - Lines connecting nearby dots
   - Red dots occasionally "killing" connected green dots
   - Killed dots respawning after a delay

**Expected Results**: 
- All UI elements render correctly
- Animation runs smoothly at ~30 FPS
- Buttons are responsive to touch

### 2. Registration Flow

#### 2.1 Valid Registration
**Test Steps**:
1. Tap "CREATE ACCOUNT" button
2. Enter valid credentials:
   - Username: "testuser123"
   - Email: "test@example.com"
   - Password: "TestPass123"
   - Confirm Password: "TestPass123"
3. Tap "CREATE ACCOUNT" button

**Expected Results**:
- Success alert appears
- User is redirected to login screen
- Backend creates user account

#### 2.2 Invalid Username
**Test Steps**:
1. Enter username with special characters: "test@user!"
2. Attempt to register

**Expected Results**:
- Error message: "Username can only contain letters, numbers, and underscores"
- Form does not submit

#### 2.3 Invalid Email
**Test Steps**:
1. Enter invalid email: "notanemail"
2. Attempt to register

**Expected Results**:
- Error message: "Invalid email format"
- Form does not submit

#### 2.4 Weak Password
**Test Steps**:
1. Enter password: "weak"
2. Attempt to register

**Expected Results**:
- Error message: "Password must be at least 8 characters"
- Form does not submit

#### 2.5 Password Missing Requirements
**Test Steps**:
1. Enter password: "password123" (no uppercase)
2. Attempt to register

**Expected Results**:
- Error message: "Password must contain uppercase, lowercase, and number"
- Form does not submit

#### 2.6 Password Mismatch
**Test Steps**:
1. Enter password: "TestPass123"
2. Enter confirm password: "TestPass456"
3. Attempt to register

**Expected Results**:
- Error message: "Passwords do not match"
- Form does not submit

#### 2.7 Duplicate User
**Test Steps**:
1. Register with existing username/email
2. Tap "CREATE ACCOUNT"

**Expected Results**:
- Alert: "Username or email already exists. Please choose different credentials."
- User remains on registration screen

### 3. Login Flow

#### 3.1 Valid Login
**Test Steps**:
1. Navigate to login screen
2. Enter valid credentials (username or email)
3. Enter correct password
4. Tap "LOGIN" button

**Expected Results**:
- JWT token is stored in SecureStore
- User navigates to lobby screen
- Loading indicator shows during API call

#### 3.2 Invalid Credentials
**Test Steps**:
1. Enter incorrect username/password
2. Tap "LOGIN" button

**Expected Results**:
- Alert: "Invalid username/email or password. Please try again."
- User remains on login screen
- Form is cleared for retry

#### 3.3 Missing Fields
**Test Steps**:
1. Leave username/email blank
2. Tap "LOGIN" button

**Expected Results**:
- Error message: "Username or email is required"
- Form does not submit

### 4. Token Persistence

#### 4.1 App Restart After Login
**Test Steps**:
1. Login successfully
2. Navigate to lobby
3. Close the app completely
4. Reopen the app

**Expected Results**:
- App shows loading screen briefly
- User is automatically logged in
- Lobby screen appears without requiring login

#### 4.2 Logout
**Test Steps**:
1. From lobby screen, tap "Logout" button

**Expected Results**:
- JWT token is removed from SecureStore
- User navigates back to welcome screen
- On app restart, user must login again

### 5. Navigation

#### 5.1 Back Navigation
**Test Steps**:
1. From registration screen, tap "← Back"
2. From login screen, tap "← Back"

**Expected Results**:
- User returns to welcome screen
- Form data is cleared

### 6. Error Handling

#### 6.1 Network Error
**Test Steps**:
1. Disable network connection
2. Attempt to login or register

**Expected Results**:
- Alert: "Network error. Please check your connection and try again."
- Loading indicator stops
- User can retry

#### 6.2 Server Error
**Test Steps**:
1. Stop the backend server
2. Attempt to login or register

**Expected Results**:
- Appropriate error message displayed
- Loading indicator stops
- User can retry

## Manual Testing Instructions

### Prerequisites
1. Backend server running at http://localhost:3000
2. Expo CLI installed
3. iOS Simulator or Android Emulator running

### Running Tests
```bash
# Start the server
cd server
npm start

# In a new terminal, start the client
cd client
npm start

# Press 'i' for iOS or 'a' for Android
```

### Test Data
Create test accounts with various scenarios:
- Valid: username="test1", email="test1@test.com", password="TestPass123"
- Valid: username="test2", email="test2@test.com", password="SecurePass456"

## Known Limitations

1. **Animation Performance**: The animated background may impact performance on lower-end devices. This is acceptable for the MVP.

2. **Navigation**: Currently using state-based navigation. Future enhancement: React Navigation.

3. **Offline Support**: App requires network connection for all authentication operations.

4. **API URL**: Must be manually configured in config.js for different environments.

## Success Criteria

All test scenarios pass with expected results:
- ✅ Welcome screen renders with animation
- ✅ Registration validates all fields correctly
- ✅ Login stores JWT token securely
- ✅ Token persistence works across app restarts
- ✅ Logout clears token and returns to welcome
- ✅ Error handling works for network and validation errors
- ✅ Navigation between screens works correctly
