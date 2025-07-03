# 🚀 React Native App Deployment Guide

## ✅ Android Configuration Fixed!

I've fixed the Android configuration files with proper package naming and namespace. Here's how to deploy:

---

## 📋 Prerequisites

### 1. **Node.js Setup**
```bash
# Ensure you have Node.js 16+ installed
node --version
npm --version
```

### 2. **React Native CLI**
```bash
# Install React Native CLI globally
npm install -g @react-native-community/cli
```

### 3. **Android Studio**
- Download and install Android Studio
- Install Android SDK (API level 34)
- Set up Android emulator or connect physical device
- Enable USB debugging on physical device

### 4. **Java Development Kit**
- Install JDK 11 or newer
- Set JAVA_HOME environment variable

---

## 🛠️ Setup Steps

### 1. **Navigate to Mobile Directory**
```bash
cd mobile
```

### 2. **Install Dependencies**
```bash
# Install Node.js dependencies
yarn install

# For iOS (if developing on Mac)
cd ios && pod install && cd ..
```

### 3. **Start Metro Bundler**
```bash
# In one terminal, start the React Native packager
yarn start
```

### 4. **Run on Android**
```bash
# In another terminal, run the Android app
yarn android
```

---

## 🔧 Troubleshooting

### If you get "SDK not found" error:
1. Open Android Studio
2. Go to File → Project Structure → SDK Location
3. Note the Android SDK Location path
4. Set environment variable:
   ```bash
   # Windows
   set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
   
   # Mac/Linux
   export ANDROID_HOME=$HOME/Library/Android/sdk
   ```

### If you get "adb not found" error:
Add Android SDK platform-tools to your PATH:
```bash
# Windows
set PATH=%PATH%;%ANDROID_HOME%\platform-tools

# Mac/Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### If gradle build fails:
```bash
# Clean gradle cache
cd android
./gradlew clean
cd ..
yarn android
```

---

## 📱 Testing the App

### 1. **Login**
- Use demo PINs: Manager (1234), Cashier (5678)

### 2. **Test Features**
- Create new orders
- Test table management
- Try customer management
- Test printer setup (Settings → Printer Settings)

### 3. **Bluetooth Printer**
- Pair your Star TSP III via Bluetooth in device settings
- Open app → Settings → Printer Settings
- Scan and connect to printer
- Test print functionality

---

## 🎯 Quick Start Commands

```bash
# Complete setup and run
cd mobile
yarn install
yarn start
# In new terminal:
yarn android
```

---

## 📋 File Structure Fixed

The Android configuration now includes:
- ✅ `package="com.elmesonpos.mobile"` in AndroidManifest.xml
- ✅ `namespace "com.elmesonpos.mobile"` in build.gradle  
- ✅ `applicationId "com.elmesonpos.mobile"` configured
- ✅ MainActivity and MainApplication Java files
- ✅ Proper gradle configuration files
- ✅ App name set to "ElMesonPOS"

Your React Native app should now build and deploy successfully! 🚀📱