// 透過 iTunes Search API 取得歌手的歌曲與 30 秒官方試聽片段。
// 不需要 API key；優先用 fetch，被 CORS 擋掉時改用 JSONP。
(function () {
  const ENDPOINT = "https://itunes.apple.com/search";
  const LOOKUP = "https://itunes.apple.com/lookup";
  const SKIP_ALBUM = /karaoke|tribute|live|remix|instrumental|commentary|interview|greatest|essential|best of|number ones|hits|collection|anthology|playlist|伴奏|精選|演唱會/i;
  // iTunes API 大約每分鐘 20 次請求，一位歌手控制在 8 次以內
  const ALBUMS_PER_REQUEST = 10;
  const MAX_ALBUMS = 60;
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

  // rank：在 iTunes 搜尋結果中的名次，越小越熱門；只在專輯曲目裡找到的歌是 Infinity
  function toSongs(results, artist) {
    const seen = new Map();
    let rank = 0;
    for (const r of results || []) {
      if (r.kind !== "song" || !r.previewUrl || !r.trackName) continue;
      if (!artist.match.test(r.artistName || "")) continue;
      if (EXCLUDE.test(r.trackName) || /karaoke|tribute/i.test(r.collectionName || "")) continue;
      if (artist.excludeCollection && artist.excludeCollection.test(r.collectionName || "")) continue;
      const key = normalizeTitle(r.trackName);
      if (!key) continue;
      const songRank = r.__fromSearch ? (seen.has(key) ? seen.get(key).rank : rank++) : Infinity;
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
        rank: songRank,
      };
      if (seen.has(key)) {
        const prev = seen.get(key);
        seen.set(key, { ...better(prev, song), rank: Math.min(prev.rank, songRank) });
      } else {
        seen.set(key, song);
      }
    }
    return [...seen.values()];
  }

  function lookupUrl(ids, entity, country) {
    const params = new URLSearchParams({ id: ids.join(","), entity, limit: "200", country });
    return `${LOOKUP}?${params}`;
  }

  // 搜尋結果裡出現最多次、且名字符合的 artistId 就是歌手本人
  function findArtistId(results, artist) {
    const counts = new Map();
    for (const r of results) {
      if (r.artistId && artist.match.test(r.artistName || "")) counts.set(r.artistId, (counts.get(r.artistId) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  // 同時最多跑 limit 個請求，失敗的批次直接略過
  async function mapLimited(items, limit, fn) {
    const out = [];
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        try {
          out.push(await fn(item));
        } catch (err) {
          console.warn(err);
        }
      }
    });
    await Promise.all(workers);
    return out;
  }

  // 把歌手所有專輯的完整曲目抓回來，題庫才不會只有熱門歌
  async function fetchAlbumTracks(artistId, artist, country, onProgress) {
    const data = await request(lookupUrl([artistId], "album", country));
    const albums = (data.results || [])
      .filter((r) => r.wrapperType === "collection" && r.collectionId)
      .filter((r) => !SKIP_ALBUM.test(r.collectionName || ""))
      .filter((r) => !artist.excludeCollection || !artist.excludeCollection.test(r.collectionName || ""))
      // 正規專輯優先，再來是單曲與 EP
      .sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0))
      .slice(0, MAX_ALBUMS);
    onProgress?.(`正在翻 ${albums.length} 張專輯的曲目……`);

    const batches = [];
    for (let i = 0; i < albums.length; i += ALBUMS_PER_REQUEST) {
      batches.push(albums.slice(i, i + ALBUMS_PER_REQUEST).map((a) => a.collectionId));
    }
    const pages = await mapLimited(batches, 4, (ids) => request(lookupUrl(ids, "song", country)));
    return pages.flatMap((p) => (p.results || []).filter((r) => r.wrapperType === "track"));
  }

  async function fetchSongs(artist, onProgress) {
    let lastError;
    for (const country of artist.countries) {
      try {
        const data = await request(buildUrl(artist.term, country));
        const searchResults = (data.results || []).map((r) => ({ ...r, __fromSearch: true }));
        let albumTracks = [];
        const artistId = findArtistId(searchResults, artist);
        if (artistId) {
          try {
            albumTracks = await fetchAlbumTracks(artistId, artist, country, onProgress);
          } catch (err) {
            console.warn("抓不到完整曲目，只用搜尋結果", err);
          }
        }
        const songs = toSongs([...searchResults, ...albumTracks], artist);
        if (songs.length >= 4) return songs;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("找不到足夠的歌曲");
  }

  window.ITunes = { fetchSongs, normalizeTitle, isSingle };
})();
