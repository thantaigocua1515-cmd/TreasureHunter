# 🏴‍☠️ Treasure Hunter Survival — Core Platform

Nền tảng cốt lõi game mobile MMORPG 2D pixel-art: client Canvas + server Node.js WebSocket authoritative.

## Chơi demo ngay (không cần cài gì)

Mở thư mục `dist/` — file `treasure-hunter-survival-demo.html` (chế độ offline demo: đi, đánh quái, chặt cây, HUD đầy đủ, đã có art + nhạc Sunny Land). Lưu ý: cần giữ nguyên thư mục `dist/assets/` bên cạnh file html thì hình và nhạc mới hiện.

Muốn chơi **multiplayer thật**: xem `deploy/README.md` (VPS 5 phút / itch.io / GitHub Pages).

## Chạy thử local (2 phút)

**1. Server:**
```bash
cd server
npm install
npm start        # → ws://localhost:8080
```

**2. Client:** mở `client/index.html` trên trình duyệt
(phím tắt: `cd client && npx serve .` rồi mở http://localhost:3000 — hoặc mở file trực tiếp).

Không có server? Client tự chạy **OFFLINE DEMO** — vẫn đi, đánh, chặt cây được để test gameplay.

## Điều khiển

| PC | Mobile |
|---|---|
| WASD / mũi tên: di chuyển | Joystick ảo (chạm nửa trái màn hình) |
| Space: tấn công | Nút ⚔️: tấn công · ✋: thu hoạch |
| E: thu hoạch | |
| Shift: chạy nhanh | |

## Cấu trúc

```
treasure-hunter-survival/
├── docs/GDD.md            # Game Design Document
├── shared/protocol.js     # protocol + hằng số dùng chung client/server
├── client/
│   ├── index.html
│   ├── css/style.css
│   └── js/                # game, renderer (Y-sort), input, net, sprites, ui, main
└── server/
    ├── server.js          # ws server + game loop 20Hz
    ├── world.js           # world state, AI, respawn, boss patterns, PvP zone
    ├── combat.js          # công thức damage, roll phẩm chất
    ├── monsters.js        # Slime / Sói / Goblin / Golem Cổ Đại
    └── test/smoke.js      # smoke test handshake + snapshot
```

## Deploy lên Vercel (bản offline demo)

Repo đã có sẵn `vercel.json` (`outputDirectory: client`) — Vercel serve toàn bộ thư mục `client/` dưới dạng web tĩnh, không cần build command:

1. Vào [vercel.com/new](https://vercel.com/new) → **Import** repo `thantaigocua1515-cmd/TreasureHunter`
2. Framework Preset: **Other** (giữ nguyên, không cần build command)
3. Nhấn **Deploy** — xong, có link `https://treasure-hunter-xxx.vercel.app` chơi ngay trên điện thoại/máy tính

Lưu ý: bản trên Vercel chạy **OFFLINE DEMO** (không có server multiplayer — server Node + ws 20Hz không chạy được trên Vercel, cần host riêng như Render/Fly.io/VPS rồi trỏ WebSocket về).

## Test

```bash
cd server && npm run smoke   # cần server đang chạy
```

Chi tiết thiết kế: xem `docs/GDD.md`.

## Credits

- Art & music: **Sunny Land** — Luis Zuno (Ansimuz), giấy phép **CC0** (dùng tự do thương mại, không cần ghi credit). Xem `client/assets/SUNNYLAND-LICENSE.txt`.
- Nhạc nền demo: `happywalking.ogg` / `exploration.ogg` (SunnyLand Music pack — credit không bắt buộc nhưng nên ghi).
