// 可選的歌手。clues 對應 js/clues/ 裡手寫的題庫；沒有題庫的歌手，線索模式改用 iTunes 資料自動出題。
// 沒寫到的欄位（tagline、ranks、colors、icon、countries）會用所屬地區的預設值。

window.REGIONS = [
  { id: "tw", name: "台灣", icon: "🎤", countries: ["tw", "us"], colors: { accent: "#4fd1c5", accent2: "#9be8a8", onAccent: "#04201e" } },
  { id: "twh", name: "台語", icon: "🏮", countries: ["tw", "us"], colors: { accent: "#ff9f43", accent2: "#ffd36b", onAccent: "#1f1102" } },
  { id: "jp", name: "日本", icon: "🌸", countries: ["tw", "jp", "us"], colors: { accent: "#ff6b8b", accent2: "#ffb7c5", onAccent: "#2a0610" } },
  { id: "west", name: "歐美", icon: "🎸", countries: ["tw", "us"], colors: { accent: "#7c8cff", accent2: "#c77dff", onAccent: "#0b0b2a" } },
  { id: "cn", name: "中國", icon: "🐉", countries: ["tw", "cn", "us"], colors: { accent: "#ff5a4f", accent2: "#ffc15e", onAccent: "#260402" } },
  { id: "in", name: "印度", icon: "🪷", countries: ["in", "us"], colors: { accent: "#ff9933", accent2: "#2ec4b6", onAccent: "#1f1000" } },
  { id: "th", name: "泰國", icon: "🐘", countries: ["th", "us"], colors: { accent: "#e0b83a", accent2: "#5ab0ff", onAccent: "#1a1404" } },
];

window.ARTISTS = [
  // ---------- 台灣 ----------
  { region: "tw", id: "jay", name: "周杰倫", terms: ["周杰倫", "Jay Chou"], match: /周杰倫|周杰伦|jay chou/i },
  { region: "tw", id: "mayday", name: "五月天", terms: ["五月天", "Mayday"], match: /五月天|^mayday\b(?! parade)/i },
  { region: "tw", id: "jolin", name: "蔡依林", terms: ["蔡依林", "Jolin Tsai"], match: /蔡依林|jolin tsai/i },
  { region: "tw", id: "amei", name: "張惠妹", terms: ["張惠妹", "A-Mei"], match: /張惠妹|张惠妹|a-?mei|阿密特/i },
  { region: "tw", id: "hebe", name: "田馥甄", terms: ["田馥甄", "Hebe Tien"], match: /田馥甄|hebe tien/i },
  { region: "tw", id: "yoga", name: "林宥嘉", terms: ["林宥嘉", "Yoga Lin"], match: /林宥嘉|yoga lin/i },
  { region: "tw", id: "accusefive", name: "告五人", terms: ["告五人", "Accusefive"], match: /告五人|accusefive/i },
  { region: "tw", id: "crowdlu", name: "盧廣仲", terms: ["盧廣仲", "Crowd Lu"], match: /盧廣仲|卢广仲|crowd lu/i },
  { region: "tw", id: "lala", name: "徐佳瑩", terms: ["徐佳瑩", "LaLa Hsu"], match: /徐佳瑩|徐佳莹|lala hsu/i },
  { region: "tw", id: "rainie", name: "楊丞琳", terms: ["楊丞琳", "Rainie Yang"], match: /楊丞琳|杨丞琳|rainie yang/i },
  {
    region: "tw",
    id: "hsiao",
    name: "蕭煌奇",
    terms: ["蕭煌奇"],
    match: /蕭煌奇|萧煌奇|ricky hsiao/i,
    colors: { accent: "#3cc6c0", accent2: "#8fe3a8", onAccent: "#04201e" },
  },

  // ---------- 台語 ----------
  { region: "twh", id: "jody", name: "江蕙", terms: ["江蕙", "Jody Chiang"], match: /江蕙|jody chiang/i },
  { region: "twh", id: "wubai", name: "伍佰", terms: ["伍佰", "Wu Bai"], match: /伍佰|wu bai/i },
  { region: "twh", id: "eggplantegg", name: "茄子蛋", terms: ["茄子蛋", "EggPlantEgg"], match: /茄子蛋|eggplantegg/i },
  { region: "twh", id: "jeannie", name: "謝金燕", terms: ["謝金燕", "Jeannie Hsieh"], match: /謝金燕|谢金燕|jeannie hsieh/i },
  { region: "twh", id: "chenlei", name: "陳雷", terms: ["陳雷"], match: /陳雷|陈雷/ },

  // ---------- 日本 ----------
  {
    region: "jp",
    id: "yoasobi",
    name: "YOASOBI",
    icon: "🌙",
    tagline: "把小說變成音樂的兩人組，你認得幾首？",
    terms: ["yoasobi"],
    match: /yoasobi/i,
    // E-SIDE 系列是英文版，歌名不同但旋律一樣，排除以免選項重複
    excludeCollection: /e-side/i,
    colors: { accent: "#6f95ff", accent2: "#ff7ac8", onAccent: "#ffffff" },
    ranks: ["Ayase 和 ikura 本人？🌙", "資深 YOASOBI 迷 📖", "剛讀完第一本 THE BOOK 📘", "先去把《THE BOOK》聽完再來 📀"],
  },
  { region: "jp", id: "yonezu", name: "米津玄師", terms: ["米津玄師", "Kenshi Yonezu"], match: /米津玄師|米津玄师|kenshi yonezu/i },
  { region: "jp", id: "mga", name: "Mrs. GREEN APPLE", short: "Mrs. GREEN APPLE", terms: ["Mrs. GREEN APPLE"], match: /mrs\.? ?green apple/i },
  { region: "jp", id: "higedan", name: "Official髭男dism", short: "髭男", terms: ["Official髭男dism", "Official HIGE DANdism"], match: /official髭男dism|official hige dandism/i },
  { region: "jp", id: "kinggnu", name: "King Gnu", terms: ["King Gnu"], match: /king gnu/i },
  { region: "jp", id: "ado", name: "Ado", terms: ["Ado"], match: /^ado(\s*[,&×x、]|$)/i },
  { region: "jp", id: "aimyon", name: "あいみょん", terms: ["あいみょん", "Aimyon"], match: /あいみょん|aimyon/i },
  { region: "jp", id: "backnumber", name: "back number", terms: ["back number"], match: /back number/i },
  { region: "jp", id: "utada", name: "宇多田ヒカル", short: "宇多田", terms: ["宇多田ヒカル", "Hikaru Utada"], match: /宇多田ヒカル|hikaru utada|^utada$/i },
  { region: "jp", id: "vaundy", name: "Vaundy", terms: ["Vaundy"], match: /vaundy/i },
  // 區分大小寫，避免和泰國的 LISA 混在一起
  { region: "jp", id: "lisa-jp", name: "LiSA", terms: ["LiSA"], match: /^LiSA(\s*[,&×x、]|$)/ },

  // ---------- 歐美 ----------
  {
    region: "west",
    id: "gaga",
    name: "Lady Gaga",
    short: "Gaga",
    icon: "⚡",
    tagline: "你是真正的 Little Monster 嗎？",
    terms: ["lady gaga"],
    match: /lady gaga/i,
    // 《捍衛戰士：獨行俠》原聲帶大多是她和 Hans Zimmer 等人掛名的配樂，太難猜
    excludeCollection: /top gun/i,
    // 《Chromatica》的三段管弦樂間奏很好玩，雖然很短也保留
    allowShort: /^chromatica i+$/i,
    colors: { accent: "#ff2d95", accent2: "#b46bff", onAccent: "#ffffff" },
    ranks: ["Mother Monster 本人？👑", "資深 Little Monster 🐾", "還在練舞的 Monster 💃", "先去把《The Fame》聽完再來 📀"],
  },
  {
    region: "west",
    id: "mj",
    name: "Michael Jackson",
    short: "MJ",
    icon: "🧤",
    tagline: "你跟得上 King of Pop 的舞步嗎？",
    terms: ["michael jackson"],
    match: /michael jackson/i,
    colors: { accent: "#f2c14e", accent2: "#fff1c9", onAccent: "#1a1206" },
    ranks: ["King of Pop 本人？👑", "月球漫步大師 🕺", "還在練 moonwalk 的新手 🧦", "先去把《Thriller》聽完再來 📀"],
  },
  {
    region: "west",
    id: "bruno",
    name: "Bruno Mars",
    short: "Bruno",
    icon: "🎩",
    tagline: "你是真正的 Hooligan 嗎？",
    terms: ["bruno mars"],
    match: /bruno mars/i,
    colors: { accent: "#ff7a3d", accent2: "#ffc857", onAccent: "#1a0c05" },
    ranks: ["Bruno 本人？🎩", "資深 Hooligan 🕶️", "剛戴上 24K 金鍊的新手 🪙", "先去把《Doo-Wops & Hooligans》聽完再來 📀"],
  },
  {
    region: "west",
    id: "ariana",
    name: "Ariana Grande",
    short: "Ariana",
    icon: "🎀",
    tagline: "你是真正的 Arianator 嗎？",
    terms: ["ariana grande"],
    match: /ariana grande/i,
    colors: { accent: "#c9a3ff", accent2: "#ffb3d9", onAccent: "#1b0f2b" },
    ranks: ["Ariana 本人？🎀", "資深 Arianator 💜", "正在綁高馬尾的新手 🎀", "先去把《thank u, next》聽完再來 📀"],
  },
  { region: "west", id: "taylor", name: "Taylor Swift", short: "Taylor", tagline: "你是真正的 Swiftie 嗎？", terms: ["Taylor Swift"], match: /taylor swift/i },
  { region: "west", id: "edsheeran", name: "Ed Sheeran", short: "Ed Sheeran", terms: ["Ed Sheeran"], match: /ed sheeran/i },
  { region: "west", id: "billie", name: "Billie Eilish", short: "Billie", terms: ["Billie Eilish"], match: /billie eilish/i },
  { region: "west", id: "weeknd", name: "The Weeknd", terms: ["The Weeknd"], match: /the weeknd/i },
  { region: "west", id: "adele", name: "Adele", terms: ["Adele"], match: /^adele(\s*[,&]|$)/i },
  { region: "west", id: "dualipa", name: "Dua Lipa", terms: ["Dua Lipa"], match: /dua lipa/i },
  { region: "west", id: "coldplay", name: "Coldplay", terms: ["Coldplay"], match: /coldplay/i },
  { region: "west", id: "beyonce", name: "Beyoncé", terms: ["Beyonce"], match: /beyonc[eé]/i },
  { region: "west", id: "bieber", name: "Justin Bieber", short: "Bieber", terms: ["Justin Bieber"], match: /justin bieber/i },
  { region: "west", id: "olivia", name: "Olivia Rodrigo", short: "Olivia", terms: ["Olivia Rodrigo"], match: /olivia rodrigo/i },

  // ---------- 中國 ----------
  { region: "cn", id: "faye", name: "王菲", terms: ["王菲", "Faye Wong"], match: /王菲|faye wong/i },
  { region: "cn", id: "naying", name: "那英", terms: ["那英", "Na Ying"], match: /那英|na ying/i },
  { region: "cn", id: "zhoushen", name: "周深", terms: ["周深", "Zhou Shen"], match: /周深|zhou shen|charlie zhou/i },
  { region: "cn", id: "maobuyi", name: "毛不易", terms: ["毛不易", "Mao Buyi"], match: /毛不易|mao buyi/i },
  { region: "cn", id: "ronghao", name: "李榮浩", terms: ["李榮浩", "李荣浩", "Ronghao Li"], match: /李榮浩|李荣浩|ronghao li|li ronghao/i },
  { region: "cn", id: "huachenyu", name: "華晨宇", terms: ["華晨宇", "华晨宇", "Hua Chenyu"], match: /華晨宇|华晨宇|hua chenyu/i },
  { region: "cn", id: "janezhang", name: "張靚穎", terms: ["張靚穎", "张靓颖", "Jane Zhang"], match: /張靚穎|张靓颖|jane zhang/i },
  { region: "cn", id: "joker", name: "薛之謙", terms: ["薛之謙", "薛之谦", "Joker Xue"], match: /薛之謙|薛之谦|joker xue/i },
  { region: "cn", id: "lijian", name: "李健", terms: ["李健", "Li Jian"], match: /^李健($|\s*[,&])|li jian/i },
  { region: "cn", id: "pushu", name: "朴樹", terms: ["朴樹", "朴树", "Pu Shu"], match: /朴樹|朴树|樸樹|pu shu/i },

  // ---------- 印度 ----------
  { region: "in", id: "arijit", name: "Arijit Singh", short: "Arijit", terms: ["Arijit Singh"], match: /arijit singh/i },
  { region: "in", id: "rahman", name: "A.R. Rahman", terms: ["A.R. Rahman"], match: /a\.?\s?r\.?\s?rahman/i },
  { region: "in", id: "shreya", name: "Shreya Ghoshal", short: "Shreya", terms: ["Shreya Ghoshal"], match: /shreya ghoshal/i },

  // ---------- 泰國 ----------
  { region: "th", id: "bodyslam", name: "Bodyslam", terms: ["Bodyslam", "บอดี้สแลม"], match: /bodyslam|บอดี้สแลม/i },
  { region: "th", id: "palmy", name: "Palmy", terms: ["Palmy", "ปาล์มมี่"], match: /palmy|ปาล์มมี่/i },
  { region: "th", id: "phum", name: "Phum Viphurit", short: "Phum", terms: ["Phum Viphurit"], match: /phum viphurit/i },
];

// 用地區預設值補齊每位歌手沒寫到的欄位
for (const artist of window.ARTISTS) {
  const region = window.REGIONS.find((r) => r.id === artist.region);
  const short = artist.short || artist.name;
  Object.assign(artist, {
    short,
    icon: artist.icon || region.icon,
    countries: artist.countries || region.countries,
    colors: artist.colors || region.colors,
    tagline: artist.tagline || `${artist.name} 的歌，你認得幾首？`,
    ranks: artist.ranks || [`${short} 本人？👑`, "資深歌迷 🎧", "有在認真聽的路人 🙂", "先去多聽幾首再來 📀"],
  });
}

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
