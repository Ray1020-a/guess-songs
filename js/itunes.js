// 透過 iTunes Search API 取得歌手的歌曲與 30 秒官方試聽片段。
// 不需要 API key；優先用 fetch，被 CORS 擋掉時改用 JSONP。
(function () {
  const ENDPOINT = "https://itunes.apple.com/search";
  const EXCLUDE = /remix|live|karaoke|instrumental|acoustic|demo|a cappella|acapella|version|edit\)|mix\)|commentary|interview|伴奏|純音樂|現場/i;

  function buildUrl(term, country) {
    const params = new URLSearchParams({
      term,
      entity: "song",
      attribute: "artistTerm",
      limit: "200",
      country,
    });
    return `${ENDPOINT}?${params}`;
  }

  function jsonp(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const cb = `__guessJsonp${Date.now()}${Math.floor(Math.random() * 1e6)}`;
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

  // 把 "Bad Romance (Radio Edit)"、"Telephone (feat. Beyoncé)" 等變體歸成同一首；保留中日文字元
  function normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/\s*[\(\[（【].*?[\)\]）】]/g, "")
      .replace(/\s+-\s+.*$/, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function displayTitle(title) {
    return title.replace(/\s*[\(\[](feat|with)\.?[^\)\]]*[\)\]]/gi, "").trim();
  }

  const isSingle = (album) => /\s-\s(single|ep)$/i.test(album || "");

  // 同一首歌有多個版本時，優先選正規專輯、再選最早發行的，年份和專輯資訊才會正確
  function better(a, b) {
    if (isSingle(a.rawAlbum) !== isSingle(b.rawAlbum)) return isSingle(a.rawAlbum) ? b : a;
    return (a.date || Infinity) <= (b.date || Infinity) ? a : b;
  }

  function toSongs(results, artist) {
    const seen = new Map();
    for (const r of results || []) {
      if (r.kind !== "song" || !r.previewUrl || !r.trackName) continue;
      if (!artist.match.test(r.artistName || "")) continue;
      if (EXCLUDE.test(r.trackName) || /karaoke|tribute/i.test(r.collectionName || "")) continue;
      if (artist.excludeCollection && artist.excludeCollection.test(r.collectionName || "")) continue;
      const key = normalizeTitle(r.trackName);
      if (!key) continue;
      const date = r.releaseDate ? Date.parse(r.releaseDate) : 0;
      const song = {
        id: r.trackId,
        title: displayTitle(r.trackName),
        artist: r.artistName,
        rawAlbum: r.collectionName || "",
        album: (r.collectionName || "").replace(/\s*[\(\[].*?[\)\]]/g, "").trim(),
        year: date ? new Date(date).getFullYear() : null,
        date,
        genre: r.primaryGenreName || "",
        durationMs: r.trackTimeMillis || 0,
        artwork: (r.artworkUrl100 || "").replace("100x100", "400x400"),
        previewUrl: r.previewUrl,
        link: r.trackViewUrl,
        key,
      };
      seen.set(key, seen.has(key) ? better(seen.get(key), song) : song);
    }
    return [...seen.values()];
  }

  async function fetchSongs(artist) {
    let lastError;
    for (const country of artist.countries) {
      try {
        const data = await request(buildUrl(artist.term, country));
        const songs = toSongs(data.results, artist);
        if (songs.length >= 4) return songs;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("找不到足夠的歌曲");
  }

  window.ITunes = { fetchSongs, normalizeTitle, isSingle };
})();
