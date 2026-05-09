# Senior Radio

Napravili smo ovo za ljude koji ne vide dobro, ne snalaze se s tehnologijom, i kojima je svejedno što je PWA. Njima treba samo — tapneš, svira.

Dva gumba. **VIJESTI** i **DNEVNIK**. Tamno plava pozadina, slova 44pt. Tapneš, čuješ vijesti. Tapneš opet, stane. Ekran se gasi kad nema zvuka. Ako otvoriš app dvaput, drugi put piše "Radio već radi" — jer ne, nisi glup, app je samo zaboravila da je već otvorena.

Radi na Androidu kao APK i na iPhoneu kao PWA (Safari → "Add to Home Screen").

Web verzija je na **[seniori.org](https://seniori.org)** — isti vizual, samo u browseru.  
PWA je na **[catcam.github.io/senior-radio](https://catcam.github.io/senior-radio/)**.

---

## Kako radi

HRT-ova stranica za slušaonicu je Next.js app. Svaka stranica ima `<script id="__NEXT_DATA__">` tag gdje sjedi cijeli JSON s podacima o epizodi — uključujući direktan MP3 link i točno vrijeme emitiranja.

Android scraper (`src/scraper.js`) to fetchira direktno, bez servera, bez CORS problema — React Native `fetch()` nije browser.

iOS/PWA ne može to isto jer Safari blokira cross-origin requeste na HRT. Zaobilazno rješenje: GitHub Actions cron svakih 15 minuta fetchira HRT server-side i commitira `pwa/data/vijesti.json` i `pwa/data/dnevnik.json`. PWA čita te fajlove s `raw.githubusercontent.com` koji ima CORS wildcard. Nije elegantno, ali radi.

Web verzija na seniori.org ide kroz Flask backend — proxy koji isti posao radi on-demand i broji koliko puta je tko pritisnuo play (statistika na `/stats`).

Svi requesti prema HRT idu s User-Agentom `SeniorRadio/1.0 (+https://seniori.org; Nikša Barlović)` i Refererom `https://seniori.org/` — da se u HRT-ovim logovima vidi odakle dolazi promet.

---

## Što je unutra

```
App.js                  — sve što vidiš na ekranu
src/scraper.js          — fetchira HRT, cachea 15 min, offline fallback
app.json                — Expo config, launchMode: singleTask (jedan prozor, uvijek)
eas.json                — EAS build profili
pwa/index.html          — isti UI za browser, Web Locks singleton zaštita
pwa/scraper.js          — čita JSON iz pwa/data/, ne dira HRT direktno
pwa/sw.js               — service worker, cachea app shell
pwa/data/               — automatski update svakih 15 min (GitHub Actions)
.github/workflows/      — pages deploy + cron za HRT data
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

Gradi se u cloudu, 10-15 min. APK link stiže na [expo.dev](https://expo.dev). Za instalaciju treba dopustiti "Install from unknown sources".

### OTA update (kad mijenjaš samo JS)

```bash
CI=1 EXPO_TOKEN=... npx eas update --channel production --message "što si promijenio"
```

App povuče update pri sljedećem pokretanju. Bez reinstalacije, bez čekanja.

### Lokalni development

```bash
npx expo start
```

Skeniraš QR Expo Go appom.

---

## Dozvole (Android)

`INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `FOREGROUND_SERVICE` — standardno za bilo što što svira audio u pozadini.

---

**Autori:** Nikša Barlović i Claude (HADS · Anthropic)
