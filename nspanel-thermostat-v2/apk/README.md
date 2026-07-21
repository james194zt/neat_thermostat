# Build the sideload APK (Android Studio or Gradle)

This is a minimal full-screen WebView shell for the thermostat app. It loads:

```text
http://192.168.0.6:8123/local/nspanel-thermostat/index.html
```

Deploy the web app to Home Assistant **before** installing the APK.

## Requirements

- Android Studio Ladybug or newer, **or**
- JDK 17 + Android SDK with `gradle`

## Build with Android Studio

1. Open `nspanel-thermostat/apk` in Android Studio
2. Wait for Gradle sync
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. APK output: `apk/app/build/outputs/apk/debug/app-debug.apk`

## Build from command line

```powershell
cd nspanel-thermostat\apk
.\gradlew assembleDebug
```

## Install on NSPanel Pro Gen2

```powershell
adb connect <panel-ip>
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Set as Home App in the panel **Apps** menu, or use NSPanel Pro Tools to set the launch app.

## Change the HA URL

Edit `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "HA_THERMOSTAT_URL", "\"http://192.168.0.6:8123/local/nspanel-thermostat/index.html\"")
```

Rebuild after changing.

## First launch

The APK opens the standalone web app. Enter a long-lived access token on first run.

For token-free operation, use the **F-Droid HA Companion** route instead (recommended).

## Capacitor alternative

If you install Node.js later, the Capacitor scaffold in the parent folder can also build an APK:

```powershell
cd nspanel-thermostat
npm install
npx cap add android
npx cap sync android
```

The `apk/` folder works without Node.js.
