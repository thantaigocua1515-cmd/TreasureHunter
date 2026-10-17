# TREASURE HUNTER SURVIVAL — Game Design Document (Core)

> 2D Pixel-Art MMORPG · Survival · Open-World · Crafting & Sandbox
> Nền tảng: Web H5 (Canvas) + WebSocket multiplayer thời gian thực

## 1. Pillars (3 trụ thiết kế)

1. **Tự do tuyệt đối** — không class, build nhân vật bằng vũ khí + skill book nhặt được.
2. **Rủi ro & phần thưởng** — tài nguyên ngon và Boss xịn nằm ở vùng PvP nguy hiểm.
3. **Sống sót để cày** — đói/kiệt sức thật sự "cắn" vào chỉ số, không phải thanh cho có.

## 2. Thế giới & bản đồ

- Map 3200×3200 px, chia 3 vùng:
  - **Vùng An Toàn** (quanh điểm spawn): quái yếu (Slime), tài nguyên cơ bản, cấm PvP.
  - **Vùng Hoang Dã**: Sói, Goblin, tài nguyên cấp cao hơn, quái hung hăng hơn.
  - **Khu Hỗn Chiến** (PvP, vòng đỏ đứt nét ở đông-nam): PvP tự do, tỉ lệ rơi đồ hiếm cao hơn, Boss Golem Cổ Đại ở trung tâm bản đồ gần đó.
- Chu kỳ ngày/đêm (roadmap): đêm quái mạnh +25%, rơi đồ tốt hơn.

## 3. Classless — Nhân vật không class

- Chỉ số gốc: HP 100 · Công 12 · Thủ 4 · Tốc 175 px/s.
- **Vũ khí quyết định lối chơi**, đổi tự do:
  - Kiếm (cân bằng), Cung (đánh xa — roadmap), Trượng (phép — roadmap).
- **Skill books**: rơi từ quái tinh anh/Boss, học skill chủ động (roadmap: Dash, Hồi máu, Mưa tên).
- **Cây kỹ năng tổng quát** (roadmap): 3 nhánh Sinh Tồn / Chiến Đấu / Chế Tạo, tăng bằng điểm kinh nghiệm.

## 4. Sinh tồn (Survival)

| Chỉ số | Hết thì sao | Hồi bằng gì |
|---|---|---|
| Thể lực (Stamina) | Không chạy nhanh được | Đứng yên / đi bộ |
| Đói (Hunger, ~5 phút từ no → đói) | Mất 2 HP/s, ngừng hồi máu | Ăn thịt/quả (🍖) |

## 5. Thu thập & Chế tạo

- **Chặt gỗ** (cây) → 🪵 · **Đào đá** (mỏ) → 🪨 · **Hái thảo dược** → 🌿 (+🍖).
- Node có HP riêng, cạn → hồi sinh sau 18–25s (chống camp 1 chỗ).
- Công thức hiện tại:
  - Kiếm Gỗ (+6 công): 8 🪵 · Kiếm Sắt (+14): 6 🪵 + 10 🪨
  - Cung Gỗ (+10): 12 🪵 · Trượng Thảo Dược (+12): 6 🪵 + 8 🌿

## 6. Combat & Boss

- Real-time, server authoritative (chống cheat): công thức
  `dmg = atk × (1 − def/(def+120)) × variance(±10%) × crit(×1.6)`.
- Phẩm chất rơi đồ: **Thường → Tinh Lệ → Sử Thi → Huyền Thoại** (hệ số 1.0 / 1.25 / 1.6 / 2.1).
- **Golem Cổ Đại** (2600 HP): 3 skill pattern có telegraph đỏ 1–1.2s trước khi nổ:
  - *Dậm Đất*: AoE quanh thân · *Đá Rơi*: 5 vùng ngẫu nhiên · *Triệu Hồi*: gọi 2 Slime.
  - Hồi sinh sau 120s → tạo điểm hẹn tranh Boss cho guild/party.

## 7. Xây dựng & Căn cứ (Housing)

- Đặt tự do trên map: **Lều** (10 🪵, hồi máu khi đứng gần — roadmap),
  **Bàn Chế Tạo** (mở craft nâng cao), **Rương** (chứa đồ chung party),
  **Tường Gỗ** (4 🪵, chặn quái/PvP).
- Roadmap: nâng cấp lều → nhà, thuế đất vùng PvP.

## 8. Multiplayer & Xã hội

- **Chat thế giới** real-time (đã có).
- **Party** (roadmap): tối đa 4 người, chia EXP/vật phẩm, vào dungeon riêng.
- **Open PvP**: Khu Hỗn Chiến — giết người chơi khác không bị phạt, rơi 1 món đồ ngẫu nhiên của nạn nhân (roadmap).
- **Guild** (roadmap): chiếm Boss, kho guild, chiến guild weekly.

## 9. Kiến trúc kỹ thuật (đã triển khai)

```
client/                  → render + input, KHÔNG quyết logic
  js/game.js             → game loop fixed-timestep 60Hz, nội suy mạng
  js/renderer.js         → camera follow (lerp), Y-sort, tile prerender
  js/input.js            → joystick ảo (touch) + WASD/Space/E (PC)
  js/net.js              → ws client, gửi input 20Hz, auto-reconnect
  js/sprites.js          → pixel-art vẽ bằng code, 0 asset ngoài
  js/ui.js               → HUD (HP/thể lực/đói), túi đồ, chat
server/ (Node.js + ws)   → AUTHORITATIVE, tick 20Hz
  server.js              → ws server + heartbeat + game loop
  world.js               → world state, AI quái, respawn, boss pattern, PvP
  combat.js              → công thức sát thương, roll phẩm chất
  monsters.js            → định nghĩa quái & boss
shared/protocol.js       → message protocol + hằng số dùng chung
```

- **Netcode**: client gửi `c_input` (seq chống replay) 20Hz; server broadcast `s_snapshot`
  full-state 20Hz + `events` (số damage, loot, telegraph). Client nội suy vị trí (lerp 12/s).
- **Tối ưu roadmap**: snapshot delta + AOI (chỉ gửi entity quanh player), binary protocol (MessagePack).

## 10. Milestones tiếp theo

1. Đánh xa (cung/trượng bắn projectile) + skill chủ động.
2. Party & dungeon riêng.
3. Hệ thống ngày/đêm + thời tiết.
4. Rương đồ + inventory UI đầy đủ, trang bị theo phẩm chất.
5. Deploy: server lên VPS (PM2), client lên static host, WSS.
