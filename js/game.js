(function () {
  const CLIP_SECONDS = [1, 3, 7, 15];
  const CLIP_POINTS = [100, 70, 40, 20];
  const CLUE_POINTS = [100, 60, 30];
  const RING_LENGTH = 2 * Math.PI * 54;
  // iTunes 搜尋結果前幾名視為熱門歌
  const HIT_RANK = 30;
  const LEVEL_NAMES = { hits: "經典", all: "混合", deep: "冷門" };

  const $ = (id) => document.getElementById(id);
  const screens = ["home", "loading", "play", "result"];

  const DEFAULT_ARTIST = window.ARTISTS.find((a) => a.id === "gaga");

  const state = {
    artist: DEFAULT_ARTIST,
    mode: "audio",
    totalRounds: 10,
    pool: [],
    queue: [],
    round: 0,
    score: 0,
    stage: 0,
    answered: false,
    history: [],
    current: null,
    audio: null,
    clipLimit: 0,
    rafId: 0,
  };

  const itunesCache = new Map();

  // ---------- 工具 ----------
  const pad = (n) => String(n).padStart(2, "0");

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(name) {
    for (const s of screens) $(`screen-${s}`).classList.toggle("active", s === name);
    window.scrollTo(0, 0);
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // localStorage 在無痕模式等情況可能丟錯，讀寫都包起來
  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 存不了就算了 */
    }
  }

  const bestKey = (mode, rounds) => `guess-best-${state.artist.id}-${mode}-${selectedLevel()}-${rounds}`;
  const readBest = (mode, rounds) => Number(storageGet(bestKey(mode, rounds))) || 0;
  const writeBest = (mode, rounds, score) => storageSet(bestKey(mode, rounds), String(score));

  const hasCuratedClues = (artist) => Boolean(window.CLUES && window.CLUES[artist.id]);

  function selectedLevel() {
    return document.querySelector('input[name="level"]:checked').value;
  }

  const isDeep = (song) => ("deep" in song ? song.deep : song.rank >= HIT_RANK);

  function filterByLevel(songs, level) {
    if (level === "all") return songs;
    const picked = songs.filter((s) => (level === "deep" ? isDeep(s) : !isDeep(s)));
    if (picked.length >= 4) return picked;
    toast(`${LEVEL_NAMES[level]}歌不夠多，改用全部歌曲`);
    return songs;
  }

  function selectedRounds() {
    return Number(document.querySelector('input[name="rounds"]:checked').value);
  }

  function renderBest() {
    const rounds = selectedRounds();
    for (const el of document.querySelectorAll("[data-best]")) {
      const best = readBest(el.dataset.best, rounds);
      el.textContent = best ? `${LEVEL_NAMES[selectedLevel()]}・${rounds} 題最佳：${best} 分` : "";
    }
  }

  // ---------- 選歌手 ----------
  function selectArtist(id, { remember = true } = {}) {
    const artist = window.ARTISTS.find((a) => a.id === id) || DEFAULT_ARTIST;
    state.artist = artist;
    if (remember) storageSet("guess-artist", artist.id);

    const root = document.documentElement.style;
    root.setProperty("--accent", artist.colors.accent);
    root.setProperty("--accent-2", artist.colors.accent2);
    root.setProperty("--on-accent", artist.colors.onAccent);

    $("hero-icon").textContent = artist.icon;
    $("hero-title").textContent = window.withName(artist.short, "猜歌王");
    $("hero-tagline").textContent = artist.tagline;
    document.title = window.withName(artist.short, "猜歌王");
    $("clue-desc").textContent = hasCuratedClues(artist)
      ? "看冷知識、專輯與 emoji 猜歌名。"
      : "看發行年份、專輯與封面猜歌名。";

    paintAvatar($("trigger-avatar"), artist);
    $("trigger-name").textContent = artist.name;
    $("artist-meta").textContent = artistSubline(artist);
    if (location.hash.slice(1) !== artist.id) history.replaceState(null, "", `#${artist.id}`);
    renderBest();
  }

  // ---------- 選歌手面板 ----------
  const RECENT_KEY = "guess-recent";
  const RECENT_MAX = 8;
  const picker = { tab: null };
  const byId = (id) => window.ARTISTS.find((a) => a.id === id);
  const regionOf = (artist) => window.REGIONS.find((r) => r.id === artist.region);

  function readRecent() {
    try {
      return JSON.parse(storageGet(RECENT_KEY) || "[]").filter(byId);
    } catch {
      return [];
    }
  }

  function pushRecent(id) {
    storageSet(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_MAX)));
  }

  // 頭像：中日泰文取第一個字，英文取兩個字的字首；BTS、U2 這類縮寫取前兩個字母
  function initials(name) {
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(name)) return [...name][0];
    const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter((w) => w && !/^the$/i.test(w));
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    const word = words[0] || name;
    return word === word.toUpperCase() ? word.slice(0, 2) : word[0].toUpperCase();
  }

  function paintAvatar(el, artist) {
    el.textContent = initials(artist.name);
    el.style.background = `linear-gradient(135deg, ${artist.colors.accent}, ${artist.colors.accent2})`;
    el.style.color = artist.colors.onAccent;
  }

  function artistSubline(artist) {
    const parts = [regionOf(artist).name];
    if (artist.top) parts.push(`百大 #${artist.top}`);
    parts.push(hasCuratedClues(artist) ? `手寫題庫 ${window.CLUES[artist.id].length} 首` : "自動出題");
    return parts.join("・");
  }

  function pickerTabs() {
    const tabs = [];
    const recent = readRecent();
    if (recent.length) tabs.push({ id: "recent", name: "最近", count: recent.length });
    tabs.push({ id: "top", name: "全球百大", count: window.TOP100.length });
    for (const r of window.REGIONS) {
      tabs.push({ id: r.id, name: r.name, count: window.ARTISTS.filter((a) => a.region === r.id).length });
    }
    tabs.push({ id: "all", name: "全部", count: window.ARTISTS.length });
    return tabs;
  }

  function listForTab(tab) {
    if (tab === "recent") return readRecent().map(byId);
    if (tab === "top") return window.ARTISTS.filter((a) => a.top).sort((a, b) => a.top - b.top);
    if (tab === "all") return window.ARTISTS;
    return window.ARTISTS.filter((a) => a.region === tab);
  }

  // 比對時忽略空白和符號，「jay z」「JAY-Z」「ac dc」都找得到
  const compact = (str) => str.toLowerCase().replace(/[\s.\-'’!/&]/g, "");

  function searchArtists(query) {
    const q = compact(query);
    if (!q) return [];
    return window.ARTISTS.map((a) => {
      const name = compact(a.name);
      const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : compact(a.searchText).includes(q) ? 2 : -1;
      return { a, rank };
    })
      .filter((x) => x.rank >= 0)
      .sort((x, y) => x.rank - y.rank || (x.a.top || 999) - (y.a.top || 999))
      .map((x) => x.a);
  }

  function artistRow(artist, { showRank }) {
    const row = document.createElement("button");
    row.className = "artist-row";
    row.type = "button";
    row.setAttribute("role", "option");
    row.dataset.id = artist.id;
    const current = artist.id === state.artist.id;
    row.setAttribute("aria-selected", String(current));
    row.innerHTML = `
      <span class="row-rank"></span>
      <span class="avatar" aria-hidden="true"></span>
      <span class="row-text"><span class="row-name"></span><span class="row-sub"></span></span>
      <span class="row-check" aria-hidden="true">${current ? "✓" : ""}</span>`;
    row.querySelector(".row-rank").textContent = showRank ? String(artist.top).padStart(2, "0") : "";
    row.classList.toggle("ranked", showRank);
    paintAvatar(row.querySelector(".avatar"), artist);
    row.querySelector(".row-name").textContent = artist.name;
    row.querySelector(".row-sub").textContent = artistSubline(artist);
    return row;
  }

  function renderPicker() {
    const query = $("artist-search").value;
    const box = $("artist-results");
    box.innerHTML = "";

    const tabsBox = $("artist-tabs");
    tabsBox.classList.toggle("dimmed", Boolean(query.trim()));
    for (const tab of tabsBox.children) {
      tab.setAttribute("aria-selected", String(tab.dataset.tab === picker.tab));
    }

    if (query.trim()) {
      const found = searchArtists(query);
      $("sheet-count").textContent = `找到 ${found.length} 位`;
      if (!found.length) {
        const empty = document.createElement("p");
        empty.className = "results-empty";
        empty.textContent = `找不到「${query.trim()}」。試試英文名、中文俗稱，或換個寫法。`;
        box.appendChild(empty);
      }
      for (const a of found) box.appendChild(artistRow(a, { showRank: false }));
      return;
    }

    const list = listForTab(picker.tab);
    $("sheet-count").textContent = `${list.length} 位`;
    if (picker.tab === "all") {
      // 「全部」依地區分段，段落標題會黏在上方
      for (const r of window.REGIONS) {
        const title = document.createElement("p");
        title.className = "results-group";
        title.textContent = `${r.icon} ${r.name}`;
        box.appendChild(title);
        for (const a of list.filter((x) => x.region === r.id)) box.appendChild(artistRow(a, { showRank: false }));
      }
      return;
    }
    for (const a of list) box.appendChild(artistRow(a, { showRank: picker.tab === "top" }));
  }

  function renderTabs() {
    const box = $("artist-tabs");
    box.innerHTML = "";
    for (const tab of pickerTabs()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.setAttribute("role", "tab");
      btn.dataset.tab = tab.id;
      btn.innerHTML = `<span></span><span class="tab-count">${tab.count}</span>`;
      btn.firstChild.textContent = tab.name;
      btn.addEventListener("click", () => {
        picker.tab = tab.id;
        $("artist-search").value = "";
        renderPicker();
        $("artist-results").scrollTop = 0;
      });
      box.appendChild(btn);
    }
  }

  function openPicker() {
    const dialog = $("artist-dialog");
    if (dialog.open) return;
    renderTabs();
    const tabIds = pickerTabs().map((t) => t.id);
    if (!tabIds.includes(picker.tab)) picker.tab = readRecent().length ? "recent" : "top";
    $("artist-search").value = "";
    renderPicker();
    dialog.showModal();
    $("artist-tabs").querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
    const current = $("artist-results").querySelector('[aria-selected="true"]');
    if (current) current.scrollIntoView({ block: "center" });
    // 手機上自動跳出鍵盤會擋住清單，只有桌機才自動聚焦搜尋框
    if (window.matchMedia("(pointer: fine)").matches) $("artist-search").focus();
    else $("sheet-close").focus();
  }

  function choose(id, { random = false } = {}) {
    selectArtist(id);
    pushRecent(id);
    const dialog = $("artist-dialog");
    if (dialog.open) dialog.close();
    $("artist-trigger").focus({ preventScroll: true });
    const vinyl = document.querySelector(".vinyl-hero");
    vinyl.classList.remove("shuffle");
    void vinyl.offsetWidth;
    vinyl.classList.add("shuffle");
    if (random) toast(`抽到了：${state.artist.name}`);
  }

  function chooseRandom() {
    const pool = window.ARTISTS.filter((a) => a.id !== state.artist.id);
    choose(pool[Math.floor(Math.random() * pool.length)].id, { random: true });
  }

  function setupPicker() {
    const dialog = $("artist-dialog");
    $("artist-trigger").addEventListener("click", openPicker);
    $("btn-random").addEventListener("click", chooseRandom);
    $("sheet-close").addEventListener("click", () => dialog.close());
    // 關閉後把焦點還給「目前歌手」卡片，不然焦點會卡在隱藏的搜尋框裡
    dialog.addEventListener("close", () => $("artist-trigger").focus({ preventScroll: true }));
    // 點到面板外的背景就關閉
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    $("artist-search").addEventListener("input", () => {
      renderPicker();
      $("artist-results").scrollTop = 0;
    });
    $("artist-results").addEventListener("click", (e) => {
      const row = e.target.closest(".artist-row");
      if (row) choose(row.dataset.id);
    });

    // 鍵盤：上下鍵在清單裡移動、左右鍵切分類、隨手打字就跳到搜尋框
    dialog.addEventListener("keydown", (e) => {
      const rows = [...$("artist-results").querySelectorAll(".artist-row")];
      const active = document.activeElement;
      const index = rows.indexOf(active);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!rows.length) return;
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        const next = index === -1 ? (step > 0 ? 0 : rows.length - 1) : index + step;
        if (next < 0) $("artist-search").focus();
        else rows[Math.min(next, rows.length - 1)].focus();
      } else if (e.key === "Enter" && active === $("artist-search") && rows.length) {
        e.preventDefault();
        choose(rows[0].dataset.id);
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && active?.classList.contains("tab")) {
        e.preventDefault();
        const tabs = [...$("artist-tabs").children];
        const next = tabs[(tabs.indexOf(active) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
        next.click();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && active !== $("artist-search") && e.key !== " ") {
        $("artist-search").focus();
      }
    });

    // 首頁按 / 打開面板
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || dialog.open || !$("screen-home").classList.contains("active")) return;
      if (e.target.matches("input, textarea")) return;
      e.preventDefault();
      openPicker();
    });
  }

  // ---------- 自動線索（沒有手寫題庫的歌手） ----------
  function formatDuration(ms) {
    const total = Math.round(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function autoClues(song) {
    const first = [song.year && `${song.year} 年發行`, song.genre, song.durationMs && `長度 ${formatDuration(song.durationMs)}`]
      .filter(Boolean)
      .join("・");
    const album = song.album.replace(/\s-\s(single|ep)$/i, "");
    const masked = album.replace(new RegExp(escapeRegExp(song.title), "gi"), "＿＿＿");
    const second = window.ITunes.isSingle(song.rawAlbum)
      ? "以單曲形式發行。"
      : `收錄於《${masked}》。`;
    const chars = [...song.title];
    const third = song.artwork
      ? { image: song.artwork }
      : `歌名共 ${chars.length} 個字，第一個字是「${chars[0]}」。`;
    return [first || "發行資訊不明。", second, third];
  }

  // 曲目在瀏覽器存一天，避免一直重抓而撞到 iTunes 的請求上限
  const CACHE_TTL = 24 * 60 * 60 * 1000;

  function readSongCache(artist) {
    try {
      const cached = JSON.parse(storageGet(`guess-songs-v4-${artist.id}`) || "null");
      if (!cached || Date.now() - cached.savedAt > CACHE_TTL) return null;
      // JSON 存不了 Infinity，存成 null
      return cached.songs.map((s) => ({ ...s, rank: s.rank ?? Infinity }));
    } catch {
      return null;
    }
  }

  async function loadItunes(artist) {
    if (itunesCache.has(artist.id)) return itunesCache.get(artist.id);
    let songs = readSongCache(artist);
    if (!songs) {
      const onProgress = (msg) => ($("loading-text").textContent = msg);
      songs = await window.ITunes.fetchSongs(artist, onProgress);
      storageSet(`guess-songs-v4-${artist.id}`, JSON.stringify({ savedAt: Date.now(), songs }));
    }
    itunesCache.set(artist.id, songs);
    return songs;
  }

  // ---------- 開始 ----------
  async function startGame(mode) {
    const artist = state.artist;
    state.mode = mode;
    state.totalRounds = selectedRounds();

    if (mode === "clue" && hasCuratedClues(artist)) {
      state.pool = window.CLUES[artist.id].map((s) => ({ ...s, key: window.ITunes.normalizeTitle(s.title) }));
    } else {
      show("loading");
      $("loading-text").textContent = `正在召喚 ${artist.name}……`;
      $("loading-actions").classList.add("hidden");
      try {
        const songs = await loadItunes(artist);
        state.pool = mode === "clue" ? songs.map((s) => ({ ...s, clues: autoClues(s) })) : songs;
      } catch (err) {
        console.error(err);
        const canFallback = mode === "audio" && hasCuratedClues(artist);
        const reason =
          err.code === "NOT_FOUND"
            ? `iTunes 上找不到足夠的 ${artist.name} 歌曲，可能是這位歌手沒有在 Apple Music 上架。`
            : "連不上 iTunes，抓不到歌曲資料。";
        const next = canFallback
          ? "要不要改玩線索模式？"
          : err.code === "NOT_FOUND"
            ? "換一位歌手試試看吧。"
            : "請確認網路連線後再試一次。";
        $("loading-text").textContent = reason + next;
        $("btn-loading-clue").classList.toggle("hidden", !canFallback);
        $("loading-actions").classList.remove("hidden");
        return;
      }
    }

    state.pool = filterByLevel(state.pool, selectedLevel());
    state.queue = shuffle(state.pool).slice(0, Math.min(state.totalRounds, state.pool.length));
    state.totalRounds = state.queue.length;
    state.round = 0;
    state.score = 0;
    state.history = [];
    $("audio-panel").classList.toggle("hidden", mode !== "audio");
    $("clue-panel").classList.toggle("hidden", mode !== "clue");
    show("play");
    nextRound();
  }

  // ---------- 每一題 ----------
  function nextRound() {
    stopAudio();
    if (state.round >= state.totalRounds) return finish();

    const song = state.queue[state.round];
    state.current = song;
    state.stage = 0;
    state.answered = false;

    $("hud-round").textContent = `${pad(state.round + 1)} / ${pad(state.totalRounds)}`;
    $("hud-score").textContent = state.score;
    $("progress-bar").style.width = `${(state.round / state.totalRounds) * 100}%`;
    $("reveal").classList.add("hidden");

    renderOptions(song);

    if (state.mode === "audio") {
      state.audio = new Audio(song.previewUrl);
      state.audio.preload = "auto";
      state.audio.addEventListener("ended", () => ($("play-icon").textContent = "▶"));
      // 有聲音時唱片才轉
      state.audio.addEventListener("playing", () => $("btn-play").classList.add("is-playing"));
      for (const evt of ["pause", "ended", "emptied"]) {
        state.audio.addEventListener(evt, () => $("btn-play").classList.remove("is-playing"));
      }
      setRing(0);
      $("play-icon").textContent = "▶";
      $("btn-more").disabled = false;
      renderClipStage();
    } else {
      $("clue-list").innerHTML = "";
      $("btn-clue").disabled = false;
      addClue();
    }
    updateWorth();
  }

  function renderOptions(song) {
    const distractors = shuffle(state.pool.filter((s) => s.key !== song.key)).slice(0, 3);
    const options = shuffle([song, ...distractors]);
    const box = $("options");
    box.innerHTML = "";
    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.dataset.key = opt.key;
      btn.innerHTML = `<span class="option-num">${pad(i + 1)}</span><span class="option-text"></span>`;
      btn.querySelector(".option-text").textContent = opt.title;
      btn.addEventListener("click", () => answer(opt, btn));
      box.appendChild(btn);
    });
  }

  function currentPoints() {
    return state.mode === "audio" ? CLIP_POINTS[state.stage] : CLUE_POINTS[state.stage];
  }

  function updateWorth() {
    $("worth").textContent = `答對可得 ${currentPoints()} 分`;
  }

  // ---------- 聽歌模式 ----------
  function renderClipStage() {
    const sec = CLIP_SECONDS[state.stage];
    $("clip-label").textContent = `播放 ${sec} 秒`;
    const steps = $("clip-steps");
    steps.innerHTML = "";
    CLIP_SECONDS.forEach((s, i) => {
      const dot = document.createElement("span");
      dot.className = "step" + (i <= state.stage ? " on" : "");
      dot.textContent = `${s}s`;
      steps.appendChild(dot);
    });
    const last = state.stage >= CLIP_SECONDS.length - 1;
    $("btn-more").disabled = last;
    $("btn-more").textContent = last
      ? "已經是最長片段"
      : `多聽一點（${CLIP_SECONDS[state.stage + 1]} 秒）`;
  }

  function setRing(ratio) {
    $("ring-fg").style.strokeDashoffset = String(RING_LENGTH * (1 - Math.min(1, ratio)));
  }

  function tick() {
    const a = state.audio;
    if (!a) return;
    if (state.clipLimit !== Infinity) {
      setRing(a.currentTime / state.clipLimit);
      if (a.currentTime >= state.clipLimit) {
        a.pause();
        $("play-icon").textContent = "↻";
        return;
      }
    } else {
      setRing(a.duration ? a.currentTime / a.duration : 0);
    }
    if (!a.paused) state.rafId = requestAnimationFrame(tick);
  }

  async function playClip(fromStart = true) {
    const a = state.audio;
    if (!a) return;
    cancelAnimationFrame(state.rafId);
    a.pause();
    if (fromStart) a.currentTime = 0;
    state.clipLimit = state.answered ? Infinity : CLIP_SECONDS[state.stage];
    $("play-icon").textContent = "…";
    try {
      await a.play();
      $("play-icon").textContent = "♪";
      state.rafId = requestAnimationFrame(tick);
    } catch (err) {
      console.error(err);
      $("play-icon").textContent = "▶";
      toast("播放失敗，請再按一次");
    }
  }

  function stopAudio() {
    cancelAnimationFrame(state.rafId);
    if (state.audio) {
      state.audio.pause();
      state.audio.removeAttribute("src");
      state.audio.load();
      state.audio = null;
    }
  }

  function listenMore() {
    if (state.answered || state.stage >= CLIP_SECONDS.length - 1) return;
    state.stage++;
    renderClipStage();
    updateWorth();
    playClip();
  }

  // ---------- 線索模式 ----------
  function addClue() {
    const clues = state.current.clues;
    const clue = clues[state.stage];
    const li = document.createElement("li");
    if (clue.image) {
      const img = document.createElement("img");
      img.src = clue.image;
      img.alt = "專輯封面";
      li.classList.add("cover");
      li.appendChild(img);
    } else {
      li.textContent = clue;
      if (state.stage === clues.length - 1) li.classList.add("emoji");
    }
    $("clue-list").appendChild(li);
    const last = state.stage >= clues.length - 1;
    $("btn-clue").disabled = last;
    $("btn-clue").textContent = last ? "線索用完了" : "再給一個線索";
  }

  function moreClue() {
    if (state.answered || state.stage >= state.current.clues.length - 1) return;
    state.stage++;
    addClue();
    updateWorth();
  }

  // ---------- 作答 ----------
  function answer(opt, btn) {
    if (state.answered) return;
    state.answered = true;
    const song = state.current;
    const correct = opt.key === song.key;
    const points = correct ? currentPoints() : 0;
    state.score += points;
    state.history.push({ title: song.title, correct, points, pick: opt.title });

    for (const b of $("options").querySelectorAll(".option")) {
      b.disabled = true;
      if (b.dataset.key === song.key) b.classList.add("correct");
    }
    if (!correct) btn.classList.add("wrong");

    $("hud-score").textContent = state.score;
    $("btn-more").disabled = true;
    $("btn-clue").disabled = true;

    $("reveal-verdict").textContent = correct ? `答對了！+${points} 分` : "可惜，答錯了";
    $("reveal-verdict").className = "verdict " + (correct ? "good" : "bad");
    $("reveal-title").textContent = song.title;
    $("reveal-meta").textContent = [song.album, song.year].filter(Boolean).join(" · ");

    const art = $("reveal-art");
    if (song.artwork) {
      art.src = song.artwork;
      art.classList.remove("hidden");
    } else {
      art.removeAttribute("src");
      art.classList.add("hidden");
    }
    const link = $("reveal-link");
    link.classList.toggle("hidden", !song.link);
    if (song.link) link.href = song.link;

    $("btn-next").textContent = state.round + 1 >= state.totalRounds ? "看結果" : "下一題";
    $("reveal").classList.remove("hidden");
    $("btn-next").focus({ preventScroll: true });
    $("reveal").scrollIntoView({ behavior: "smooth", block: "nearest" });

    // 揭曉後把剩下的試聽播完
    if (state.mode === "audio") playClip(false);
  }

  // ---------- 結算 ----------
  function rankTitle(ratio) {
    const ranks = state.artist.ranks;
    if (ratio >= 0.9) return ranks[0];
    if (ratio >= 0.7) return ranks[1];
    if (ratio >= 0.4) return ranks[2];
    return ranks[3];
  }

  function finish() {
    stopAudio();
    const max = state.totalRounds * 100;
    const correctCount = state.history.filter((h) => h.correct).length;
    const prevBest = readBest(state.mode, state.totalRounds);
    const isRecord = state.score > prevBest;
    if (isRecord) writeBest(state.mode, state.totalRounds, state.score);

    $("progress-bar").style.width = "100%";
    $("result-score").textContent = state.score;
    $("result-max").textContent = `/ ${max}`;
    $("result-title").textContent = rankTitle(state.score / max);
    $("result-sub").textContent =
      `答對 ${correctCount} / ${state.totalRounds} 題` +
      (isRecord ? "・🎉 新紀錄！" : prevBest ? `・最佳紀錄 ${prevBest} 分` : "");

    const list = $("result-list");
    list.innerHTML = "";
    for (const h of state.history) {
      const li = document.createElement("li");
      li.className = h.correct ? "good" : "bad";
      const mark = h.correct ? `+${h.points}` : "✕";
      li.innerHTML = `<span class="rl-title"></span><span class="rl-mark">${mark}</span>`;
      li.querySelector(".rl-title").textContent = h.correct ? h.title : `${h.title}（你選了 ${h.pick}）`;
      list.appendChild(li);
    }
    show("result");
  }

  async function share() {
    const modeName = state.mode === "audio" ? "聽歌猜歌" : "線索猜歌";
    const correctCount = state.history.filter((h) => h.correct).length;
    const text = `我在 ${window.withName(state.artist.short, "猜歌王")}（${modeName}）拿到 ${state.score} 分，答對 ${correctCount} / ${state.totalRounds} 題！⚡ 你能贏我嗎？`;
    const url = `${location.href.split("#")[0]}#${state.artist.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast("已複製到剪貼簿");
    } catch (err) {
      if (err && err.name !== "AbortError") toast("分享失敗");
    }
  }

  function quit() {
    stopAudio();
    renderBest();
    show("home");
  }

  // ---------- 事件 ----------
  for (const card of document.querySelectorAll(".mode-card")) {
    card.addEventListener("click", () => startGame(card.dataset.mode));
  }
  for (const r of document.querySelectorAll('input[name="rounds"], input[name="level"]')) {
    r.addEventListener("change", renderBest);
  }
  $("btn-play").addEventListener("click", () => playClip(!state.answered));
  $("btn-more").addEventListener("click", listenMore);
  $("btn-clue").addEventListener("click", moreClue);
  $("btn-next").addEventListener("click", () => {
    state.round++;
    nextRound();
  });
  $("btn-quit").addEventListener("click", quit);
  $("btn-again").addEventListener("click", () => startGame(state.mode));
  $("btn-home").addEventListener("click", quit);
  $("btn-share").addEventListener("click", share);
  $("btn-loading-back").addEventListener("click", quit);
  $("btn-loading-clue").addEventListener("click", () => startGame("clue"));
  $("reveal-art").addEventListener("error", (e) => e.target.classList.add("hidden"));

  document.addEventListener("keydown", (e) => {
    if (!$("screen-play").classList.contains("active") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-4]$/.test(e.key) && !state.answered) {
      const btn = $("options").querySelectorAll(".option")[Number(e.key) - 1];
      if (btn) btn.click();
    } else if (e.key === " " && e.target === document.body && state.mode === "audio") {
      e.preventDefault();
      playClip(!state.answered);
    }
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id && id !== state.artist.id && window.ARTISTS.some((a) => a.id === id)) {
      quit();
      selectArtist(id);
    }
  });

  setupPicker();
  const initial = location.hash.slice(1) || storageGet("guess-artist");
  selectArtist(initial, { remember: false });
})();
