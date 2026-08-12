# 🦆 DuckNote

DuckNote is a private note-sharing app designed for sending personal text and audio notes directly to another person.

## ✨ Features

- 📝 Send text notes
- 🎙️ Send audio notes
- ❤️ React to received notes
- 🔔 Push notifications
- 📱 Android application
- 🧩 Android home-screen widget
- ▶️ Play audio directly from the widget
- 🔐 Supabase authentication
- ☁️ Supabase backend

## 📱 Android App

DuckNote has a native Android application built with Capacitor.

The Android version includes native functionality for:

- Home-screen widgets
- Widget reactions
- Audio playback
- Background audio playback
- Push notifications

### Download

The latest Android APK will be available in the project's GitHub Releases:

**[Download DuckNote for Android](https://github.com/nourTRYTOIMPROVE/Ducknote/releases)**

> DuckNote is currently distributed directly as an APK and is not distributed through Google Play.

## 🌐 Web App

DuckNote is also available as a web application.

The web version is deployed separately through Vercel.

## 🛠️ Tech Stack

- React
- TypeScript / JavaScript
- Vite
- Capacitor
- Android
- Supabase
- Vercel

## 🚀 Development

Clone the repository:

```bash
git clone https://github.com/nourTRYTOIMPROVE/Ducknote.git
cd Ducknote

Install dependencies:

npm install

Run the web application locally:

npm run dev

Build the web application:

npm run build

Sync the Android project:

npx cap sync android

Build the Android release:

cd android
./gradlew assembleRelease

The generated release APK can be found at:

android/app/build/outputs/apk/release/app-release.apk
📦 Releases

Android releases are distributed through GitHub Releases.

Each release should include a version number, for example:

DuckNote v1.0

with the corresponding APK attached to the release.

🧪 Project Status

DuckNote is currently in active development and testing.

Known Issue
The Like/reaction state between the Android app and the home-screen widget may not always synchronize correctly.
🔐 Security

Do not commit private credentials, passwords, signing keys, or keystore files to this repository.

The Android release signing key is stored separately from the project source code.

📄 License

This project is currently intended for personal and testing use.
