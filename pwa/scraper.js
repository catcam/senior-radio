const HRT_URLS = {
  vijesti: 'https://radio.hrt.hr/hr/radio-vijesti',
  dnevnik: 'https://radio.hrt.hr/hr/radio-dnevnik',
};

const CACHE_TTL = 15 * 60 * 1000;
const memCache = {};

export async function fetchTrack(slug) {
  const now = Date.now();
  if (memCache[slug] && now - memCache[slug].ts < CACHE_TTL) {
    return memCache[slug].data;
  }

  const storageKey = `sr_cache_${slug}`;
  try {
    const res = await fetch(HRT_URLS[slug]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const data = parseEpisode(html);
    memCache[slug] = { ts: now, data };
    try { localStorage.setItem(storageKey, JSON.stringify({ ts: now, data })); } catch (_) {}
    return data;
  } catch (err) {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed.data, offline: true };
    }
    throw err;
  }
}

function parseEpisode(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('__NEXT_DATA__ nije pronađen');
  const json = JSON.parse(m[1]);
  const cycle = json?.props?.pageProps?.cycle?.data?.radioCycle?.[0];
  const ep = cycle?.lastAvailableEpisode;
  const url = ep?.audio?.metadata?.[0]?.path;
  if (!url) throw new Error('MP3 URL nije pronađen');
  const broadcastStart = ep?.bag?.contentItems?.[0]?.broadcastStart || null;
  const caption = ep?.caption || null;
  let broadcastTime = null;
  if (broadcastStart) {
    const d = new Date(broadcastStart);
    const day = d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
    broadcastTime = `${day} ${time}`;
  }
  return { url, broadcastTime, caption, offline: false };
}

export function invalidateCache(slug) {
  delete memCache[slug];
  localStorage.removeItem(`sr_cache_${slug}`);
}
