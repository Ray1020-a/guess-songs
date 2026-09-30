# ⚡ Gaga 猜歌王

一個 Lady Gaga 猜歌小遊戲，純前端、不需要安裝任何東西。

## 玩法

| 模式 | 說明 | 計分 |
| --- | --- | --- |
| 🎧 聽歌猜歌 | 用 iTunes 官方 30 秒試聽片段，從 1 秒開始聽，可以逐步解鎖 3／7／15 秒 | 100／70／40／20 分 |
| 🔎 線索猜歌 | 依序揭露冷知識 → 專輯與年份 → emoji，離線也能玩 | 100／60／30 分 |

- 每題四選一，可選 5／10／20 題。
- 鍵盤快捷鍵：`1`～`4` 選答案、空白鍵播放片段。
- 各模式、各題數的最佳紀錄存在瀏覽器的 localStorage。

## 執行

直接用瀏覽器打開 `index.html` 就能玩；或啟動一個靜態伺服器：

```bash
npx http-server .
```

也可以直接開啟 GitHub Pages（Settings → Pages → Deploy from branch）。

## 檔案結構

```
index.html      畫面結構
style.css       樣式
js/songs.js     線索模式題庫（自己寫的背景知識，不引用歌詞）
js/itunes.js    串接 iTunes Search API、過濾 remix／live／karaoke 等重複版本
js/game.js      遊戲流程與計分
```

## 版權

試聽片段與專輯封面由 Apple iTunes Search API 提供，版權屬原權利人所有；本專案不儲存任何音檔。
