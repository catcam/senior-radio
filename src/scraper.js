import AsyncStorage from '@react-native-async-storage/async-storage';

// HRT slusaonica – tu su sve emisije, slug određuje koja
const BASE_URL = 'https://radio.hrt.hr/slusaonica';

// Javljamo se HRT-u tko smo i odakle dolazimo – fer prema njima
const USER_AGENT = 'SeniorRadio/1.0 (+https://seniori.org; Nikša Barlović)';

// 15 min je dosta – vijesti ne izlaze češće od toga
const CACHE_TTL_MS = 15 * 60 * 1000;

// Runtime cache – najbrži, živi samo dok app radi
const memCache = {};

// Prefiks da se ne pobrkamo s drugim stvarima u AsyncStorageu
const STORAGE_KEY = (slug) => `@senior_radio:last:${slug}`;

/**
 * ISO datum → "DD.MM. u HH:MM" na hrvatskom.
 * Null ako datum ne valja.
 */
function formatBroadcastTime(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d)) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}. u ${hours}:${minutes}`;
}

/**
 * Kopamo po HRT HTML-u i vadimo podatke o zadnjoj epizodi.
 *
 * Next.js stranice imaju cijeli početni state u <script id="__NEXT_DATA__"> –
 * to je puno sigurnije parsirati nego HTML koji se može promijeniti u svakom deployu.
 * Ako nešto ne nađemo, bacamo named error da odmah znamo gdje je problem.
 */
function extractEpisodeData(html) {
  const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('NEXT_DATA_NOT_FOUND');

  const json = JSON.parse(scriptMatch[1]);
  const cycle = json?.props?.pageProps?.cycle?.data?.radioCycle?.[0];
  if (!cycle) throw new Error('NEXT_DATA_NOT_FOUND');

  const ep = cycle.lastAvailableEpisode;
  const url = ep?.audio?.metadata?.[0]?.path;
  if (!url) throw new Error('MP3_URL_NOT_FOUND');

  const broadcastStart = ep?.bag?.contentItems?.[0]?.broadcastStart || null;
  const caption = ep?.caption || null;

  return { url, broadcastStart, caption };
}

/**
 * Glavni ulaz – vrati mi podatke o emisiji za tu postaju.
 *
 * Redoslijed pokušaja:
 *   1. Memory cache (najbrže, 15 min TTL)
 *   2. Live scrape s HRT-a → spremi u oba cachea
 *   3. AsyncStorage fallback ako nema neta (vrati offline: true)
 *
 * Ako ni to nema – baci grešku, nema se što raditi.
 */
export async function fetchTrack(slug) {
  const cached = memCache[slug];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  try {
    const res = await fetch(`${BASE_URL}/${slug}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://seniori.org/',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'hr-HR,hr;q=0.9,en;q=0.5',
      },
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const html = await res.text();
    const { url, broadcastStart, caption } = extractEpisodeData(html);

    const data = {
      url,
      caption,
      broadcastTime: formatBroadcastTime(broadcastStart),
      offline: false,
    };
    // Ažuriramo oba cachea – memCache za brzinu, AsyncStorage za offline fallback
    memCache[slug] = { data, ts: Date.now() };
    // Persistiramo s offline: true jer će sljedeći put biti serviran kao offline kopija
    await AsyncStorage.setItem(STORAGE_KEY(slug), JSON.stringify({ ...data, offline: true }));
    return data;
  } catch (onlineErr) {
    // Online dohvat nije uspio – pokušavamo s lokalno snimljenom kopijom
    const raw = await AsyncStorage.getItem(STORAGE_KEY(slug));
    if (raw) return { ...JSON.parse(raw), offline: true };

    // Nema ničega – propagiramo originalnu grešku kao cause za lakši debugging
    const e = new Error('NO_CONNECTION_AND_NO_CACHE');
    e.cause = onlineErr;
    throw e;
  }
}

/**
 * Svaka greška ima svoje ime – ovdje je pretvaramo u poruku za korisnika.
 * Seniori ne trebaju vidjeti stack trace, samo što napraviti dalje.
 */
export function describeError(err) {
  const msg = err?.message || '';
  if (msg === 'NEXT_DATA_NOT_FOUND') return 'HRT je promijenio strukturu stranice — javite programeru.';
  if (msg === 'MP3_URL_NOT_FOUND') return 'Emisija trenutno nije dostupna na HRT-u.';
  if (msg === 'NO_CONNECTION_AND_NO_CACHE') return 'Nema internetske veze i nema snimljene kopije.';
  if (msg.startsWith('HTTP_')) return `HRT server vratio grešku (${msg.slice(5)}).`;
  return 'Nepoznata greška. Pokušajte ponovo.';
}

/**
 * Izbaci cache za ovu postaju – pozivamo kad nešto krene po krivu
 * da sljedeći pokušaj ne pokupi stare pokvarene podatke.
 */
export function invalidateCache(slug) {
  delete memCache[slug];
}
