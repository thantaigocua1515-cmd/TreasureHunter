/* ============================================================================
 * game.js — Game (client): vòng lặp fixed-timestep, nội suy mạng, demo offline.
 *  - update() chạy đúng 60 bước/giây (accumulator) → vật lý ổn định mọi máy.
 *  - Online: server authoritative; client nội suy vị trí entity cho mượt.
 *  - Offline (không có server): Demo chạy local để test gameplay ngay.
 * ========================================================================== */
(function () {
  'use strict';
  const { Msg, CFG } = THS.Shared;
  const STEP = 1 / 60;

  class Game {
    constructor(canvas) {
      this.renderer = new Renderer(canvas);
      this.input = new Input();
      this.ui = new UI();
      this.net = new Net(this);
      window.__game = this;

      this.meId = null;
      this.online = false;
      this.zone = null;
      this.players = new Map();   // id -> {.., x,y (render), tx,ty (đích)}
      this.mobs = new Map();
      this.nodes = new Map();
      this.buildings = [];
      this.demo = null;

      this.last = 0; this.acc = 0;
      this.facing = { x: 1, y: 0 };
      this.loop = this.loop.bind(this);
    }

    boot() {
      this.ui.setOnline(false);
      this.net.connect();           // không có server → goOffline() → demo
      requestAnimationFrame(this.loop);
    }

    goOffline() {
      if (this.online || this.demo) return;
      this.online = false;
      this.demo = new Demo(this);
      this.ui.feedMsg('Chế độ OFFLINE DEMO — bật server để chơi multiplayer', '#ffd76a');
    }

    /* ------------------------------ network in ------------------------------ */
    onNet(msg) {
      switch (msg.t) {
        case Msg.S_WELCOME:
          this.online = true; this.demo = null;
          this.meId = msg.id; this.zone = msg.zone || null;
          this.applySnapshot(msg.snap);
          break;
        case Msg.S_SNAPSHOT:
          this.applySnapshot(msg);
          for (const e of msg.events || []) this.applyEvent(e);
          break;
        case Msg.S_CHAT:
          this.ui.addChat(msg.from, msg.text);
          break;
      }
    }

    applySnapshot(s) {
      this._syncMap(this.players, s.players);
      this._syncMap(this.mobs, s.mobs);
      this._syncMap(this.nodes, s.nodes);
      this.buildings = s.buildings || [];
    }

    _syncMap(map, arr) {
      const seen = new Set();
      for (const e of arr || []) {
        seen.add(e.id);
        let o = map.get(e.id);
        if (!o) { o = Object.assign({ x: e.x, y: e.y }, e); map.set(e.id, o); }
        else { o.tx = e.x; o.ty = e.y; Object.assign(o, e); o.x = o.x ?? e.x; o.y = o.y ?? e.y; }
        if (o.tx === undefined) { o.tx = e.x; o.ty = e.y; }
      }
      for (const id of [...map.keys()]) if (!seen.has(id)) map.delete(id);
    }

    applyEvent(e) {
      if (e.type === 'dmg' || e.type === 'tele' || e.type === 'die') this.renderer.addEffect(e);
      else if (e.type === 'loot' && (!e.to || e.to === this.meId)) this.ui.feedMsg(e.text, e.color);
      else if (e.type === 'sys') this.ui.feedMsg(e.text, '#9fd0ff');
    }

    me() { return this.players.get(this.meId); }

    /* ------------------------------ game loop ------------------------------ */
    loop(t) {
      requestAnimationFrame(this.loop);
      if (!this.last) this.last = t;
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.25) dt = 0.25;      // tab ẩn lâu → không "nhảy cóc"

      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) { this.update(STEP); this.acc -= STEP; n++; }

      const me = this.online ? this.me() : (this.demo && this.demo.player);
      this.renderer.render(
        { players: this.players, mobs: this.mobs, nodes: this.nodes, buildings: this.buildings, zone: this.zone },
        me, dt
      );
      this.ui.updateHUD(me);
    }

    update(dt) {
      const ax = this.input.axis();
      if (ax.x || ax.y) { const l = Math.hypot(ax.x, ax.y); this.facing = { x: ax.x / l, y: ax.y / l }; }
      const attack = this.input.consumeAttack();
      const interact = this.input.consumeInteract();

      if (this.online) {
        const sprint = !!(this.input.keys.ShiftLeft || this.input.keys.ShiftRight);
        this.net.sendInput(ax.x, ax.y, sprint, attack);
        if (interact) { // E: thu hoạch node gần nhất
          const me = this.me();
          if (me) {
            let best = null, bd = 95 * 95;
            for (const nd of this.nodes.values()) {
              const d = (nd.x - me.x) ** 2 + (nd.y - me.y) ** 2;
              if (d < bd) { bd = d; best = nd; }
            }
            if (best) this.net.send({ t: Msg.C_HARVEST, nodeId: best.id });
          }
        }
        // nội suy mọi entity về vị trí server
        const k = Math.min(1, 12 * dt);
        for (const map of [this.players, this.mobs]) {
          for (const e of map.values()) {
            if (e.tx !== undefined) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
          }
        }
      } else if (this.demo) {
        this.demo.update(dt, ax, attack, interact);
      }
    }
  }

  /* ==========================================================================
   * Demo — mô phỏng local tối giản khi không có server (để test ngay).
   * ========================================================================== */
  class Demo {
    constructor(game) {
      this.game = game;
      const cx = CFG.WORLD_W / 2, cy = CFG.WORLD_H / 2;
      this.player = {
        id: 'me', name: 'Bạn', x: cx, y: cy, hp: 100, maxHp: 100,
        stamina: 100, hunger: 100, dir: 1, dead: false,
        inv: { wood: 0, stone: 0, herb: 0, food: 3, gold: 0 }, weapon: 'Tay Không',
      };
      game.players.set('me', this.player);
      game.meId = 'me';
      const R = (a, b) => a + Math.random() * (b - a);
      const kinds = ['slime', 'slime', 'slime', 'wolf', 'slime', 'goblin'];
      kinds.forEach((key, i) => {
        const id = 'd' + i;
        game.mobs.set(id, {
          id, key, x: cx + R(-400, 400), y: cy + R(-400, 400),
          hx: cx, hy: cy, hp: 40, maxHp: 40, tx: cx, ty: cy, wt: R(1, 3), atkCd: 0,
        });
      });
      ['tree', 'tree', 'rock', 'herb', 'tree', 'rock'].forEach((kind, i) => {
        const id = 'n' + i;
        game.nodes.set(id, { id, kind, x: cx + R(-500, 500), y: cy + R(-300, 300), hp: 3 });
      });
    }

    dmg(atk, def) {
      const mit = def / (def + 120);
      return Math.max(1, Math.round(atk * (1 - mit) * (0.9 + Math.random() * 0.2)));
    }

    update(dt, ax, attack) {
      const g = this.game, p = this.player;
      const sp = 175;
      p.x += ax.x * sp * dt; p.y += ax.y * sp * dt;
      p.hunger = Math.max(0, p.hunger - 0.35 * dt);
      p.stamina = Math.min(100, p.stamina + 9 * dt);
      if (p.hunger > 30 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 1.5 * dt);

      if (attack) {
        let best = null, bd = 90 * 90, isNode = false;
        for (const m of g.mobs.values()) {
          const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
          if (d < bd) { bd = d; best = m; isNode = false; }
        }
        if (!best) for (const n of g.nodes.values()) {
          const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
          if (d < bd) { bd = d; best = n; isNode = true; }
        }
        if (best && !isNode) {
          const v = this.dmg(12, 2);
          best.hp -= v;
          g.renderer.addEffect({ type: 'dmg', x: best.x, y: best.y - 18, val: v });
          if (best.hp <= 0) {
            g.renderer.addEffect({ type: 'die', x: best.x, y: best.y });
            g.mobs.delete(best.id);
            p.inv.gold += 3;
            g.ui.feedMsg('+3 vàng', '#ffd76a');
          }
        } else if (best) {
          best.hp -= 1;
          if (best.hp <= 0) {
            g.nodes.delete(best.id);
            const give = best.kind === 'tree' ? { wood: 2 } : best.kind === 'rock' ? { stone: 2 } : { herb: 2 };
            Object.assign(p.inv, Object.fromEntries(Object.entries(give).map(([k, v]) => [k, (p.inv[k] || 0) + v])));
            g.ui.feedMsg(`+${Object.values(give)[0]} ${Object.keys(give)[0]}`, '#9fe08a');
          }
        }
      }

      // AI đơn giản: lang thang, đuổi khi gần
      for (const m of g.mobs.values()) {
        const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
        if (d < 170 && d > 30) { m.x += (dx / d) * 55 * dt; m.y += (dy / d) * 55 * dt; }
        else if (d >= 170) {
          m.wt -= dt;
          if (m.wt <= 0) { m.wt = 2 + Math.random() * 3; m.tx = m.hx + (Math.random() - 0.5) * 240; m.ty = m.hy + (Math.random() - 0.5) * 240; }
          const wx = m.tx - m.x, wy = m.ty - m.y, wl = Math.hypot(wx, wy);
          if (wl > 6) { m.x += (wx / wl) * 40 * dt; m.y += (wy / wl) * 40 * dt; }
        } else if (d <= 30) {
          m.atkCd -= dt;
          if (m.atkCd <= 0) {
            m.atkCd = 1.2;
            const v = this.dmg(6, 4);
            p.hp -= v;
            g.renderer.addEffect({ type: 'dmg', x: p.x, y: p.y - 20, val: v, color: '#ff5a5a' });
            if (p.hp <= 0) { p.hp = 100; p.x = CFG.WORLD_W / 2; p.y = CFG.WORLD_H / 2; g.ui.feedMsg('Bạn đã hồi sinh!', '#9fd0ff'); }
          }
        }
      }
    }
  }

  window.Game = Game;
})();
