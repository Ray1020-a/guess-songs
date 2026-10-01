// 「猜歌手」模式的歌單。四個選項都從同一個歌單裡挑，
// 所以同一個歌單裡的歌手要聲線、曲風、年代相近，才不會一聽語言或曲風就猜得出來。
// 女聲、男聲、樂團分開放；灣聲樂團是純器樂，不放進任何歌單。
const GROUP_RANKS = ["耳朵是雷達吧？👂", "聽聲辨人高手 🎧", "還在暖耳朵 🎶", "先多聽幾首再來 📀"];

window.GROUPS = [
  {
    id: "mix",
    name: "大亂鬥",
    icon: "🎲",
    desc: "全部歌手隨機出題，語言曲風都不同，最適合暖身",
    colors: { accent: "#ff6b8b", accent2: "#7c8cff", onAccent: "#1a0610" },
    artists: "*",
  },
  {
    id: "zh-diva",
    name: "華語天后",
    icon: "👑",
    desc: "全是華語女聲，要聽得出誰是誰",
    colors: { accent: "#ff7eb6", accent2: "#ffc2dc", onAccent: "#2a0414" },
    artists: ["jolin", "amei", "hebe", "rainie", "cyndi", "angelachang", "she", "reneliu", "lala", "maggiechiang", "eveai", "naiwen", "cheerchen", "waawei", "deserts", "faye", "naying", "janezhang", "9m88"],
  },
  {
    id: "zh-male",
    name: "華語男聲",
    icon: "🎤",
    desc: "從情歌王子到創作才子，全是華語男歌手",
    colors: { accent: "#4fd1c5", accent2: "#9be8a8", onAccent: "#04201e" },
    artists: ["jay", "yoga", "jamhsiao", "ericchou", "weibird", "davidtao", "wilberpan", "crowdlu", "hsiao", "wakin", "richiejen", "harlemyu", "ayue", "qingfeng", "ronghao", "joker", "zhoushen", "maobuyi", "huachenyu", "lijian", "pushu", "chyichin", "jonathanlee", "tomchang"],
  },
  {
    id: "tw-band",
    name: "台灣樂團",
    icon: "🥁",
    desc: "五月天、告五人、草東……主唱的聲音你分得出來嗎？",
    colors: { accent: "#5fd38d", accent2: "#c6f36b", onAccent: "#06210f" },
    artists: ["mayday", "sodagreen", "accusefive", "831", "caodong", "sunsetrollercoaster", "mangojump", "cosmospeople", "powerstation", "mj116", "fireex", "amazingshow", "sorryyouth", "chairman", "eggplantegg", "chthonic"],
  },
  {
    id: "twh-diva",
    name: "台語天后",
    icon: "🏮",
    desc: "江蕙、黃乙玲、龍千玉……台語女聲大集合",
    colors: { accent: "#ff9f43", accent2: "#ffd36b", onAccent: "#1f1102" },
    artists: ["jody", "jeannie", "huangyiling", "lungchienyu", "tsaichiufeng", "chanyawen", "huangfei", "tsenghsinmei", "chenyalan", "chenyingchieh", "wushenmei", "changhsiuching"],
  },
  {
    id: "twh-male",
    name: "台語男聲",
    icon: "🍶",
    desc: "伍佰、陳雷、王識賢……台語男歌手大集合",
    colors: { accent: "#f0a35e", accent2: "#ffe0a3", onAccent: "#1f1102" },
    artists: ["wubai", "chenlei", "yehchitien", "hungjunghung", "wangshihhsien", "wengliyu", "chiangchihfeng", "huangshanliang", "chengchinyi", "loshihfeng", "tsaihsiaohu", "chenmingchang", "limgiong"],
  },
  {
    id: "classic",
    name: "經典老歌",
    icon: "📻",
    desc: "鄧麗君、費玉清、文夏……華語台語都有，爸媽的歌單",
    colors: { accent: "#e0b86b", accent2: "#f5e3b5", onAccent: "#1d1405" },
    artists: ["teresateng", "feiyuching", "jonathanlee", "chyichin", "tomchang", "wakin", "harlemyu", "richiejen", "wenhsia", "hungyifeng", "yehchitien", "jody", "faye", "naying"],
  },
  {
    id: "jpop",
    name: "J-POP",
    icon: "🌸",
    desc: "YOASOBI、米津玄師、Ado……日本流行樂",
    colors: { accent: "#ff6b8b", accent2: "#ffb7c5", onAccent: "#2a0610" },
    artists: ["yoasobi", "yonezu", "mga", "higedan", "kinggnu", "ado", "aimyon", "backnumber", "utada", "vaundy", "lisa-jp"],
  },
  {
    id: "kpop",
    name: "K-POP",
    icon: "💜",
    desc: "BTS、BLACKPINK、TWICE……韓國流行樂",
    colors: { accent: "#9b8cff", accent2: "#5fe1ff", onAccent: "#0d0a2a" },
    artists: ["bts", "blackpink", "twice", "newjeans", "straykids", "psy", "iu"],
  },
  {
    id: "west-diva",
    name: "歐美天后",
    icon: "💃",
    desc: "從瑪丹娜到 Sabrina Carpenter，全是歐美女聲",
    colors: { accent: "#ff5fa2", accent2: "#c77dff", onAccent: "#26041a" },
    artists: ["gaga", "ariana", "taylor", "billie", "adele", "dualipa", "beyonce", "olivia", "rihanna", "sza", "dojacat", "katyperry", "sabrina", "lanadelrey", "madonna", "whitney", "mariah", "britney", "aliciakeys", "sia", "selena", "miley", "pink", "celine"],
  },
  {
    id: "west-male",
    name: "歐美男聲",
    icon: "🕺",
    desc: "從貓王、MJ 到 Bruno Mars，全是歐美男歌手",
    colors: { accent: "#7c8cff", accent2: "#5fe1ff", onAccent: "#0b0b2a" },
    artists: ["mj", "bruno", "edsheeran", "weeknd", "bieber", "harrystyles", "eltonjohn", "elvis", "prince", "steviewonder", "bowie", "timberlake", "usher", "shawnmendes", "charlieputh", "samsmith", "capaldi", "frankocean", "postmalone", "morganwallen", "bobmarley"],
  },
  {
    id: "hiphop",
    name: "嘻哈饒舌",
    icon: "🧢",
    desc: "Eminem、Drake、Kendrick……聽 flow 認人",
    colors: { accent: "#ffcc33", accent2: "#ff7a3d", onAccent: "#241500" },
    artists: ["drake", "eminem", "kendrick", "travisscott", "future", "nickiminaj", "cardib", "jayz", "snoop", "fiftycent", "postmalone"],
  },
  {
    id: "rock",
    name: "搖滾樂團",
    icon: "🎸",
    desc: "從披頭四、Queen 到 Imagine Dragons",
    colors: { accent: "#ff5d4f", accent2: "#ffb057", onAccent: "#260402" },
    artists: ["coldplay", "imaginedragons", "maroon5", "linkinpark", "queen", "beatles", "nirvana", "metallica", "acdc", "gnr", "rhcp", "oasis", "radiohead", "u2", "bonjovi", "pinkfloyd", "ledzeppelin", "rollingstones", "fleetwoodmac", "eagles", "greenday", "twentyonepilots", "arcticmonkeys", "onerepublic", "abba"],
  },
  {
    id: "edm",
    name: "電音派對",
    icon: "🎧",
    desc: "Avicii、Calvin Harris、Daft Punk……聽製作風格認 DJ",
    colors: { accent: "#3df2e0", accent2: "#b46bff", onAccent: "#032421" },
    artists: ["calvinharris", "guetta", "avicii", "daftpunk", "marshmello", "chainsmokers"],
  },
  {
    id: "latin",
    name: "拉丁熱浪",
    icon: "🌶️",
    desc: "Bad Bunny、Shakira、KAROL G……",
    colors: { accent: "#ffc23d", accent2: "#ff5e5b", onAccent: "#241500" },
    artists: ["badbunny", "shakira", "jbalvin", "karolg", "daddyyankee", "ozuna", "rosalia"],
  },
  {
    id: "asia",
    name: "印度與泰國",
    icon: "🪷",
    desc: "寶萊塢配樂與泰國流行樂",
    colors: { accent: "#ff9933", accent2: "#2ec4b6", onAccent: "#1f1000" },
    artists: ["arijit", "rahman", "shreya", "bodyslam", "palmy", "phum"],
  },
];

// 「大亂鬥」展開成全部歌手；每個歌單也變成一個「假歌手」，讓計分、成績圖可以沿用
for (const group of window.GROUPS) {
  if (group.artists === "*") group.artists = window.ARTISTS.filter((a) => a.id !== "onesong").map((a) => a.id);
  group.artists = group.artists.filter((id) => window.ARTISTS.some((a) => a.id === id));
  group.subject = {
    id: `group-${group.id}`,
    name: group.name,
    short: group.name,
    icon: group.icon,
    colors: group.colors,
    ranks: GROUP_RANKS,
  };
}
