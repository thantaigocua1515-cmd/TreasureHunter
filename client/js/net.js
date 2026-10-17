/* ============================================================================
 * net.js — WebSocket client. Gửi input 20Hz (chỉ khi thay đổi hoặc 200ms),
 * nhận snapshot → game.onNet(). Tự reconnect khi rớt mạng.
 * ========================================================================== */
(function () {
  'use strict';
  const { Msg } = THS.Shared;

  // Hostname công cộng của WebSocket server (điền sau khi tạo tunnel / deploy).
  // Deploy demo 2026-10-15 qua cloudflared quick tunnel.
  const WS_HOST = 'THS_WS_HOST_PLACEHOLDER';

  class Net {
    constructor(game) {
      this.game = game;
      this.ws = null;
      this.connected = false;
      this.seq = 0;
      this.lastSent = '';
      this.lastForce = 0;
    }

    connect() {
      // Thứ tự ưu tiên URL server:
      //  1) ?server=wss://... trên URL (ép cứng, dùng khi test)
      //  2) deploy online (không phải localhost/file:) → wss://WS_HOST
      //  3) local dev → ws://localhost:8080
      const q = new URLSearchParams(location.search);
      let url = q.get('server');
      if (!url) {
        const h = location.hostname;
        const isLocal = !h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:';
        url = isLocal ? `ws://${h || 'localhost'}:8080` : `wss://${WS_HOST}`;
      }
      let ws;
      try { ws = new WebSocket(url); } catch { return this.game.goOffline(); }
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        this.send({ t: Msg.C_HELLO, name: 'Hunter' + Math.floor(Math.random() * 900 + 100) });
        this.game.ui.setOnline(true);
      };
      ws.onmessage = (e) => {
        try { this.game.onNet(JSON.parse(e.data)); } catch { /* bỏ packet lỗi */ }
      };
      ws.onclose = () => {
        this.connected = false;
        this.game.ui.setOnline(false);
        this.game.goOffline();                       // rớt mạng → chơi demo offline
        setTimeout(() => this.connect(), 3000);      // thử nối lại
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
      // nếu 2.5s chưa open được → coi như offline (mở file:// không có server)
      setTimeout(() => { if (!this.connected) this.game.goOffline(); }, 2500);
    }

    send(o) {
      if (this.connected && this.ws.readyState === 1) this.ws.send(JSON.stringify(o));
    }

    /** Gửi input: 20Hz khi đổi, ép gửi mỗi 200ms để giữ nhịp server */
    sendInput(ax, ay, sprint, attack) {
      this.seq++;
      const now = performance.now();
      const payload = { t: Msg.C_INPUT, seq: this.seq, dx: +ax.toFixed(3), dy: +ay.toFixed(3), sprint, attack: !!attack };
      const key = `${payload.dx},${payload.dy},${sprint},${attack}`;
      if (key !== this.lastSent || now - this.lastForce > 200) {
        this.send(payload);
        this.lastSent = key; this.lastForce = now;
      }
    }
  }

  window.Net = Net;
})();
