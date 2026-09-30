// 透過 iTunes Search API 取得 Lady Gaga 歌曲的 30 秒官方試聽片段。
// 不需要 API key；優先用 fetch，被 CORS 擋掉時改用 JSONP。
(function () {
  const ENDPOINT = "https://itunes.apple.com/search";
  const EXCLUDE = /remix|live|karaoke|instrumental|acoustic|demo|a cappella|acapella|version|edit\)|mix\)|commentary|interview/i;

  function buildUrl(country) {
    const params = new URLSearchParams({
      term: "lady gaga",
      entity: "song",
      attribute: "artistTerm",
      limit: "200",
      country,
    });
    return `${ENDPOINT}?${params}`;
  }

  function jsonp(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const cb = `__gagaJsonp${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      const script = document.createElement("script");
      const cleanup = () => {
        delete window[cb];
        script.remove();
        clearTimeout(timer);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP timeout"));
      }, timeoutMs);
      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP failed"));
      };
      script.src = `${url}&callback=${cb}`;
      document.head.appendChild(script);
    });
  }

  async function request(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return jsonp(url);
    }
  }

  // 把 "Bad Romance (Radio Edit)"、"Telephone (feat. Beyoncé)" 等變體歸成同一首
  function normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/\s*[\(\[].*?[\)\]]/g, "")
      .replace(/\s+-\s+.*$/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function displayTitle(title) {
    return title.replace(/\s*[\(\[](feat|with)\.?[^\)\]]*[\)\]]/gi, "").trim();
  }

  function toSongs(results) {
    const seen = new Map();
    for (const r of results || []) {
      if (r.kind !== "song" || !r.previewUrl || !r.trackName) continue;
      if (!/lady gaga/i.test(r.artistName || "")) continue;
      if (EXCLUDE.test(r.trackName) || /karaoke|tribute/i.test(r.collectionName || "")) continue;
      const key = normalizeTitle(r.trackName);
      if (!key || seen.has(key)) continue;
      seen.set(key, {
        id: r.trackId,
        title: displayTitle(r.trackName),
        artist: r.artistName,
        album: (r.collectionName || "").replace(/\s*[\(\[].*?[\)\]]/g, "").trim(),
        year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : null,
        artwork: (r.artworkUrl100 || "").replace("100x100", "400x400"),
        previewUrl: r.previewUrl,
        link: r.trackViewUrl,
        key,
      });
    }
    return [...seen.values()];
  }

  async function fetchGagaSongs() {
    let lastError;
    for (const country of ["tw", "us"]) {
      try {
        const data = await request(buildUrl(country));
        const songs = toSongs(data.results);
        if (songs.length >= 4) return songs;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("找不到足夠的歌曲");
  }

  window.ITunes = { fetchGagaSongs, normalizeTitle };
})();
