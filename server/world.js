'use strict';
/* ============================================================================
 * world.js — World State + Game Logic (AUTHORITATIVE SERVER)
 *
 *  - Tick 20Hz: di chuyển player theo input, AI quái, hồi sinh, broadcast.
 *  - Mọi sát thương tính ở đây (combat.js) → client chỉ render, không quyết.
 *  - PvP: trong "Vùng Hỗn Chiến" (góc đông-nam bản đồ) player đánh được nhau.
 * ========================================================================== */
const { Msg, CFG, RARITY, RECIPES, BUILDINGS } = require('../shared/protocol');
const { calcDamage, rollRarity } = require('./combat');
const MON_DEFS = require('./monsters');

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

let _id = 1;
const nid = (p) => p + (_id++);

const NODE_DEFS = {
  tree: { name: 'Cây Gỗ',    hp: 3, give: { wood: 2 },          respawn: 20 },
  rock: { name: 'Mỏ Đá',     hp: 4, give: { stone: 2 },         respawn: 25 },
  herb: { name: 'Thảo Dược',  hp: 2, give: { herb: 2, food: 1 }, respawn: 18 },
};

// Vùng PvP tự do (open PvP zone) — tranh Boss / tài nguyên
const PVP_ZONE = { x: CFG.WORLD_W - 600, y: CFG.WORLD_H - 600, r: 380 };

class World {
  constructor() {
    this.players = new Map();   // id -> player
    this.mobs = new Map();      // id -> mob
    this.nodes = new Map();     // id -> resource node
    this.buildings = new Map(); // id -> building
    this.tickN = 0;
    this.delayed = [];          // [{ at: tick, run() }] — hẹn giờ trong tick
    this.events = [];           // events gửi kèm snapshot rồi xoá
  }

  /* ------------------------------ khởi tạo ------------------------------ */
  init() {
    for (let i = 0; i < 60; i++) this.spawnNode('tree');
    for (let i = 0; i < 40; i++) this.spawnNode('rock');
    for (let i = 0; i < 30; i++) this.spawnNode('herb');
    for (let i = 0; i < 25; i++) this.spawnMob('slime');
    for (let i = 0; i < 12; i++) this.spawnMob('wolf');
    for (let i = 0; i < 6; i++) this.spawnMob('goblin');
    // Boss ở trung tâm bản đồ
    this.spawnMob('golem_boss', { x: CFG.WORLD_W / 2, y: CFG.WORLD_H / 2 });
    console.log(`[THS] world ready: ${this.mobs.size} mobs, ${this.nodes.size} nodes`);
  }

  spawnPos(margin = 200) {
    return { x: rand(margin, CFG.WORLD_W - margin), y: rand(margin, CFG.WORLD_H - margin) };
  }

  spawnNode(kind, at) {
    const d = NODE_DEFS[kind], p = at || this.spawnPos();
    const n = { id: nid('n'), kind, x: p.x, y: p.y, hp: d.hp, maxHp: d.hp, alive: true, respawnAt: 0 };
    this.nodes.set(n.id, n);
    return n;
  }

  spawnMob(key, at) {
    const d = MON_DEFS[key], p = at || this.spawnPos();
    const m = {
      id: nid('m'), key, name: d.name, x: p.x, y: p.y, hx: p.x, hy: p.y,
      hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, speed: d.speed,
      aggro: d.aggro, xp: d.xp, gold: d.gold, boss: !!d.boss,
      state: 'idle', tx: p.x, ty: p.y, target: null,
      atkCd: 0, patternT: rand(4, 7), wanderT: rand(1, 4),
      alive: true, respawnAt: 0,
    };
    this.mobs.set(m.id, m);
    return m;
  }

  /* ------------------------------ player ------------------------------ */
  addPlayer(ws) {
    const s = this.spawnPos(400);
    const p = {
      id: nid('p'), ws, name: 'Hunter',
      x: s.x, y: s.y, dir: 1,
      hp: 100, maxHp: 100, atk: 12, def: 4, speed: CFG.PLAYER_SPEED,
      stamina: 100, hunger: 100,
      inv: { wood: 0, stone: 0, herb: 0, food: 3, gold: 0 },
      weapon: { name: 'Tay Không', atk: 0 },
      input: { dx: 0, dy: 0, sprint: false },
      atkCd: 0, dead: false, respawnT: 0, lastSeq: 0,
    };
    this.players.set(p.id, p);
    this.send(p, { t: Msg.S_WELCOME, id: p.id, tick: this.tickN, snap: this.snapshot(), zone: PVP_ZONE });
    this.pushEvent({ type: 'sys', text: `${p.name} đã vào thế giới` });
    return p;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (p) { this.players.delete(id); this.pushEvent({ type: 'sys', text: `${p.name} đã rời đi` }); }
  }

  send(p, obj) {
    if (p.ws.readyState === 1) p.ws.send(JSON.stringify(obj));
  }
  broadcast(obj) {
    const s = JSON.stringify(obj);
    for (const p of this.players.values()) if (p.ws.readyState === 1) p.ws.send(s);
  }
  pushEvent(e) { this.events.push(e); if (this.events.length > 60) this.events.shift(); }

  inPvp(x, y) { return d2(x, y, PVP_ZONE.x, PVP_ZONE.y) < PVP_ZONE.r * PVP_ZONE.r; }

  /* ------------------------------ message ------------------------------ */
  handle(p, msg) {
    switch (msg.t) {
      case Msg.C_HELLO:
        p.name = String(msg.name || 'Hunter').slice(0, 16);
        break;
      case Msg.C_INPUT: {
        if (!msg || typeof msg.seq !== 'number' || msg.seq <= p.lastSeq) break; // chống replay
        p.lastSeq = msg.seq;
        p.input.dx = clamp(+msg.dx || 0, -1, 1);
        p.input.dy = clamp(+msg.dy || 0, -1, 1);
        p.input.sprint = !!msg.sprint;
        if (msg.fx || msg.fy) p.dir = msg.fx < 0 ? -1 : 1;
        if (msg.attack) this.tryAttack(p);
        break;
      }
      case Msg.C_CHAT:
        this.broadcast({ t: Msg.S_CHAT, from: p.name, text: String(msg.text || '').slice(0, 120) });
        break;
      case Msg.C_HARVEST:
        this.tryHarvest(p, msg.nodeId);
        break;
      case Msg.C_CRAFT:
        this.tryCraft(p, msg.recipeId);
        break;
      case Msg.C_BUILD:
        this.tryBuild(p, msg);
        break;
    }
  }

  /* ------------------------------ combat ------------------------------ */
  nearestMob(x, y, range) {
    let best = null, bd = range * range;
    for (const m of this.mobs.values()) {
      if (!m.alive) continue;
      const dd = d2(x, y, m.x, m.y);
      if (dd < bd) { bd = dd; best = m; }
    }
    return best;
  }

  tryAttack(p) {
    if (p.dead || p.atkCd > 0) return;
    p.atkCd = CFG.ATTACK_CD;
    const atk = p.atk + p.weapon.atk;

    // 1) Ưu tiên quái trong tầm
    const m = this.nearestMob(p.x, p.y, CFG.ATTACK_RANGE);
    if (m) { this.damageMob(p, m, atk); return; }

    // 2) PvP trong vùng hỗn chiến
    if (this.inPvp(p.x, p.y)) {
      for (const q of this.players.values()) {
        if (q.id === p.id || q.dead) continue;
        if (d2(p.x, p.y, q.x, q.y) < CFG.ATTACK_RANGE ** 2 && this.inPvp(q.x, q.y)) {
          const { dmg, crit } = calcDamage(atk, q.def);
          q.hp -= dmg;
          this.pushEvent({ type: 'dmg', x: q.x, y: q.y - 20, val: dmg, crit, color: '#ff5a5a' });
          if (q.hp <= 0) this.killPlayer(q, p.name);
          return;
        }
      }
    }

    // 3) Không có quái → chặt/đào node gần nhất
    let best = null, bd = CFG.ATTACK_RANGE ** 2;
    for (const n of this.nodes.values()) {
      if (!n.alive) continue;
      const dd = d2(p.x, p.y, n.x, n.y);
      if (dd < bd) { bd = dd; best = n; }
    }
    if (best) this.hitNode(p, best);
  }

  damageMob(p, m, atk) {
    const { dmg, crit } = calcDamage(atk, m.def);
    m.hp -= dmg;
    m.target = p.id;                       // đánh nó → nó đuổi theo
    if (m.state === 'idle' || m.state === 'wander') m.state = 'chase';
    this.pushEvent({ type: 'dmg', x: m.x, y: m.y - 18, val: dmg, crit });
    if (m.hp <= 0 && m.alive) this.killMob(p, m);
  }

  killMob(p, m) {
    m.alive = false;
    m.respawnAt = this.tickN + (m.boss ? 20 * 120 : 20 * rand(25, 45)); // boss hồi sau 120s
    const gold = m.gold ? Math.round(rand(m.gold[0], m.gold[1])) : 0;
    if (p && gold) p.inv.gold += gold;
    const ri = rollRarity(m.boss ? 3 : 0);
    const rarity = RARITY[ri];
    this.pushEvent({ type: 'die', x: m.x, y: m.y, name: m.name });
    this.pushEvent({
      type: 'loot', to: p ? p.id : null,
      text: `${m.name} rơi ${gold} vàng · [${rarity.name}]`,
      color: rarity.color, boss: m.boss,
    });
    if (m.boss) this.pushEvent({ type: 'sys', text: `⚠ ${p ? p.name : 'Ai đó'} đã hạ ${m.name}! Hồi sinh sau 120s` });
  }

  killPlayer(q, byName) {
    q.dead = true; q.hp = 0; q.respawnT = 3;
    this.pushEvent({ type: 'sys', text: `☠ ${q.name} bị hạ bởi ${byName || 'quái vật'}` });
  }

  /* --------------------------- gathering --------------------------- */
  hitNode(p, n) {
    const d = NODE_DEFS[n.kind];
    n.hp -= 1;
    this.pushEvent({ type: 'dmg', x: n.x, y: n.y - 14, val: 'cốp!', color: '#d8b26a' });
    if (n.hp <= 0 && n.alive) {
      n.alive = false;
      n.respawnAt = this.tickN + 20 * d.respawn;
      for (const [k, v] of Object.entries(d.give)) p.inv[k] = (p.inv[k] || 0) + v;
      const got = Object.entries(d.give).map(([k, v]) => `+${v} ${k}`).join(' ');
      this.pushEvent({ type: 'loot', to: p.id, text: `${d.name}: ${got}`, color: '#9fe08a' });
    }
  }

  tryHarvest(p, nodeId) {
    const n = this.nodes.get(nodeId);
    if (!n || !n.alive || p.dead) return;
    if (d2(p.x, p.y, n.x, n.y) > 95 * 95) return; // quá xa
    this.hitNode(p, n);
  }

  /* --------------------------- crafting --------------------------- */
  tryCraft(p, recipeId) {
    const r = RECIPES.find((x) => x.id === recipeId);
    if (!r || p.dead) return;
    for (const [k, v] of Object.entries(r.cost)) {
      if ((p.inv[k] || 0) < v) { this.send(p, { t: Msg.S_CHAT, from: 'Hệ thống', text: `Thiếu nguyên liệu chế ${r.name}` }); return; }
    }
    for (const [k, v] of Object.entries(r.cost)) p.inv[k] -= v;
    p.weapon = { name: r.name, atk: r.atk };   // classless: đổi vũ khí = đổi lối đánh
    this.pushEvent({ type: 'loot', to: p.id, text: `Đã chế tạo ${r.name} (+${r.atk} công)`, color: '#ffd76a' });
  }

  /* --------------------------- building --------------------------- */
  tryBuild(p, msg) {
    const b = BUILDINGS.find((x) => x.kind === msg.kind);
    if (!b || p.dead) return;
    for (const [k, v] of Object.entries(b.cost)) {
      if ((p.inv[k] || 0) < v) { this.send(p, { t: Msg.S_CHAT, from: 'Hệ thống', text: `Thiếu nguyên liệu đặt ${b.name}` }); return; }
    }
    for (const [k, v] of Object.entries(b.cost)) p.inv[k] -= v;
    const bd = { id: nid('b'), kind: b.kind, x: clamp(+msg.x || p.x, 0, CFG.WORLD_W), y: clamp(+msg.y || p.y, 0, CFG.WORLD_H), owner: p.id };
    this.buildings.set(bd.id, bd);
    this.pushEvent({ type: 'loot', to: p.id, text: `Đã đặt ${b.name}`, color: '#9fd0ff' });
  }

  /* --------------------------- boss patterns --------------------------- */
  doBossPattern(m) {
    const def = MON_DEFS[m.key];
    const pattern = def.patterns[Math.floor(Math.random() * def.patterns.length)];
    if (pattern === 'slam') {
      // Dậm đất: telegraph vòng tròn 1s rồi nổ AoE
      this.pushEvent({ type: 'tele', x: m.x, y: m.y, r: 150, dur: 1.0, label: m.name + ': Dậm Đất!' });
      this.delayed.push({ at: this.tickN + 20, run: () => this.aoeDamage(m.x, m.y, 150, m.atk * 1.6, m.name) });
    } else if (pattern === 'rockfall') {
      for (let i = 0; i < 5; i++) {
        const x = m.x + rand(-220, 220), y = m.y + rand(-220, 220);
        this.pushEvent({ type: 'tele', x, y, r: 70, dur: 1.2, label: 'Đá Rơi!' });
        this.delayed.push({ at: this.tickN + 24, run: () => this.aoeDamage(x, y, 70, m.atk * 1.1, m.name) });
      }
    } else if (pattern === 'summon') {
      this.pushEvent({ type: 'sys', text: `⚠ ${m.name} triệu hồi Slime!` });
      for (let i = 0; i < 2; i++) this.spawnMob('slime', { x: m.x + rand(-80, 80), y: m.y + rand(-80, 80) });
    }
  }

  aoeDamage(x, y, r, atk, srcName) {
    for (const p of this.players.values()) {
      if (p.dead || d2(p.x, p.y, x, y) > r * r) continue;
      const { dmg, crit } = calcDamage(atk, p.def);
      p.hp -= dmg;
      this.pushEvent({ type: 'dmg', x: p.x, y: p.y - 20, val: dmg, crit, color: '#ff8a3d' });
      if (p.hp <= 0) this.killPlayer(p, srcName);
    }
  }

  /* ------------------------------ tick ------------------------------ */
  tick(dt) {
    this.tickN++;

    // hẹn giờ (boss telegraph...)
    this.delayed = this.delayed.filter((d) => { if (d.at <= this.tickN) { d.run(); return false; } return true; });

    // --- players ---
    for (const p of this.players.values()) {
      if (p.dead) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) { // hồi sinh ở điểm spawn
          p.dead = false; p.hp = p.maxHp; p.stamina = 60; p.hunger = Math.max(p.hunger, 30);
          const s = this.spawnPos(400); p.x = s.x; p.y = s.y;
          this.pushEvent({ type: 'sys', text: `${p.name} đã hồi sinh` });
        }
        continue;
      }
      const ix = p.input.dx, iy = p.input.dy;
      const moving = ix !== 0 || iy !== 0;
      const sprinting = moving && p.input.sprint && p.stamina > 1;
      const sp = p.speed * (sprinting ? CFG.SPRINT_MULT : 1);
      if (moving) {
        const l = Math.hypot(ix, iy) || 1;
        p.x = clamp(p.x + (ix / l) * sp * dt, 0, CFG.WORLD_W);
        p.y = clamp(p.y + (iy / l) * sp * dt, 0, CFG.WORLD_H);
        p.dir = ix < 0 ? -1 : ix > 0 ? 1 : p.dir;
      }
      // sinh tồn: thể lực + đói
      p.stamina = clamp(p.stamina + (sprinting ? -14 : 9) * dt, 0, 100);
      p.hunger = clamp(p.hunger - 0.35 * dt, 0, 100);       // ~5 phút từ no → đói
      if (p.hunger <= 0) p.hp -= 2 * dt;                     // đói: mất máu dần
      else if (p.hunger > 30 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 1.5 * dt);
      if (p.hp <= 0) this.killPlayer(p, 'cái đói');
      p.atkCd = Math.max(0, p.atkCd - dt);
    }

    // --- mobs AI ---
    for (const m of this.mobs.values()) {
      if (!m.alive) {
        if (m.respawnAt && this.tickN >= m.respawnAt) { // hồi sinh quái
          const keepBoss = m.boss;
          this.mobs.delete(m.id);
          this.spawnMob(keepBoss ? 'golem_boss' : m.key, { x: m.hx, y: m.hy });
        }
        continue;
      }
      m.atkCd = Math.max(0, m.atkCd - dt);

      // tìm mục tiêu: player gần nhất còn sống trong tầm aggro
      let tgt = null, bd = m.aggro * m.aggro;
      for (const p of this.players.values()) {
        if (p.dead) continue;
        const dd = d2(m.x, m.y, p.x, p.y);
        if (dd < bd) { bd = dd; tgt = p; }
      }
      m.target = tgt ? tgt.id : null;

      // boss: xoay skill pattern
      if (m.boss && tgt) {
        m.patternT -= dt;
        if (m.patternT <= 0) { this.doBossPattern(m); m.patternT = rand(5, 8); }
      }

      const step = (tx, ty, mult = 1) => {
        const dx = tx - m.x, dy = ty - m.y, l = Math.hypot(dx, dy);
        if (l > 4) { m.x += (dx / l) * m.speed * mult * dt; m.y += (dy / l) * m.speed * mult * dt; }
        return l;
      };

      if (tgt) {
        const homeD2 = d2(m.x, m.y, m.hx, m.hy);
        if (homeD2 > 600 * 600) { // đi quá xa hang ổ → quay về, hồi máu
          m.state = 'return'; m.target = null;
        } else {
          m.state = 'chase';
          const l = step(tgt.x, tgt.y);
          if (l < 42 && m.atkCd <= 0) { // đánh cận chiến
            m.atkCd = 1.2;
            const { dmg, crit } = calcDamage(m.atk, tgt.def);
            tgt.hp -= dmg;
            this.pushEvent({ type: 'dmg', x: tgt.x, y: tgt.y - 20, val: dmg, crit, color: '#ff5a5a' });
            if (tgt.hp <= 0) this.killPlayer(tgt, m.name);
          }
        }
      } else if (m.state === 'return') {
        if (step(m.hx, m.hy) < 10) { m.state = 'idle'; m.hp = m.maxHp; }
      } else {
        // lang thang quanh hang ổ
        m.wanderT -= dt;
        if (m.wanderT <= 0) {
          m.wanderT = rand(2, 5);
          m.tx = m.hx + rand(-120, 120); m.ty = m.hy + rand(-120, 120);
          m.state = 'wander';
        }
        if (m.state === 'wander' && step(m.tx, m.ty) < 8) m.state = 'idle';
      }
    }

    // --- nodes hồi sinh ---
    for (const n of this.nodes.values()) {
      if (!n.alive && this.tickN >= n.respawnAt) {
        n.alive = true; n.hp = n.maxHp = NODE_DEFS[n.kind].hp;
      }
    }

    // --- broadcast snapshot 20Hz ---
    const snap = this.snapshot();
    snap.t = Msg.S_SNAPSHOT;
    snap.tick = this.tickN;
    snap.events = this.events.splice(0);
    this.broadcast(snap);
  }

  snapshot() {
    return {
      players: [...this.players.values()].map((p) => ({
        id: p.id, name: p.name, x: Math.round(p.x), y: Math.round(p.y),
        hp: Math.ceil(p.hp), maxHp: p.maxHp, dir: p.dir, dead: p.dead,
        stamina: Math.round(p.stamina), hunger: Math.round(p.hunger),
        weapon: p.weapon.name, inv: p.inv,
      })),
      mobs: [...this.mobs.values()].filter((m) => m.alive).map((m) => ({
        id: m.id, key: m.key, x: Math.round(m.x), y: Math.round(m.y),
        hp: Math.ceil(m.hp), maxHp: m.maxHp, boss: m.boss,
      })),
      nodes: [...this.nodes.values()].filter((n) => n.alive).map((n) => ({
        id: n.id, kind: n.kind, x: Math.round(n.x), y: Math.round(n.y),
      })),
      buildings: [...this.buildings.values()].map((b) => ({ id: b.id, kind: b.kind, x: b.x, y: b.y })),
    };
  }
}

module.exports = World;
