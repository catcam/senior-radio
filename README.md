# Senior Radio

Napravili smo ovo za ljude koji ne vide dobro, ne snalaze se s tehnologijom, i kojima je svejedno što je PWA. Njima treba samo — tapneš, svira.

Dva gumba. **VIJESTI** i **DNEVNIK**. Tamno plava pozadina, slova 44pt. Tapneš, čuješ vijesti. Tapneš opet, stane. Ekran se ne gasi dok svira. Ako otvoriš app dvaput, drugi put piše "Radio već radi" — jer ne, nisi glup, app je samo zaboravila da je već otvorena.

Radi na Androidu kao APK i na iPhoneu kao PWA (Safari → "Dodaj na početni zaslon").

Web verzija je na **[seniori.org](https://seniori.org)** — isti vizual, samo u browseru.
PWA je na **[catcam.github.io/senior-radio](https://catcam.github.io/senior-radio/)**.

---

## Kako radi

HRT-ova stranica za slušaonicu je Next.js app. Svaka stranica ima `<script id="__NEXT_DATA__">` tag gdje sjedi cijeli JSON s podacima o epizodi — uključujući direktan MP3 link i točno vrijeme emitiranja.

**Android scraper** (`src/scraper.js`) to fetchira direktno, bez servera, bez CORS problema — React Native `fetch()` nije browser. Podatke cachea 15 minuta u memoriji i u AsyncStorageu, tako da zadnja emisija radi i bez interneta.

**iOS/PWA** ne može to isto jer Safari blokira cross-origin requeste prema HRT-u. Zaobilazno rješenje: GitHub Actions cron svakih 15 minuta fetchira HRT server-side i commitira `pwa/data/vijesti.json` i `pwa/data/dnevnik.json`. PWA čita te fajlove s `raw.githubusercontent.com` koji ima CORS wildcard. Nije elegantno, ali radi pouzdano i bez servera.

**Web verzija** na seniori.org ide kroz Flask backend — proxy koji isti posao radi on-demand i broji koliko puta je tko pritisnuo play (statistika na `/stats`).

Svi requesti prema HRT idu s User-Agentom `SeniorRadio/1.0 (+https://seniori.org; Nikša Barlović)` i Refererom `https://seniori.org/` — da se u HRT-ovim logovima jasno vidi odakle dolazi promet.

---

## Što je unutra

```
App.js                  — sve što vidiš na ekranu (React Native)
src/scraper.js          — fetchira HRT, cachea 15 min, offline fallback (Android)
index.js                — Expo entry point
app.json                — Expo config, launchMode: singleTask (jedan prozor, uvijek)
eas.json                — EAS build profili (production, preview)
pwa/
  index.html            — isti UI za browser, Web Locks singleton zaštita
  scraper.js            — čita JSON iz pwa/data/, ne dira HRT direktno
  sw.js                 — service worker, cachea app shell, offline rad
  data/                 — vijesti.json + dnevnik.json, auto-update svakih 15 min
.github/workflows/
  pages.yml             — GitHub Pages deploy
  update-data.yml       — cron: dohvaća HRT i commitira svježe podatke
```

---

## Build

Trebaš Expo account i `eas-cli`.

```bash
npm install -g eas-cli
eas login
npm install
```

### Android APK

```bash
eas build -p android --profile production
```

Gradi se u cloudu, 10–15 min. APK link stiže na [expo.dev](https://expo.dev). Za instalaciju na uređaju treba dopustiti "Instaliraj iz nepoznatih izvora".

### OTA update (kad mijenjaš samo JavaScript)

```bash
CI=1 EXPO_TOKEN=... npx eas update --channel production --message "kratki opis promjene"
```

App povuče update pri sljedećem pokretanju. Bez reinstalacije, bez čekanja, radi automatski u pozadini.

### Lokalni development

```bash
npx expo start
```

Skeniraš QR kod s Expo Go appom na telefonu.

---

## Offline rad

Aplikacija ne zahtijeva stalni internet. Ako je emisija jednom učitana, ostaje u lokalnom cacheu (15 min na Androidu, 5 min na PWA). Korisnik čuje obavijest "Reproducira se snimljena kopija" ako je net nedostupan — aplikacija neće samo stati.

---

## Dozvole (Android)

`INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `FOREGROUND_SERVICE` — standardno za bilo što što svira audio u pozadini. Ništa neobično, ništa što ne treba.

---

## Privatnost

Aplikacija ne prikuplja nikakve podatke o korisniku. Nema registracije, nema accounta, nema analitike na uređaju. Jedini vanjski pozivi su prema HRT-u (ili GitHub raw-u za PWA verziju).

---

**Autori:** Nikša Barlović i Claude (HADS · Anthropic)
