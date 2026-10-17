/* ============================================================================
 * renderer.js — Camera bám theo nhân vật + Y-sorting cho đồ hoạ top-down.
 *  - Camera: lerp mượt về player, clamp trong biên thế giới.
 *  - Y-sort: mọi entity/node/building gom vào 1 danh sách, sort theo chân (y),
 *    vẽ từ trên xuống → vật ở dưới (y lớn) đè lên vật ở trên. Chuẩn 2D top-down.
 *  - Ground: tile cỏ prerender 4 biến thể, chọn theo hash → không tốn draw call.
 * ========================================================================== */
(function () {
  'use strict';
  const { CFG } = THS.Shared;
  const TILE = 64;

  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return Math.abs(h ^ (h >> 16));
  }

  class Renderer {
    constructor(canvas) {
      this.cv = canvas;
      this.g = canvas.getContext('2d');
      this.g.imageSmoothingEnabled = false;
      this.cam = { x: CFG.WORLD_W / 2 - CFG.VIEW_W / 2, y: CFG.WORLD_H / 2 - CFG.VIEW_H / 2 };
      this.tiles = this._makeTiles();
      this.effects = []; // {type:'dmg'|'tele'|'die', ...}
      this.time = 0;
      this._dirs = new WeakMap(); // entity -> {x, dir} để flip sprite theo hướng
      this._movs = new WeakMap(); // entity -> {x,y,t} để biết đang di chuyển
    }

    _makeTiles() {
      const variants = [];
      for (let v = 0; v < 4; v++) {
        const c = document.createElement('canvas');
        c.width = c.height = TILE;
        const g = c.getContext('2d');
        g.fillStyle = v % 2 ? '#3f9e4d' : '#46a854';
        g.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 26; i++) { // đốm cỏ
          g.fillStyle = Math.random() < 0.5 ? '#37903f' : '#57b565';
          g.fillRect((Math.random() * TILE) | 0, (Math.random() * TILE) | 0, 2, 3);
        }
        variants.push(c);
      }
      return variants;
    }

    addEffect(e) { this.effects.push(Object.assign({ born: this.time }, e)); }

    /* Chọn sprite để vẽ: ưu tiên Sunny Land (có animation), fallback Sprites vẽ code */
    _resolve(d) {
      const t = this.time;
      const sunnyOn = typeof Sunny !== 'undefined' && Sunny.has(d.key);
      let s, flip = 1;
      if (d.kind === 'player') {
        const anim = this._moving(d.e) ? 'run' : 'idle';
        s = (sunnyOn && Sunny.frame('hero', anim, t)) || Sprites.get('hero');
        flip = this._flip(d.e, typeof Sunny !== 'undefined' && Sunny.faceLeft('hero'));
      } else if (d.kind === 'mob') {
        const anim = (d.key === 'slime') ? (this._moving(d.e) ? 'jump' : 'idle') : 'idle';
        s = (sunnyOn && Sunny.frame(d.key, anim, t)) || Sprites.get(d.key);
        flip = this._flip(d.e, typeof Sunny !== 'undefined' && Sunny.faceLeft(d.key));
      } else if (d.kind === 'node') {
        s = (sunnyOn && Sunny.still(d.key)) || Sprites.get(d.key);
      } else {
        s = Sprites.get(d.key);
      }
      return { s, flip };
    }

    // entity có đang di chuyển không (dựa trên vị trí 0.3s gần nhất)
    _moving(e) {
      let st = this._movs.get(e);
      const now = this.time;
      if (!st) { st = { x: e.x, y: e.y, t: -9 }; this._movs.set(e, st); }
      const dx = e.x - st.x, dy = e.y - st.y;
      if (dx * dx + dy * dy > 9) { st.x = e.x; st.y = e.y; st.t = now; }
      return now - st.t < 0.3;
    }

    // hướng nhìn: 1 = phải, -1 = trái (có đảo nếu sprite gốc nhìn sang trái)
    _flip(e, faceLeft) {
      let st = this._dirs.get(e);
      if (!st) { st = { x: e.x, dir: 1 }; this._dirs.set(e, st); }
      if (e.x > st.x + 2) { st.dir = 1; st.x = e.x; }
      else if (e.x < st.x - 2) { st.dir = -1; st.x = e.x; }
      return (faceLeft ? -st.dir : st.dir) >= 0 ? 1 : -1;
    }

    /* ------------------------------ render chính ------------------------------ */
    render(state, me, dt) {
      const g = this.g;
      this.time += dt;

      // camera bám theo player (lerp mượt)
      if (me) {
        const k = Math.min(1, 7 * dt);
        this.cam.x += (me.x - CFG.VIEW_W / 2 - this.cam.x) * k;
        this.cam.y += (me.y - CFG.VIEW_H / 2 - this.cam.y) * k;
        this.cam.x = Math.max(0, Math.min(CFG.WORLD_W - CFG.VIEW_W, this.cam.x));
        this.cam.y = Math.max(0, Math.min(CFG.WORLD_H - CFG.VIEW_H, this.cam.y));
      }
      const cx = this.cam.x, cy = this.cam.y;

      // nền cỏ
      const x0 = Math.floor(cx / TILE), y0 = Math.floor(cy / TILE);
      const x1 = Math.ceil((cx + CFG.VIEW_W) / TILE), y1 = Math.ceil((cy + CFG.VIEW_H) / TILE);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        g.drawImage(this.tiles[hash2(tx, ty) % 4], tx * TILE - cx, ty * TILE - cy);
      }

      // vòng PvP (đứt nét đỏ)
      if (state.zone) this._drawZone(g, state.zone, cx, cy);

      // telegraph của boss vẽ TRÊN mặt đất, DƯỚI entity
      for (const e of this.effects) if (e.type === 'tele') this._drawTele(g, e, cx, cy);

      /* ---- Y-SORT: gom tất cả drawable, sort theo chân (y), vẽ lần lượt ---- */
      const draws = [];
      for (const n of state.nodes.values()) {
        draws.push({ y: n.y, x: n.x, kind: 'node', e: n, key: Sprites.NODE_SPRITE[n.kind] || 'tree' });
      }
      for (const b of state.buildings) {
        draws.push({ y: b.y, x: b.x, kind: 'bld', e: b, key: Sprites.BUILDING_SPRITE[b.kind] || 'chest' });
      }
      for (const m of state.mobs.values()) {
        draws.push({ y: m.y, x: m.x, kind: 'mob', e: m, key: Sprites.MOB_SPRITE[m.key] || 'slime' });
      }
      for (const p of state.players.values()) {
        draws.push({ y: p.y, x: p.x, kind: 'player', e: p, key: 'hero', isMe: me && p.id === me.id });
      }
      draws.sort((a, b) => a.y - b.y);

      for (const d of draws) {
        const r = this._resolve(d);
        const s = r.s;
        const sx = Math.round(d.x - s.ax - cx), sy = Math.round(d.y - s.ay - cy);
        if (sx > CFG.VIEW_W || sy > CFG.VIEW_H || sx + s.w < 0 || sy + s.h < 0) continue; // culling
        // bóng đổ
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(d.x - cx, d.y - cy, s.w * 0.32, 7, 0, 0, 7);
        g.fill();
        if (r.flip < 0) { // lật ngang quanh trục giữa entity
          g.save();
          g.translate(Math.round(d.x - cx), 0);
          g.scale(-1, 1);
          g.drawImage(s.cv, -s.ax, sy, s.w, s.h);
          g.restore();
        } else {
          g.drawImage(s.cv, sx, sy, s.w, s.h);
        }
        if (d.kind === 'mob') this._hpBar(g, d.e, d.x - cx, d.y - cy - s.h - 8);
        if (d.kind === 'player') {
          if (!d.isMe) this._name(g, d.e.name, d.x - cx, d.y - cy - s.h - 8);
          else if (d.e.hp < d.e.maxHp) this._hpBar(g, d.e, d.x - cx, d.y - cy - s.h - 8, '#4dff6a');
        }
      }

      // damage numbers / hiệu ứng chết
      this.effects = this.effects.filter((e) => this._drawFx(g, e, cx, cy));

      // chữ "BOSS" nhấp nháy trên đầu boss
      for (const m of state.mobs.values()) {
        if (!m.boss) continue;
        g.fillStyle = `rgba(255,60,60,${0.6 + 0.4 * Math.sin(this.time * 6)})`;
        g.font = 'bold 13px monospace'; g.textAlign = 'center';
        g.fillText('☠ BOSS ☠', m.x - cx, m.y - cy - Sprites.get('golem_boss').h - 24);
      }
    }

    _hpBar(g, e, x, y, col) {
      const w = 30, pct = Math.max(0, e.hp / e.maxHp);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x - w / 2, y, w, 5);
      g.fillStyle = col || (pct > 0.5 ? '#4dff6a' : pct > 0.25 ? '#ffcf3d' : '#ff4d4d');
      g.fillRect(x - w / 2 + 1, y + 1, (w - 2) * pct, 3);
    }

    _name(g, name, x, y) {
      g.font = '11px monospace'; g.textAlign = 'center';
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(name, x + 1, y + 1);
      g.fillStyle = '#fff'; g.fillText(name, x, y);
    }

    _drawZone(g, z, cx, cy) {
      const x = z.x - cx, y = z.y - cy;
      if (x + z.r < 0 || y + z.r < 0 || x - z.r > CFG.VIEW_W || y - z.r > CFG.VIEW_H) return;
      g.save();
      g.strokeStyle = 'rgba(255,70,70,0.8)'; g.lineWidth = 3; g.setLineDash([14, 10]);
      g.beginPath(); g.arc(x, y, z.r, 0, 7); g.stroke();
      g.setLineDash([]);
      g.font = 'bold 15px monospace'; g.textAlign = 'center';
      g.fillStyle = 'rgba(255,70,70,0.9)';
      g.fillText('⚔ KHU HỖN CHIẾN (PvP) ⚔', x, y - z.r - 10);
      g.restore();
    }

    _drawTele(g, e, cx, cy) {
      const age = this.time - e.born;
      if (age > e.dur) return;
      const pulse = 0.35 + 0.25 * Math.sin(this.time * 14);
      g.fillStyle = `rgba(255,40,40,${pulse})`;
      g.beginPath(); g.arc(e.x - cx, e.y - cy, e.r, 0, 7); g.fill();
      g.strokeStyle = '#ff2a2a'; g.lineWidth = 2;
      g.beginPath(); g.arc(e.x - cx, e.y - cy, e.r, 0, 7); g.stroke();
      if (e.label) {
        g.font = 'bold 12px monospace'; g.textAlign = 'center';
        g.fillStyle = '#ff6a6a';
        g.fillText(e.label, e.x - cx, e.y - cy - e.r - 6);
      }
    }

    _drawFx(g, e, cx, cy) {
      const age = this.time - e.born;
      if (e.type === 'dmg') {
        if (age > 0.9) return false;
        g.font = `bold ${e.crit ? 17 : 13}px monospace`; g.textAlign = 'center';
        g.fillStyle = e.color || (e.crit ? '#ffd23d' : '#ffffff');
        g.fillText(String(e.val), e.x - cx, e.y - cy - age * 46);
        return true;
      }
      if (e.type === 'die') {
        if (age > 0.6) return false;
        const gs = (typeof Sunny !== 'undefined' && Sunny.has('gem')) ? Sunny.frame('gem', 'idle', age * 2) : null;
        g.globalAlpha = Math.max(0, 1 - age * 1.6);
        if (gs) g.drawImage(gs.cv, e.x - cx - gs.ax, e.y - cy - gs.ay - age * 30, gs.w, gs.h);
        else { g.font = '16px monospace'; g.textAlign = 'center'; g.fillText('💀', e.x - cx, e.y - cy - age * 30); }
        g.globalAlpha = 1;
        return true;
      }
      if (e.type === 'tele') return age <= e.dur + 0.1; // vòng telegraph tự hết
      return false;
    }
  }

  window.Renderer = Renderer;
})();
