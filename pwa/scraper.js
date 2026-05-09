const API_BASE = 'https://seniori.org/api';
const CACHE_TTL = 15 * 60 * 1000;
const memCache = {};

export async function fetchTrack(slug) {
  const now = Date.now();
  if (memCache[slug] && now - memCache[slug].ts < CACHE_TTL) {
    return memCache[slug].data;
  }

  const storageKey = `sr_cache_${slug}`;
  try {
    const res = await fetch(`${API_BASE}/${slug}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ep = await res.json();
    if (ep.error) throw new Error(ep.error);
    const data = { url: ep.url, broadcastTime: formatTime(ep.broadcastStart), caption: ep.caption || null, offline: false };
    memCache[slug] = { ts: now, data };
    try { localStorage.setItem(storageKey, JSON.stringify({ ts: now, data })); } catch (_) {}
    return data;
  } catch (err) {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return { ...JSON.parse(stored).data, offline: true };
    }
    throw err;
  }
}

function formatTime(broadcastStart) {
  if (!broadcastStart) return null;
  const d = new Date(broadcastStart);
  const day = d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

export function invalidateCache(slug) {
  delete memCache[slug];
  localStorage.removeItem(`sr_cache_${slug}`);
}
