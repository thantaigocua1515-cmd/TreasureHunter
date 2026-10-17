/* ============================================================================
 * input.js — Điều khiển: WASD/mũi tên + Space (PC), joystick ảo + nút (mobile)
 * Joystick động: chạm nửa trái màn hình → gốc joystick hiện tại điểm chạm.
 * ========================================================================== */
(function () {
  'use strict';

  class Input {
    constructor() {
      this.keys = {};
      this.joy = { active: false, id: null, dx: 0, dy: 0 };
      this.attackQueued = false;
      this.interactQueued = false;
      this._bindKeys();
      this._bindTouch();
    }

    _bindKeys() {
      addEventListener('keydown', (e) => {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        this.keys[e.code] = true;
        if (e.code === 'Space') { this.attackQueued = true; e.preventDefault(); }
        if (e.code === 'KeyE') this.interactQueued = true;
      });
      addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    _bindTouch() {
      const zone = document.getElementById('joy-zone');
      const base = document.getElementById('joy-base');
      const knob = document.getElementById('joy-knob');
      const R = 52; // bán kính joystick (px CSS)

      const setKnob = (dx, dy) => {
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      };

      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.joy.active) return;
        const t = e.changedTouches[0];
        this.joy.active = true; this.joy.id = t.identifier;
        base.style.display = 'block';
        base.style.left = t.clientX + 'px';
        base.style.top = t.clientY + 'px';
        this.joy.bx = t.clientX; this.joy.by = t.clientY;
        this.joy.dx = 0; this.joy.dy = 0; setKnob(0, 0);
      }, { passive: false });

      const move = (e) => {
        for (const t of e.changedTouches) {
          if (!this.joy.active || t.identifier !== this.joy.id) continue;
          e.preventDefault();
          let dx = t.clientX - this.joy.bx, dy = t.clientY - this.joy.by;
          const l = Math.hypot(dx, dy);
          if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
          this.joy.dx = dx / R; this.joy.dy = dy / R;
          setKnob(dx, dy);
        }
      };
      const end = (e) => {
        for (const t of e.changedTouches) {
          if (!this.joy.active || t.identifier !== this.joy.id) continue;
          this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0;
          base.style.display = 'none'; setKnob(0, 0);
        }
      };
      zone.addEventListener('touchmove', move, { passive: false });
      zone.addEventListener('touchend', end);
      zone.addEventListener('touchcancel', end);

      const btnAtk = document.getElementById('btn-atk');
      const btnUse = document.getElementById('btn-use');
      btnAtk.addEventListener('touchstart', (e) => { e.preventDefault(); this.attackQueued = true; }, { passive: false });
      btnUse.addEventListener('touchstart', (e) => { e.preventDefault(); this.interactQueued = true; }, { passive: false });
      btnAtk.addEventListener('mousedown', () => { this.attackQueued = true; });
      btnUse.addEventListener('mousedown', () => { this.interactQueued = true; });
    }

    /** vector di chuyển đã chuẩn hoá (-1..1) */
    axis() {
      let x = 0, y = 0;
      const k = this.keys;
      if (k.KeyA || k.ArrowLeft) x -= 1;
      if (k.KeyD || k.ArrowRight) x += 1;
      if (k.KeyW || k.ArrowUp) y -= 1;
      if (k.KeyS || k.ArrowDown) y += 1;
      if (this.joy.active) { x = this.joy.dx; y = this.joy.dy; }
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    }

    consumeAttack() { const a = this.attackQueued; this.attackQueued = false; return a; }
    consumeInteract() { const a = this.interactQueued; this.interactQueued = false; return a; }
  }

  window.Input = Input;
})();
