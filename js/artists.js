// 可選的歌手。clues 對應 js/clues/ 裡手寫的題庫；沒有題庫的歌手，線索模式改用 iTunes 資料自動出題。
window.ARTISTS = [
  {
    id: "gaga",
    name: "Lady Gaga",
    short: "Gaga",
    icon: "⚡",
    tagline: "你是真正的 Little Monster 嗎？",
    term: "lady gaga",
    match: /lady gaga/i,
    // 《捍衛戰士：獨行俠》原聲帶大多是她和 Hans Zimmer 等人掛名的配樂，太難猜
    excludeCollection: /top gun/i,
    // 《Chromatica》裡的三段管弦樂間奏
    excludeTrack: /^chromatica i+$/i,
    countries: ["tw", "us"],
    colors: { accent: "#ff2d95", accent2: "#b46bff", onAccent: "#ffffff" },
    ranks: ["Mother Monster 本人？👑", "資深 Little Monster 🐾", "還在練舞的 Monster 💃", "先去把《The Fame》聽完再來 📀"],
  },
  {
    id: "mj",
    name: "Michael Jackson",
    short: "MJ",
    icon: "🧤",
    tagline: "你跟得上 King of Pop 的舞步嗎？",
    term: "michael jackson",
    match: /michael jackson/i,
    countries: ["tw", "us"],
    colors: { accent: "#f2c14e", accent2: "#fff1c9", onAccent: "#1a1206" },
    ranks: ["King of Pop 本人？👑", "月球漫步大師 🕺", "還在練 moonwalk 的新手 🧦", "先去把《Thriller》聽完再來 📀"],
  },
  {
    id: "bruno",
    name: "Bruno Mars",
    short: "Bruno",
    icon: "🎩",
    tagline: "你是真正的 Hooligan 嗎？",
    term: "bruno mars",
    match: /bruno mars/i,
    countries: ["tw", "us"],
    colors: { accent: "#ff7a3d", accent2: "#ffc857", onAccent: "#1a0c05" },
    ranks: ["Bruno 本人？🎩", "資深 Hooligan 🕶️", "剛戴上 24K 金鍊的新手 🪙", "先去把《Doo-Wops & Hooligans》聽完再來 📀"],
  },
  {
    id: "hsiao",
    name: "蕭煌奇",
    short: "蕭煌奇",
    icon: "🎤",
    tagline: "蕭煌奇的歌，你認得幾首？",
    term: "蕭煌奇",
    match: /蕭煌奇|萧煌奇|ricky hsiao/i,
    countries: ["tw", "us"],
    colors: { accent: "#3cc6c0", accent2: "#8fe3a8", onAccent: "#04201e" },
    ranks: ["蕭煌奇本人？🎤", "資深歌迷 🎶", "KTV 常客 🎙️", "先去多聽幾首再來 🎧"],
  },
  {
    id: "ariana",
    name: "Ariana Grande",
    short: "Ariana",
    icon: "🎀",
    tagline: "你是真正的 Arianator 嗎？",
    term: "ariana grande",
    match: /ariana grande/i,
    countries: ["tw", "us"],
    colors: { accent: "#c9a3ff", accent2: "#ffb3d9", onAccent: "#1b0f2b" },
    ranks: ["Ariana 本人？🎀", "資深 Arianator 💜", "正在綁高馬尾的新手 🎀", "先去把《thank u, next》聽完再來 📀"],
  },
  {
    id: "yoasobi",
    name: "YOASOBI",
    short: "YOASOBI",
    icon: "🌙",
    tagline: "把小說變成音樂的兩人組，你認得幾首？",
    term: "yoasobi",
    match: /yoasobi/i,
    // E-SIDE 系列是英文版，歌名不同但旋律一樣，排除以免選項重複
    excludeCollection: /e-side/i,
    countries: ["tw", "jp", "us"],
    colors: { accent: "#6f95ff", accent2: "#ff7ac8", onAccent: "#ffffff" },
    ranks: ["Ayase 和 ikura 本人？🌙", "資深 YOASOBI 迷 📖", "剛讀完第一本 THE BOOK 📘", "先去把《THE BOOK》聽完再來 📀"],
  },
];

// 線索題庫的精簡寫法：
// t 歌名、a 專輯、y 專輯年份、f 冷知識、e emoji、w 自訂第二條線索（非專輯單曲或客串時用）、deep 非主打的冷門歌
window.CLUES = {};
window.defineClues = function (id, rows) {
  window.CLUES[id] = rows.map((r) => ({
    title: r.t,
    album: r.a || "",
    year: r.y,
    deep: Boolean(r.deep),
    clues: [r.f, r.w || `收錄於《${r.a}》（${r.y}）。`, r.e],
  }));
};
