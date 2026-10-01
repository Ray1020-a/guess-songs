// 歌詞來自 LRCLIB（https://lrclib.net），玩的時候才即時抓，不存進專案也不存進瀏覽器。
// 每題最多只露出兩三句，避免整首重製。
(function () {
  const ENDPOINT = "https://lrclib.net/api/search";
  const TIMEOUT_MS = 8000;

  // 作詞作曲、製作名單這類不是歌詞的行
  const CREDIT = /^[^:：]{0,12}[:：]|^(作詞|作曲|作词|填詞|填词|編曲|编曲|監製|监制|製作|制作|混音|母帶|和聲|和声|op |sp |isrc)/i;
  const TAG = /^[\[(（【].*[\])）】]$/;

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // "[01:23.45] 歌詞" → { time: 83.45, text: "歌詞" }
  function parseSynced(lrc) {
    const lines = [];
    for (const raw of lrc.split(/\r?\n/)) {
      const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      const text = raw.replace(/\[[^\]]*\]/g, "").trim();
      for (const m of stamps) lines.push({ time: Number(m[1]) * 60 + Number(m[2]), text });
    }
    return lines.sort((a, b) => a.time - b.time);
  }

  function isLyricLine(text) {
    if (!text || text.length < 4) return false;
    if (CREDIT.test(text) || TAG.test(text)) return false;
    if (/^[♪♫\s.…\-–—]+$/.test(text)) return false;
    return true;
  }

  function cleanLines(entry) {
    if (entry.syncedLyrics) {
      return parseSynced(entry.syncedLyrics).filter((l) => isLyricLine(l.text));
    }
    return (entry.plainLyrics || "")
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter(isLyricLine)
      .map((text) => ({ time: null, text }));
  }

  const compact = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

  // 從多筆搜尋結果挑最像的：時長接近、有時間軸的優先
  function pickBest(results, song) {
    const seconds = song.durationMs ? song.durationMs / 1000 : null;
    const title = compact(song.title);
    const scored = results
      .filter((r) => !r.instrumental && (r.syncedLyrics || r.plainLyrics))
      .filter((r) => {
        const t = compact(r.trackName || "");
        return t.includes(title) || title.includes(t);
      })
      .map((r) => {
        const diff = seconds && r.duration ? Math.abs(r.duration - seconds) : 5;
        return { r, score: (diff > 10 ? 100 : diff) + (r.syncedLyrics ? 0 : 3) };
      })
      .sort((a, b) => a.score - b.score);
    return scored[0]?.r || null;
  }

  async function fetchLyrics(song, artistName) {
    const primary = (song.artist || artistName).split(/\s*(?:,|&|×|feat\.?)\s*/i)[0];
    const queries = [
      new URLSearchParams({ track_name: song.title, artist_name: primary }),
      new URLSearchParams({ q: `${song.title} ${artistName}` }),
    ];
    for (const params of queries) {
      const results = await fetchJson(`${ENDPOINT}?${params}`);
      const best = pickBest(Array.isArray(results) ? results : [], song);
      if (best) {
        const lines = cleanLines(best);
        if (lines.length >= 8) return { lines, synced: Boolean(best.syncedLyrics) };
      }
    }
    return null;
  }

  // ---------- 出題 ----------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const isCJK = (text) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(text);

  // 歌詞裡直接出現歌名就太簡單了
  function mentionsTitle(text, title) {
    const t = compact(title);
    return t.length >= 2 && compact(text).includes(t);
  }

  // 前後兩成通常是前奏、重複的結尾，從中段挑
  function middleIndexes(lines, pad = 1) {
    const start = Math.max(pad, Math.floor(lines.length * 0.15));
    const end = Math.min(lines.length - 1 - pad, Math.ceil(lines.length * 0.85));
    const out = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }

  // 模式一：看歌詞猜歌名
  function guessTitleQuestion(lines, song) {
    const candidates = middleIndexes(lines).filter(
      (i) => !mentionsTitle(lines[i].text, song.title) && !mentionsTitle(lines[i + 1]?.text || "", song.title),
    );
    if (!candidates.length) return null;
    const i = pick(candidates);
    return {
      lines: [lines[i].text, lines[i + 1]?.text].filter(Boolean),
      answerLine: null,
    };
  }

  // 把一句拆成可以挖空的單位：中日韓泰文一個字一單位，其他語言一個字詞一單位
  function units(text) {
    return isCJK(text) ? [...text] : text.split(/(\s+)/);
  }

  function isWordUnit(u) {
    return /[\p{L}\p{N}]/u.test(u);
  }

  // 英文的 the、in、I 這種字挖掉沒意思
  const tooShort = (w) => w.replace(/[^\p{L}]/gu, "").length < 3;

  // 模式二：歌詞填空
  function fillQuestion(lines) {
    const candidates = middleIndexes(lines).filter((i) => {
      const words = units(lines[i].text).filter(isWordUnit);
      return words.length >= (isCJK(lines[i].text) ? 6 : 5);
    });
    if (!candidates.length) return null;

    for (const i of shuffle([...candidates, ...candidates, ...candidates])) {
      const text = lines[i].text;
      const cjk = isCJK(text);
      const parts = units(text);
      const size = cjk ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
      // 找一段連續的「字」來挖空，偏後半句
      const wordIdx = parts.map((p, k) => (isWordUnit(p) ? k : -1)).filter((k) => k >= 0);
      const maxStart = wordIdx.length - size;
      if (maxStart < 0) continue;
      const minStart = Math.min(Math.floor(wordIdx.length / 2), maxStart);
      const startPos = minStart + Math.floor(Math.random() * (maxStart - minStart + 1));
      const chosen = wordIdx.slice(startPos, startPos + size);
      if (chosen.length < size) continue;
      // 挖空的字必須是連續的（中間不能夾標點）
      const from = chosen[0];
      const to = chosen[chosen.length - 1];
      const slice = parts.slice(from, to + 1);
      if (cjk && slice.some((p) => !isWordUnit(p))) continue;
      if (!cjk && slice.filter(isWordUnit).some(tooShort)) continue;
      const answer = slice.join("").trim();

      // 干擾選項：同一首歌其他句子裡長度相同的片段
      const pool = new Set();
      for (const other of shuffle(lines)) {
        if (other.text === text) continue;
        const op = units(other.text);
        const ow = op.map((p, k) => (isWordUnit(p) ? k : -1)).filter((k) => k >= 0);
        if (ow.length < size) continue;
        const s = Math.floor(Math.random() * (ow.length - size + 1));
        const seg = op.slice(ow[s], ow[s + size - 1] + 1);
        if (cjk && seg.some((p) => !isWordUnit(p))) continue;
        if (!cjk && seg.filter(isWordUnit).some(tooShort)) continue;
        const cand = seg.join("").trim();
        if (cand && compact(cand) !== compact(answer)) pool.add(cand);
        if (pool.size >= 3) break;
      }
      if (pool.size < 3) continue;

      return {
        before: parts.slice(0, from).join(""),
        after: parts.slice(to + 1).join(""),
        answer,
        distractors: [...pool],
        prev: lines[i - 1]?.text || "",
        next: lines[i + 1]?.text || "",
      };
    }
    return null;
  }

  window.Lyrics = { fetchLyrics, guessTitleQuestion, fillQuestion, isCJK };
})();
