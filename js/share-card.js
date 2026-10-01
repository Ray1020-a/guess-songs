// 把一局的成績畫成 IG 限時動態尺寸（1080×1920，9:16）的圖片。
// 重要資訊都放在上下各留 250px 的安全區之間，避免被 IG 的介面蓋住。
// 顏色和網頁共用同一套（style.css 的 :root），成績圖看起來才像從網站裡拿出來的。
(function () {
  const W = 1080;
  const H = 1920;
  const C = {
    bg: "#15130f",
    text: "#ebe3d5",
    muted: "#a69d8f",
    faint: "#70685d",
    line: "rgba(255, 244, 228, 0.12)",
    bad: "#d98b7c",
    vinyl: "#121110",
    groove: "#1d1b19",
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

  // 和網頁一樣：暖色深底，上方一點點檯燈般的光
  function drawBackground(ctx) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 1000);
    glow.addColorStop(0, "rgba(255, 226, 184, 0.09)");
    glow.addColorStop(1, "rgba(255, 226, 184, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  // 從圖片中央裁出指定長寬比的範圍
  function centerCrop(img, aspect) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    return iw / ih > aspect ? [(iw - ih * aspect) / 2, 0, ih * aspect, ih] : [0, (ih - iw / aspect) / 2, iw, iw / aspect];
  }

  // 只在 0～1 之間淡入淡出的漸層遮罩，配合 destination-in 把圖片邊緣變透明
  function fadeMask(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [at, alpha] of stops) g.addColorStop(at, `rgba(0, 0, 0, ${alpha})`);
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }

  // 專輯封面當背景：整張鋪一層糊掉的封面當底色，上半部再放清楚的封面，四邊霧化接進底色
  function drawCoverBackground(ctx, img) {
    // 先縮到很小再放大，等於很重的模糊；不用 ctx.filter，舊版 Safari 也畫得出來
    const tiny = makeCanvas(18, 32);
    const tinyCtx = tiny.getContext("2d");
    tinyCtx.drawImage(img, ...centerCrop(img, W / H), 0, 0, 18, 32);
    const mid = makeCanvas(135, 240);
    const midCtx = mid.getContext("2d");
    midCtx.imageSmoothingQuality = "high";
    midCtx.drawImage(tiny, 0, 0, 135, 240);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(mid, 0, 0, W, H);
    ctx.fillStyle = hexA(C.bg, 0.5);
    ctx.fillRect(0, 0, W, H);

    const sharp = makeCanvas(W, W);
    const sharpCtx = sharp.getContext("2d");
    sharpCtx.imageSmoothingQuality = "high";
    sharpCtx.drawImage(img, ...centerCrop(img, 1), 0, 0, W, W);
    fadeMask(sharpCtx, 0, 0, 0, W, [[0, 0.35], [0.12, 1], [0.45, 1], [0.86, 0]]);
    fadeMask(sharpCtx, 0, 0, W, 0, [[0, 0], [0.14, 1], [0.86, 1], [1, 0]]);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(sharp, 0, 0);
    ctx.globalAlpha = 1;

    // 上方壓暗一點給標題，下半部壓暗給分數與格子
    const top = ctx.createLinearGradient(0, 0, 0, 340);
    top.addColorStop(0, hexA(C.bg, 0.6));
    top.addColorStop(1, hexA(C.bg, 0));
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 340);
    const bottom = ctx.createLinearGradient(0, 560, 0, 1060);
    bottom.addColorStop(0, hexA(C.bg, 0));
    bottom.addColorStop(1, hexA(C.bg, 0.72));
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 560, W, 500);
    ctx.fillStyle = hexA(C.bg, 0.72);
    ctx.fillRect(0, 1060, W, H - 1060);

    // 四角暗角，讓畫面往中間收
    const vignette = ctx.createRadialGradient(W / 2, H * 0.42, 420, W / 2, H * 0.42, 1250);
    vignette.addColorStop(0, hexA(C.bg, 0));
    vignette.addColorStop(1, hexA(C.bg, 0.55));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    return coverTint(tinyCtx);
  }

  // 從封面取一個柔和的主色給分數和格子用，才不會和封面撞色。
  // 越鮮豔、越亮的像素權重越高，灰階封面就會得到淡淡的灰。
  function coverTint(tinyCtx) {
    const d = tinyCtx.getImageData(0, 0, tinyCtx.canvas.width, tinyCtx.canvas.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;
    for (let i = 0; i < d.length; i += 4) {
      const max = Math.max(d[i], d[i + 1], d[i + 2]);
      const min = Math.min(d[i], d[i + 1], d[i + 2]);
      const weight = 0.05 + (max ? (max - min) / max : 0) * (max / 255);
      r += d[i] * weight;
      g += d[i + 1] * weight;
      b += d[i + 2] * weight;
      total += weight;
    }
    const [h, sat] = rgbToHsl(r / total, g / total, b / total);
    return { accent: hslToHex(h, Math.min(sat, 0.48), 0.72), onAccent: hslToHex(h, Math.min(sat, 0.35), 0.12) };
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }

  function hslToHex(h, s, l) {
    const f = (n) => {
      const k = (n + h * 12) % 12;
      const a = s * Math.min(l, 1 - l);
      const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(v * 255).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function drawGrain(ctx) {
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
  function drawGrid(ctx, history, mode, top, accent, onAccent) {
    const n = history.length;
    const perRow = n <= 10 ? Math.min(n, 5) : 10;
    const gap = 14;
    const size = Math.min(92, Math.floor((900 - gap * (perRow - 1)) / perRow));
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
        ctx.fillStyle = onAccent;
        ctx.font = font(800, Math.round(size * 0.3), DISPLAY);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(h.seconds ? `${h.seconds}s` : `${h.stage + 1}`, x + size / 2, y + size / 2 + 2);
        ctx.textBaseline = "alphabetic";
      } else {
        ctx.fillStyle = "rgba(255, 244, 228, 0.06)";
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
    const { artist, mode, modeName, levelName, levelLabel = "難度", score, max, rank, history, isRecord, url, cover } = data;
    // 聽歌模式看秒數；其他模式看用了幾段線索或提示
    const unit =
      mode === "audio" || mode === "artist"
        ? { stat: "平均聽", suffix: "秒", legend: mode === "artist" ? "格子裡是每題聽了幾秒就認出歌手" : "格子裡是每題聽了幾秒就猜中" }
        : mode === "clue"
          ? { stat: "平均線索", suffix: "條", legend: "格子裡是每題用了幾條線索才猜中" }
          : { stat: "平均提示", suffix: "段", legend: "格子裡是每題看了幾段提示才答對" };
    let accent = artist.colors.accent;
    const accent2 = artist.colors.accent2;
    let onAccent = artist.colors.onAccent;
    const canvas = makeCanvas(W, H);
    const ctx = canvas.getContext("2d");

    if (cover) ({ accent, onAccent } = drawCoverBackground(ctx, cover));
    else drawBackground(ctx);
    drawGrain(ctx);
    // 封面當背景時底下有圖案，字加一點陰影才讀得清楚
    if (cover) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 28;
    }

    ctx.fillStyle = C.muted;
    ctx.font = font(600, 30, MONO);
    spaced(ctx, "GUESS THE SONG", W / 2, 170, 10);
    ctx.fillStyle = C.text;
    ctx.font = font(700, 32, BODY);
    ctx.textAlign = "center";
    ctx.fillText(modeName, W / 2, 222);

    // 有封面就讓封面當主角，不再疊一張唱片
    if (!cover) drawVinyl(ctx, W / 2, 460, 190, accent, accent2, artist.icon);

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
    const avg = correct.length ? correct.reduce((sum, h) => sum + (h.seconds || h.stage + 1), 0) / correct.length : null;
    const stats = [
      ["答對", `${correct.length} / ${history.length}`],
      [unit.stat, avg == null ? "—" : `${trim(avg)} ${unit.suffix}`],
      [levelLabel, levelName],
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

    const gridBottom = drawGrid(ctx, history, mode, 1380, accent, onAccent);

    ctx.fillStyle = C.faint;
    ctx.font = font(500, 26, BODY);
    ctx.textAlign = "center";
    ctx.fillText(unit.legend, W / 2, gridBottom + 52);

    drawLinkSlot(ctx, Math.max(gridBottom + 84, 1600), url);

    return canvas;
  }

  // 底部的虛線框：留給 IG 的「連結」貼圖蓋上去。
  // 框裡照樣寫挑戰句和網址，沒貼貼圖的人也看得到要去哪裡玩。
  function drawLinkSlot(ctx, top, url) {
    const w = 640;
    const h = 124;
    const x = (W - w) / 2;
    ctx.save();
    ctx.shadowColor = "transparent";
    roundRect(ctx, x, top, w, h, h / 2);
    ctx.fillStyle = "rgba(255, 244, 228, 0.06)";
    ctx.fill();
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = hexA(C.text, 0.5);
    ctx.stroke();
    ctx.restore();

    fitText(ctx, "你能贏我嗎？", W / 2, top + 56, { weight: 900, size: 38, family: BODY, maxWidth: w - 80, color: C.text });
    fitText(ctx, ellipsize(ctx, url, font(600, 20, MONO), w - 80), W / 2, top + 96, {
      weight: 600,
      size: 24,
      family: MONO,
      maxWidth: w - 80,
      color: C.muted,
      minSize: 20,
    });
  }

  // 縮到最小字還放不下，就從尾巴截掉補「…」，不要整串畫出框外
  function ellipsize(ctx, text, f, maxWidth) {
    ctx.font = f;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
    return `${s}…`;
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
