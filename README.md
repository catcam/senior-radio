# Senior Radio

A simple, elder-friendly audio app for listening to HRT Radio (Croatian national broadcaster) on Android. Two large buttons: **VIJESTI** (news) and **DNEVNIK** (evening program). Tap to play, tap again to stop.

## Features

- **Two big buttons** — large, high-contrast UI designed for older adults
- **Offline support** — caches last successful stream; plays it if connection drops
- **No backend required** — scraper runs inside the app
- **Live MP3 extraction** — fetches HRT pages in real-time, extracts stream URL via regex
- **30-minute cache** — both in-memory and persistent (AsyncStorage)
- **Screen-always-on** — keeps display active during playback via `expo-keep-awake`
- **Background audio** — audio continues if user switches apps (iOS) or screen locks
- **OTA updates** — JavaScript-only changes auto-update via `expo-updates`

## Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Audio**: `expo-av` for playback
- **Storage**: `@react-native-async-storage/async-storage` for offline cache
- **Keep-awake**: `expo-keep-awake` to prevent screen sleep
- **OTA**: `expo-updates` for hotfixes

## Project Structure

```
senior-radio/
  App.js              — main UI (buttons, progress, playback state)
  src/scraper.js      — HRT scraper + in-memory + AsyncStorage cache
  app.json            — Expo config (permissions, bundle IDs, plugins)
  eas.json            — EAS build profiles (Android APK)
  assets/             — icons and splash screen
  package.json        — dependencies
```

## How the Scraper Works

1. Fetches `https://radio.hrt.hr/slusaonica/{vijesti|dnevnik}`
2. Extracts HTML `<script id="__NEXT_DATA__">` tag
3. Regex-matches MP3 URL: `https://api.hrt.hr/media/*.mp3`
4. Returns `{ url, title, date, offline }`

**Cache logic:**
- In-memory cache (30 min): fast subsequent clicks within same session
- AsyncStorage: persists last known URL across app restarts
- If online fetch fails, falls back to stored URL with `offline: true` flag

## Build & Deploy

### Prerequisites

```bash
npm install -g eas-cli
eas login  # requires Expo account (free)
```

### Build Android APK

```bash
cd /home/botuser/senior-radio
npm install
eas build -p android --profile preview
```

- Takes 5–10 minutes
- APK download link appears in [EAS Dashboard](https://expo.dev)
- Transfer to Android phone (USB or email) and install

### Build iOS App Bundle

```bash
eas build -p ios --profile production
```

iOS supports background audio and "Add to Home Screen" (iOS 17+). PWA version not yet built.

## If HRT Changes Page Structure

HRT occasionally restructures their website. If the app can't find the stream:

1. **Open browser DevTools** on a PC/Mac
2. **Fetch** `https://radio.hrt.hr/slusaonica/vijesti`
3. **Inspect** the HTML response
4. **Find** the `<script id="__NEXT_DATA__">` tag
5. **Trace** where the MP3 URL moved to

Then edit `src/scraper.js`, specifically the `extractMp3Url()` function:

```javascript
function extractMp3Url(html) {
  const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('NEXT_DATA_NOT_FOUND');
  const blob = scriptMatch[1];
  const mp3Match = blob.match(/https:\/\/api\.hrt\.hr\/media\/[^"\\]+\.mp3/);
  if (!mp3Match) throw new Error('MP3_URL_NOT_FOUND');
  return mp3Match[0];
}
```

Adjust the regex if the URL pattern or location changes. **JavaScript-only changes deploy via OTA update** — no rebuild needed.

## Android Permissions

```json
{
  "android.permission.INTERNET": "Fetch HRT pages and stream audio",
  "android.permission.ACCESS_NETWORK_STATE": "Detect offline state",
  "android.permission.WAKE_LOCK": "Keep CPU active during playback",
  "android.permission.FOREGROUND_SERVICE": "Background audio"
}
```

## Offline Behavior

When playing from cache (no internet):
- Yellow note below progress bar: **"Reproducira se snimljena kopija"** (Playing cached copy)
- Last successful stream URL is played
- User can see date of cached broadcast

If no internet **and** no cache → error alert: **"Nema internetske veze i nema snimljene kopije"**

## Error Messages (User-Friendly Croatian)

| Error | Cause |
|-------|-------|
| HRT je promijenio strukturu stranice — javite programeru. | `__NEXT_DATA__` script tag not found |
| Emisija trenutno nije dostupna na HRT-u. | MP3 URL not found in page |
| Nema internetske veze i nema snimljene kopije. | Offline + no cache |
| HRT server vratio grešku (XXX). | HTTP status error |

## Development

Install dependencies:
```bash
npm install
```

Run on emulator or device:
```bash
npx expo start
```

Scan QR code with **Expo Go** app (Android/iOS).

## Bundle ID

- **Android**: `hr.barlovic.seniorradio`
- **iOS**: `hr.barlovic.seniorradio`

## Notes

- App uses **light mode only** — no dark mode toggle
- Designed for **portrait orientation** (locks on Android, suggests portrait on iOS)
- Colors: dark blue (`#0B1F4D`) background, large white text (44–52px)
- Audio plays in background on Android (foreground service), iOS requires "Add to Home Screen" for persistent background audio
