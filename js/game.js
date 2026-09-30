(function () {
  const CLIP_SECONDS = [1, 3, 7, 15];
  const CLIP_POINTS = [100, 70, 40, 20];
  const CLUE_POINTS = [100, 60, 30];
  const RING_LENGTH = 2 * Math.PI * 54;

  const $ = (id) => document.getElementById(id);
  const screens = ["home", "loading", "play", "result"];

  const state = {
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

  let itunesCache = null;

  // ---------- 工具 ----------
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

  function bestKey(mode, rounds) {
    return `gaga-best-${mode}-${rounds}`;
  }

  function readBest(mode, rounds) {
    try {
      return Number(localStorage.getItem(bestKey(mode, rounds))) || 0;
    } catch {
      return 0;
    }
  }

  function writeBest(mode, rounds, score) {
    try {
      localStorage.setItem(bestKey(mode, rounds), String(score));
    } catch {
      /* 無痕模式等情況存不了，忽略即可 */
    }
  }

  function selectedRounds() {
    return Number(document.querySelector('input[name="rounds"]:checked').value);
  }

  function renderBest() {
    const rounds = selectedRounds();
    for (const el of document.querySelectorAll("[data-best]")) {
      const best = readBest(el.dataset.best, rounds);
      el.textContent = best ? `${rounds} 題最佳：${best} 分` : "";
    }
  }

  // ---------- 開始 ----------
  async function startGame(mode) {
    state.mode = mode;
    state.totalRounds = selectedRounds();

    if (mode === "audio") {
      show("loading");
      $("loading-text").textContent = "正在召喚 Mother Monster……";
      $("loading-actions").classList.add("hidden");
      try {
        itunesCache = itunesCache || (await window.ITunes.fetchGagaSongs());
      } catch (err) {
        console.error(err);
        $("loading-text").textContent = "連不上 iTunes，抓不到試聽片段。要不要改玩線索模式？";
        $("loading-actions").classList.remove("hidden");
        return;
      }
      state.pool = itunesCache;
    } else {
      state.pool = window.CLUE_SONGS.map((s) => ({ ...s, key: window.ITunes.normalizeTitle(s.title) }));
    }

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

    $("hud-round").textContent = `第 ${state.round + 1} / ${state.totalRounds} 題`;
    $("hud-score").textContent = `${state.score} 分`;
    $("progress-bar").style.width = `${(state.round / state.totalRounds) * 100}%`;
    $("reveal").classList.add("hidden");

    renderOptions(song);

    if (state.mode === "audio") {
      state.audio = new Audio(song.previewUrl);
      state.audio.preload = "auto";
      state.audio.addEventListener("ended", () => ($("play-icon").textContent = "▶"));
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
      btn.innerHTML = `<span class="option-num">${i + 1}</span><span class="option-text"></span>`;
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
    const li = document.createElement("li");
    li.textContent = clues[state.stage];
    if (state.stage === clues.length - 1) li.classList.add("emoji");
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

    $("hud-score").textContent = `${state.score} 分`;
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
    if (ratio >= 0.9) return "Mother Monster 本人？👑";
    if (ratio >= 0.7) return "資深 Little Monster 🐾";
    if (ratio >= 0.4) return "還在練舞的 Monster 💃";
    return "先去把《The Fame》聽完再來 📀";
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
    const text = `我在 Gaga 猜歌王（${modeName}）拿到 ${state.score} 分，答對 ${correctCount} / ${state.totalRounds} 題！⚡ 你能贏我嗎？`;
    const url = location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: "Gaga 猜歌王", text, url });
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
  for (const r of document.querySelectorAll('input[name="rounds"]')) {
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

  renderBest();
})();
