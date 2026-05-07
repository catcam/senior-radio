import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://radio.hrt.hr/slusaonica';
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const CACHE_TTL_MS = 30 * 60 * 1000;

const memCache = {};
const STORAGE_KEY = (slug) => `@senior_radio:last:${slug}`;

function formatDate() {
  const d = new Date();
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function extractMp3Url(html) {
  const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('NEXT_DATA_NOT_FOUND');
  const blob = scriptMatch[1];
  const mp3Match = blob.match(/https:\/\/api\.hrt\.hr\/media\/[^"\\]+\.mp3/);
  if (!mp3Match) throw new Error('MP3_URL_NOT_FOUND');
  return mp3Match[0];
}

export async function fetchTrack(slug) {
  // in-memory cache (30 min)
  const cached = memCache[slug];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  try {
    const res = await fetch(`${BASE_URL}/${slug}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'hr-HR,hr;q=0.9,en;q=0.5',
      },
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const html = await res.text();
    const url = extractMp3Url(html);
    const data = {
      url,
      title: slug === 'vijesti' ? 'Vijesti' : 'Dnevnik',
      date: formatDate(),
      offline: false,
    };
    memCache[slug] = { data, ts: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY(slug), JSON.stringify({ ...data, offline: true }));
    return data;
  } catch (onlineErr) {
    // offline fallback — last known URL
    const raw = await AsyncStorage.getItem(STORAGE_KEY(slug));
    if (raw) return { ...JSON.parse(raw), offline: true };
    const e = new Error('NO_CONNECTION_AND_NO_CACHE');
    e.cause = onlineErr;
    throw e;
  }
}

export function describeError(err) {
  const msg = err?.message || '';
  if (msg === 'NEXT_DATA_NOT_FOUND') return 'HRT je promijenio strukturu stranice — javite programeru.';
  if (msg === 'MP3_URL_NOT_FOUND') return 'Emisija trenutno nije dostupna na HRT-u.';
  if (msg === 'NO_CONNECTION_AND_NO_CACHE') return 'Nema internetske veze i nema snimljene kopije.';
  if (msg.startsWith('HTTP_')) return `HRT server vratio grešku (${msg.slice(5)}).`;
  return 'Nepoznata greška. Pokušajte ponovo.';
}

export function invalidateCache(slug) {
  delete memCache[slug];
}
