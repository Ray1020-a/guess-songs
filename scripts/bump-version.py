"""在 index.html 裡的本地 CSS／JS 網址後面加上版本號，避免瀏覽器拿到新網頁配舊樣式。

每次改完 style.css 或 js/ 底下的檔案，推送前跑一次：
    python3 scripts/bump-version.py
"""
import re
import time
from pathlib import Path

index = Path(__file__).resolve().parent.parent / "index.html"
version = time.strftime("%Y%m%d%H%M")
html = index.read_text(encoding="utf-8")
# 只處理本地檔案（style.css、js/…），外部網址不動
html, count = re.subn(
    r'((?:href|src)="(?!https?:)(?:style\.css|js/[^"?]+\.js))(?:\?v=\d+)?"',
    rf'\1?v={version}"',
    html,
)
index.write_text(html, encoding="utf-8")
print(f"已更新 {count} 個檔案的版本號為 {version}")
