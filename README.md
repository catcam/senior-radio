# Senior Radio

Aplikacija za starije ljude koji žele slušati HRT Radio na Androidu i iPhoneu. Dva velika gumba — **VIJESTI** i **DNEVNIK** — i ništa više. Tapneš, svira. Tapneš opet, stane.

Dostupno kao:
- **Android APK** — direktna instalacija, nema Play Storea
- **iOS / web PWA** — Safari → "Add to Home Screen" → izgleda kao nativna app

Web verzija: **[seniori.org](https://seniori.org)** | PWA: **[catcam.github.io/senior-radio](https://catcam.github.io/senior-radio/)**

## Što radi

- Dva gumba, 44pt, tamno plava pozadina — vidljivo i po slabom svjetlu
- Datum i vrijeme emitiranja na gumbu (npr. `09.05.2026. 08:00`) — odmah znaš koliko su vijesti svježe
- 15-minutni cache — ne fetcha HRT na svaki tap
- Offline fallback — zadnja poznata epizoda ako nema interneta
- Ekran ostaje upaljen dok svira, gasi se kad prestane
- Audio u pozadini — možeš zaključati ekran
- Singleton zaštita — ako otvoriš app dvaput, drugi prozor pokazuje "Radio već radi"

## Platforme

### Android (native)

React Native app, `fetch()` je nativan HTTP — nema CORS-a. Scraper radi direktno unutar aplikacije.

### iOS / PWA

Browser CORS blokira direktan fetch HRT stranice, pa PWA koristi GitHub Actions koji svakih 15 minuta server-side fetchira HRT i commitira `pwa/data/{slug}.json` na repo. PWA čita s `raw.githubusercontent.com` (CORS `*`). Singleton zaštita via Web Locks API.

Web verzija na seniori.org koristi Flask backend kao proxy — isti rezultat, ali sa statistikom slušanja.

## Kako radi scraper (Android)

HRT-ova web stranica koristi Next.js. Svaka slusaonica stranica sadrži `<script id="__NEXT_DATA__">` s JSON podacima o epizodi:

1. Fetch `https://radio.hrt.hr/slusaonica/{vijesti|dnevnik}`
2. Regex izvuče `__NEXT_DATA__` script tag
3. JSON parse → `lastAvailableEpisode.audio.metadata[0].path` = MP3 URL
4. `broadcastStart` = točno vrijeme emitiranja (UTC)

User-Agent i Referer su postavljeni na `SeniorRadio/1.0 (+https://seniori.org)` — vidljivo u HRT logovima.

### Ako HRT promijeni strukturu

Otvori `https://radio.hrt.hr/slusaonica/vijesti` u DevToolsu, pogledaj `__NEXT_DATA__` JSON. Promjena je u `src/scraper.js` → OTA update, bez rebuildanja APK-a.

## Struktura projekta

```
App.js                          — UI: gumbi, progress bar, audio state
src/scraper.js                  — Android HRT scraper + cache
app.json                        — Expo config (permissions, launchMode, bundle ID)
eas.json                        — EAS build profili
assets/                         — ikone i splash screen
pwa/
  index.html                    — PWA UI (isti vizual kao Android)
  scraper.js                    — Browser scraper (čita iz pwa/data/ na raw.github)
  sw.js                         — Service worker, app shell cache
  manifest.json                 — PWA manifest (standalone, ikone)
  data/vijesti.json             — Automatski update svakih 15 min (GitHub Actions)
  data/dnevnik.json             — Automatski update svakih 15 min (GitHub Actions)
.github/workflows/
  pages.yml                     — Deploy PWA na GitHub Pages
  update-data.yml               — Cron: fetchira HRT, commitira JSON
```

## Build

Trebaš Expo account (besplatan) i `eas-cli`:

```bash
npm install -g eas-cli
eas login
```

### Android APK

```bash
npm install
eas build -p android --profile production
```

Build se vrši u EAS cloudu (5-15 min). APK link stiže u [EAS Dashboard](https://expo.dev). Instalacija zahtijeva "Install from unknown sources".

### OTA update (JS-only promjene)

```bash
CI=1 EXPO_TOKEN=... npx eas update --channel production --message "opis"
```

App preuzme update pri sljedećem pokretanju. Bez reinstalacije.

## Android dozvole

- `INTERNET` — fetchanje HRT stranica i stream
- `ACCESS_NETWORK_STATE` — detekcija offline stanja
- `WAKE_LOCK` + `FOREGROUND_SERVICE` — audio u pozadini

## Bundle ID

`hr.barlovic.seniorradio` (Android i iOS)

---

**Autori:** Nikša Barlović i Claude (Anthropic)
