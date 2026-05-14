// PWA scraper radi drugačije od native verzije – HRT blokira direktne fetch pozive
// iz browsera zbog CORS-a, pa ne možemo scrapeati stranicu direktno.
// Rješenje: GitHub Actions svako malo skine novu epizodu i spremi je kao JSON u repo.
// Ovdje samo čitamo taj JSON – jednostavno i radi svugdje.

// JSON podaci su u pwa/data/{slug}.json, commitani u repo
const DATA_BASE = 'https://raw.githubusercontent.com/catcam/senior-radio/master/pwa/data';

// Mora biti isto što i GitHub CDN TTL (5 min) – nema smisla tražiti češće
const CACHE_TTL = 5 * 60 * 1000;

// Drži podatke u memoriji dok je tab otvoren – bez ovoga svaki pritisak ide na mrežu
const memCache = {};

/**
 * Dohvati podatke o emisiji – isto kao u native verziji, ali bez AsyncStoragea.
 *
 * Redoslijed:
 *   1. Memory cache (dok je tab živ)
 *   2. GitHub raw JSON s cache-bustingom
 *   3. localStorage ako nema neta
 */
export async function fetchTrack(slug) {
  const now = Date.now();
  if (memCache[slug] && now - memCache[slug].ts < CACHE_TTL) {
    return memCache[slug].data;
  }

  const storageKey = `sr_cache_${slug}`;
  try {
    // Bucket je cjelobrojna podjela trenutnog vremena s TTL-om –
    // mijenja se svakih 5 minuta, poravnato s GitHub CDN invalidacijom
    const bucket = Math.floor(now / CACHE_TTL);
    const res = await fetch(`${DATA_BASE}/${slug}.json?b=${bucket}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ep = await res.json();
    const data = { url: ep.url, broadcastTime: formatTime(ep.broadcastStart), caption: ep.caption || null, offline: false };
    memCache[slug] = { ts: now, data };
    // localStorage može baciti iznimku u private browsing modu ili kad je storage pun –
    // ignoriramo to jer je localStorage samo optimizacija, ne kritična funkcionalnost
    try { localStorage.setItem(storageKey, JSON.stringify({ ts: now, data })); } catch (_) {}
    return data;
  } catch (err) {
    // Mreža nije dostupna – pokušavamo s lokalno snimljenom kopijom
    const stored = localStorage.getItem(storageKey);
    if (stored) return { ...JSON.parse(stored).data, offline: true };
    throw err;
  }
}

/**
 * Formatira ISO datum emitiranja u čitljivi hrvatski format koristeći Intl API.
 * Rezultat: "DD.MM.YYYY. HH:MM"
 */
function formatTime(broadcastStart) {
  if (!broadcastStart) return null;
  const d = new Date(broadcastStart);
  const day = d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

/**
 * Briše cache za danu postaju iz oba sloja (memory i localStorage).
 * Poziva se nakon greške da sljedeći pokušaj svježe dohvati podatke.
 */
export function invalidateCache(slug) {
  delete memCache[slug];
  localStorage.removeItem(`sr_cache_${slug}`);
}
