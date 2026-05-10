
## Glasovne naredbe (ideja)
- Senior kaže "vijesti" ili "dnevnik", app reagira bez tapanja
- Web Speech API (Android/iOS PWA) ili SpeechRecognizer (native Android)
- Aktivacija: gumb "SLUŠAJ" → slušaj → okini handlePress
- Always-on varijanta: samo native Android, složenije dozvole

## Bluetooth gumb kao aktivator mikrofona (ideja)
- Jeftini BT gumb (uz selfie stick, ~$3) kao fizički aktivator
- Android: emulira KEYCODE_HEADSETHOOK / KEYCODE_MEDIA_PLAY_PAUSE
- React Native može slušati te evente
- Flow: senior pritisne gumb → mikrofon aktiviran → kaže "vijesti" → svira
- Nula gledanja u ekran, idealno za slabovide
