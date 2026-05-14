// Service Worker za Senior Radio PWA
// Omogućuje offline rad i brzo učitavanje – browser ga instalira jednom,
// a onda on presreće sve mrežne zahtjeve umjesto browsera.

// Verzija cachea u imenu – kad deployamo novu verziju, samo povisimo broj
// i stari cache će se automatski obrisati pri sljedećem activateu
const CACHE_NAME = 'senior-radio-v3';

// Datoteke koje čine "shell" aplikacije – sve što treba za prikaz UI-a bez mreže
const SHELL = ['./index.html', './scraper.js', './manifest.json', './icon-192.png', './icon-512.png'];

// Install se poziva jednom kad browser preuzme novi SW.
// Cacheiramo shell odmah da aplikacija radi offline od prve posjete.
// skipWaiting() prisiljava novog SW-a da preuzme kontrolu bez čekanja
// da korisnik zatvori sve tabove – korisno kod brzih hotfixa.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// Activate se poziva kad SW preuzme kontrolu nad tabovima.
// Brišemo sve stare cacheove (oni s drugačijim imenom) da ne trošimo storage.
// clients.claim() osigurava da trenutni tabovi odmah koriste novog SW-a,
// bez potrebe za refreshom stranice.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Fetch presreće svaki mrežni zahtjev koji aplikacija šalje.
// HRT zahtjeve puštamo direktno na mrežu – ne cacheiramo audio jer su preveliki
// i svaki put treba svježi stream. Sve ostalo gledamo prvo u cacheu.
self.addEventListener('fetch', e => {
  if (e.request.url.includes('radio.hrt.hr')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
