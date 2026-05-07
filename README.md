# Senior Radio

Aplikacija za starije ljude koji žele slušati HRT Radio na Androidu. Dva velika gumba — **VIJESTI** i **DNEVNIK** — i ništa više. Tapneš, svira. Tapneš opet, stane.

Nema servera. Nema backenda. Scraper radi direktno unutar aplikacije — React Native `fetch()` je nativan HTTP poziv, ne Browser, pa nema CORS-a. MP3 URL se izvlači iz HRT-ove stranice u hodu.

## Što radi

- Dva gumba, 44pt, tamno plava pozadina — dizajnirano za starije, vidljivo i po slabom svjetlu
- Pokazuje datum i vrijeme emitiranja na gumbu (npr. `07.05. u 12:00`) — odmah znaš koliko su vijesti svježe
- 15-minutni cache — ne fetcha stranicu na svaki tap, ali ni ne drži previše stare podatke
- Ako nema interneta, pušta zadnji snimljeni stream s napomenom "Reproducira se snimljena kopija"
- Ekran ostaje upaljen dok svira (`expo-keep-awake`)
- Audio nastavlja u pozadini — možeš zaključati ekran

## Kako radi scraper

HRT-ova web stranica koristi Next.js. Svaka stranica slusaonica-e (`/slusaonica/vijesti`, `/slusaonica/dnevnik`) sadrži `<script id="__NEXT_DATA__">` tag s JSON podacima o epizodi — uključujući direktan MP3 link i `broadcastStart` timestamp.

Scraper (`src/scraper.js`) radi ovako:
1. Fetcha `https://radio.hrt.hr/slusaonica/{vijesti|dnevnik}`
2. Regex izvuče `__NEXT_DATA__` script tag
3. JSON parse → `lastAvailableEpisode.audio.metadata[0].path` = MP3 URL
4. `broadcastStart` = točno vrijeme emitiranja (UTC)

Rezultat se cachea 15 minuta u memoriji, a zadnji poznati URL se sprema u `AsyncStorage` kao offline fallback.

### Ako HRT promijeni strukturu

Povremeno se dogodi. Otvori `https://radio.hrt.hr/slusaonica/vijesti` u DevToolsu, pogledaj `__NEXT_DATA__` JSON i nađi gdje je sad MP3 URL. Promjena je u `src/scraper.js`, funkcija `extractEpisodeData()` — čisto JS, deploy ide OTA updateom bez rebuildanja APK-a.

## Struktura projekta

```
App.js            — UI: gumbi, progress bar, audio state
src/scraper.js    — HRT scraper + cache logika
app.json          — Expo config (permissions, bundle ID, plugins)
eas.json          — EAS build profili
assets/           — ikone i splash screen
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
eas build -p android --profile preview
```

Build se vrši u EAS cloudu, traje 5-15 minuta. APK link stiže u [EAS Dashboard](https://expo.dev). Instalacija na uređaju zahtijeva uključenu opciju "Install from unknown sources".

### OTA update (JS-only promjene)

Za sve promjene koje ne diraju native kod (scraper logika, UI, cache TTL...):

```bash
eas update --branch preview --message "opis promjene"
```

App preuzme update pri sljedećem pokretanju. Nema čekanja u queuu, nema reinstalacije.

## Android dozvole

- `INTERNET` — fetchanje HRT stranica i stream
- `ACCESS_NETWORK_STATE` — detekcija offline stanja
- `WAKE_LOCK` + `FOREGROUND_SERVICE` — audio u pozadini

## Bundle ID

`hr.barlovic.seniorradio` (Android i iOS)

## Razvoj

```bash
npm install
npx expo start
```

Skeniraš QR kod Expo Go appom na Androidu.

---

**Autori:** Nikša Barlović i Claude (Anthropic)
