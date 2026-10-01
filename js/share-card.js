// 把一局的成績畫成 IG 限時動態尺寸（1080×1920，9:16）的圖片。
// 重要資訊都放在上下各留 250px 的安全區之間，避免被 IG 的介面蓋住。
(function () {
  const W = 1080;
  const H = 1920;
  const C = {
    bg: "#0e0c10",
    bg2: "#17141b",
    text: "#f4efe6",
    muted: "#a39d97",
    faint: "#6f6a66",
    line: "rgba(255, 248, 240, 0.12)",
    good: "#3ddc97",
    bad: "#ff5d6c",
    vinyl: "#121014",
    groove: "#1f1c22",
  };
  const DISPLAY = '"Unbounded", "Noto Sans TC", sans-serif';
  const BODY = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';

  // 畫之前先確定網頁字型載入了，不然 canvas 會用預設字型
  async function loadFonts() {
    if (!document.fonts) return;
    await Promise.allSettled(
      ["800 64px Unbounded", "900 64px 'Noto Sans TC'", "700 64px 'Noto Sans TC'", "600 32px 'IBM Plex Mono'"].map((f) =>
        document.fonts.load(f, "猜歌王0123456789ABC"),
      ),
    );
  }

  function font(weight, size, family) {
    return `${weight} ${size}px ${family}`;
  }

  // 太長就縮小字級，直到放得進 maxWidth
  function fitText(ctx, text, x, y, { weight, size, family, maxWidth, color, align = "center", minSize = 28 }) {
    let s = size;
    ctx.font = font(weight, s, family);
    while (ctx.measureText(text).width > maxWidth && s > minSize) {
      s -= 2;
      ctx.font = font(weight, s, family);
    }
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    return s;
  }

  function spaced(ctx, text, x, y, spacing) {
    // canvas 的 letterSpacing 支援度不一，手動逐字排
    const chars = [...text];
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    ctx.textAlign = "left";
    chars.forEach((ch, i) => {
      ctx.fillText(ch, cx, y);
      cx += widths[i] + spacing;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground(ctx, accent, accent2) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 260, 0, W / 2, 260, 900);
    glow.addColorStop(0, hexA(accent, 0.38));
    glow.addColorStop(1, hexA(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const glow2 = ctx.createRadialGradient(W, H, 0, W, H, 900);
    glow2.addColorStop(0, hexA(accent2, 0.18));
    glow2.addColorStop(1, hexA(accent2, 0));
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // 底片顆粒
    const rand = mulberry32(7);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(rand() * W, rand() * H, 2, 2);
    }
  }

  function drawVinyl(ctx, cx, cy, r, accent, accent2, label) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 30;
    ctx.fillStyle = C.vinyl;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 唱片溝紋
    ctx.lineWidth = 1.5;
    for (let rr = r - 8; rr > r * 0.4; rr -= 5) {
      ctx.strokeStyle = rr % 2 ? C.groove : "#161318";
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 反光
    const sheen = ctx.createConicGradient ? ctx.createConicGradient(0.5, cx, cy) : null;
    if (sheen) {
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.07, "rgba(255,255,255,0.10)");
      sheen.addColorStop(0.15, "rgba(255,255,255,0)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0)");
      sheen.addColorStop(0.57, "rgba(255,255,255,0.07)");
      sheen.addColorStop(0.65, "rgba(255,255,255,0)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 圓標
    const lr = r * 0.38;
    const grad = ctx.createRadialGradient(cx - lr * 0.3, cy - lr * 0.4, 0, cx, cy, lr);
    grad.addColorStop(0, accent2);
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, lr, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(lr * 0.9)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.fillText(label, cx, cy + 4);
    ctx.textBaseline = "alphabetic";
  }

  function drawStat(ctx, x, y, w, label, value) {
    ctx.fillStyle = C.faint;
    ctx.font = font(600, 26, MONO);
    ctx.textAlign = "center";
    spaced(ctx, label, x + w / 2, y, 4);
    fitText(ctx, value, x + w / 2, y + 74, { weight: 900, size: 60, family: BODY, maxWidth: w - 24, color: C.text });
  }

  // Wordle 式的答題格子：答對的格子寫幾秒／幾條線索
  function drawGrid(ctx, history, mode, top, accent) {
    const n = history.length;
    const perRow = n <= 10 ? Math.min(n, 5) : 10;
    const gap = 14;
    const size = Math.min(100, Math.floor((900 - gap * (perRow - 1)) / perRow));
    const rows = Math.ceil(n / perRow);
    history.forEach((h, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const rowWidth = inRow * size + (inRow - 1) * gap;
      const x = (W - rowWidth) / 2 + (i % perRow) * (size + gap);
      const y = top + row * (size + gap);
      roundRect(ctx, x, y, size, size, size * 0.18);
      if (h.correct) {
        // 越快答對顏色越飽和
        ctx.fillStyle = h.stage === 0 ? accent : hexA(accent, 0.75 - h.stage * 0.15);
        ctx.fill();
        ctx.fillStyle = "#0e0c10";
        ctx.font = font(800, Math.round(size * 0.3), DISPLAY);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(mode === "audio" ? `${h.seconds}s` : `${h.stage + 1}`, x + size / 2, y + size / 2 + 2);
        ctx.textBaseline = "alphabetic";
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = C.bad;
        ctx.font = font(800, Math.round(size * 0.34), DISPLAY);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✕", x + size / 2, y + size / 2 + 2);
        ctx.textBaseline = "alphabetic";
      }
    });
    return top + rows * size + (rows - 1) * gap;
  }

  async function render(data) {
    await loadFonts();
    const { artist, mode, levelName, score, max, rank, history, isRecord, url } = data;
    const accent = artist.colors.accent;
    const accent2 = artist.colors.accent2;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    drawBackground(ctx, accent, accent2);

    ctx.fillStyle = C.muted;
    ctx.font = font(600, 30, MONO);
    spaced(ctx, "GUESS THE SONG", W / 2, 190, 10);

    drawVinyl(ctx, W / 2, 440, 200, accent, accent2, artist.icon);

    fitText(ctx, window.withName(artist.short, "猜歌王"), W / 2, 760, {
      weight: 800,
      size: 76,
      family: DISPLAY,
      maxWidth: 940,
      color: C.text,
    });

    // 分數：大數字＋小小的滿分
    ctx.font = font(800, 200, DISPLAY);
    const scoreText = String(score);
    const scoreW = ctx.measureText(scoreText).width;
    ctx.font = font(800, 56, DISPLAY);
    const maxText = ` / ${max}`;
    const maxW = ctx.measureText(maxText).width;
    const startX = (W - scoreW - maxW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = accent;
    ctx.font = font(800, 200, DISPLAY);
    ctx.fillText(scoreText, startX, 1000);
    ctx.fillStyle = C.faint;
    ctx.font = font(800, 56, DISPLAY);
    ctx.fillText(maxText, startX + scoreW, 1000);

    if (isRecord) {
      ctx.font = font(900, 30, BODY);
      const badge = "🎉 新紀錄";
      const bw = ctx.measureText(badge).width + 48;
      roundRect(ctx, (W - bw) / 2, 1032, bw, 56, 28);
      ctx.fillStyle = hexA(accent, 0.18);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.fillText(badge, W / 2, 1071);
    }

    fitText(ctx, rank, W / 2, isRecord ? 1160 : 1110, { weight: 900, size: 58, family: BODY, maxWidth: 940, color: C.text });

    // 三格數據
    const correct = history.filter((h) => h.correct);
    const statTop = 1230;
    const avg = correct.length ? correct.reduce((sum, h) => sum + (mode === "audio" ? h.seconds : h.stage + 1), 0) / correct.length : null;
    const stats = [
      ["答對", `${correct.length} / ${history.length}`],
      mode === "audio" ? ["平均聽", avg == null ? "—" : `${trim(avg)} 秒`] : ["平均線索", avg == null ? "—" : `${trim(avg)} 條`],
      ["難度", levelName],
    ];
    const cellW = 300;
    const left = (W - cellW * 3) / 2;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(left + cellW * i, statTop - 30);
      ctx.lineTo(left + cellW * i, statTop + 90);
      ctx.stroke();
    }
    stats.forEach(([label, value], i) => drawStat(ctx, left + cellW * i, statTop, cellW, label, value));

    const gridBottom = drawGrid(ctx, history, mode, 1390, accent);

    ctx.fillStyle = C.faint;
    ctx.font = font(500, 26, BODY);
    ctx.textAlign = "center";
    ctx.fillText(mode === "audio" ? "格子裡是每題聽了幾秒就猜中" : "格子裡是每題用了幾條線索才猜中", W / 2, gridBottom + 52);

    ctx.fillStyle = C.text;
    ctx.font = font(900, 44, BODY);
    ctx.fillText("你能贏我嗎？", W / 2, Math.max(gridBottom + 140, 1620));
    ctx.fillStyle = C.faint;
    ctx.font = font(600, 28, MONO);
    ctx.fillText(url, W / 2, Math.max(gridBottom + 190, 1670));

    return canvas;
  }

  function trim(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function hexA(hex, alpha) {
    const h = hex.replace("#", "");
    const v = parseInt(h.length === 3 ? [...h].map((c) => c + c).join("") : h, 16);
    return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  // 固定種子的亂數，讓每次顆粒長得一樣
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.ShareCard = { render };
})();
