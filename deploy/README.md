# Deploy Treasure Hunter Survival lên mạng

## Cách 1 — VPS của bạn, full multiplayer (khuyên dùng, ~5 phút)

Trên VPS Ubuntu (quyền root):

```bash
# 1. Copy code lên VPS
scp -r treasure-hunter-survival root@VPS:/root/ths-pkg

# 2. Chạy installer (Node 20 + systemd service)
ssh root@VPS "bash /root/ths-pkg/deploy/install.sh"

# 3. Mở firewall
ssh root@VPS "ufw allow 8080/tcp"
```

Xong! Game server chạy tại `ws://IP-VPS:8080`.

**Cho bạn bè chơi:** gửi họ file `dist/treasure-hunter-survival-demo.html`
mở bằng link có tham số server:

```
file:///…/treasure-hunter-survival-demo.html?server=ws://IP-VPS:8080
```

(hoặc host `client/` bằng nginx theo `deploy/nginx-ths.conf` để có `wss://`.)

## Cách 2 — itch.io, chỉ client (miễn phí, 5 phút, không cần VPS)

1. Vào https://itch.io → tạo tài khoản → **New project** → Kind: **HTML**.
2. Upload file `dist/treasure-hunter-survival-demo.html` (đổi tên thành `index.html`
   trong zip), tick **"This file will be played in the browser"**.
3. Chế độ này chạy **offline demo** (đi/đánh/chặt cây 1 mình).

Muốn multiplayer trên itch.io: vẫn cần Cách 1 cho server, rồi điền
`?server=wss://…` vào URL game.

## Cách 3 — GitHub Pages (miễn phí, cần tài khoản GitHub)

```bash
cd treasure-hunter-survival
git init && git add client shared && git commit -m "ths client"
# push lên repo, bật Settings -> Pages -> deploy từ branch main, folder / (root)
# rồi sửa client/index.html: copy shared/ vào client/shared/ cho cùng gốc
```

Tương tự Cách 2: client tĩnh chạy offline demo; multiplayer cần server ở Cách 1.
