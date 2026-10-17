/* ============================================================================
 * sunny.js — Tích hợp asset Sunny Land (Luis Zuno / Ansimuz, CC0) vào game.
 *  - Load PNG spritesheet, cắt frame, expose đúng interface {cv,w,h,ax,ay}
 *    như Sprites để renderer dùng chung không cần sửa logic vẽ.
 *  - frame(name, anim, t): chọn frame animation theo thời gian.
 *  - still(name): sprite tĩnh (cây, đá, bụi...).
 *  - Nếu ảnh load lỗi → has() = false → renderer tự fallback về Sprites vẽ code.
 * ========================================================================== */
(function () {
  'use strict';

  const IMG = 'assets/img/';

  // scale: hệ số phóng (giữ số nguyên để pixel-art nét)
  // faceLeft: sprite gốc nhìn sang trái (Foxy) → đảo logic flip
  const DEFS = {
    hero: {
      scale: 2, faceLeft: true,
      anims: {
        idle: { f: 'foxy-idle.png', fw: 33, fh: 32, n: 4, fps: 6 },
        run:  { f: 'foxy-run.png',  fw: 33, fh: 32, n: 6, fps: 12 },
        jump: { f: 'foxy-jump.png', fw: 33, fh: 32, n: 2, fps: 8 },
        hurt: { f: 'foxy-hurt.png', fw: 33, fh: 32, n: 2, fps: 8 },
      },
    },
    slime: { // frog
      scale: 2, faceLeft: true,
      anims: {
        idle: { f: 'frog-idle.png', fw: 35, fh: 32, n: 4, fps: 6 },
        jump: { f: 'frog-jump.png', fw: 35, fh: 32, n: 3, fps: 10 },
      },
    },
    wolf: { // opossum
      scale: 2, faceLeft: true,
      anims: {
        idle: { f: 'opossum.png', fw: 36, fh: 28, n: 6, fps: 10 },
      },
    },
    goblin: { // eagle
      scale: 2, faceLeft: false,
      anims: {
        idle: { f: 'eagle-attack.png', fw: 40, fh: 41, n: 4, fps: 7 },
      },
    },
    cherry: {
      scale: 2, faceLeft: false,
      anims: { idle: { f: 'cherry.png', fw: 15, fh: 21, n: 7, fps: 10 } },
    },
    gem: {
      scale: 2, faceLeft: false,
      anims: { idle: { f: 'gem.png', fw: 15, fh: 15, n: 5, fps: 10 } },
    },
    tree: { still: 'pine.png',  scale: 1, faceLeft: false },
    rock: { still: 'rock.png',  scale: 2, faceLeft: false },
    herb: { still: 'bush.png',  scale: 1, faceLeft: false },
  };

  const files = {};   // file -> {img, ok}
  const frames = {};  // name -> anim -> [canvas...]
  const stills = {};  // name -> canvas

  function loadFile(f) {
    if (files[f]) return files[f].p;
    const img = new Image();
    const rec = { img, ok: false };
    rec.p = new Promise((resolve) => {
      img.onload = () => { rec.ok = true; resolve(); };
      img.onerror = () => resolve();
      img.src = IMG + f;
    });
    files[f] = rec;
    return rec.p;
  }

  function slice(img, fw, fh, n, scale) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('canvas');
      c.width = fw * scale; c.height = fh * scale;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(img, i * fw, 0, fw, fh, 0, 0, c.width, c.height);
      out.push(c);
    }
    return out;
  }

  function wrap(cv, scale) {
    return {
      cv, w: cv.width, h: cv.height,
      ax: cv.width / 2, ay: cv.height, // neo: giữa-chân (giống Sprites)
    };
  }

  const ready = (async () => {
    const uniq = new Set();
    for (const name of Object.keys(DEFS)) {
      const d = DEFS[name];
      if (d.still) uniq.add(d.still);
      else for (const a of Object.values(d.anims)) uniq.add(a.f);
    }
    await Promise.all([...uniq].map(loadFile));
    // cắt frame sau khi đã load xong
    for (const name of Object.keys(DEFS)) {
      const d = DEFS[name];
      if (d.still) {
        const rec = files[d.still];
        if (rec && rec.ok) {
          const c = document.createElement('canvas');
          c.width = rec.img.width * d.scale; c.height = rec.img.height * d.scale;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.drawImage(rec.img, 0, 0, c.width, c.height);
          stills[name] = c;
        }
      } else {
        frames[name] = {};
        for (const [an, a] of Object.entries(d.anims)) {
          const rec = files[a.f];
          if (rec && rec.ok) frames[name][an] = slice(rec.img, a.fw, a.fh, a.n, d.scale);
        }
      }
    }
  })();

  function has(name) {
    const d = DEFS[name];
    if (!d) return false;
    if (d.still) return !!stills[name];
    return !!(frames[name] && Object.keys(frames[name]).length);
  }

  function frame(name, anim, t) {
    const d = DEFS[name];
    if (!d || d.still || !frames[name]) return null;
    const fr = frames[name][anim] || frames[name][Object.keys(frames[name])[0]];
    if (!fr || !fr.length) return null;
    const a = d.anims[anim] || d.anims[Object.keys(d.anims)[0]];
    const idx = Math.floor(t * a.fps) % fr.length;
    return wrap(fr[idx]);
  }

  function still(name) {
    const d = DEFS[name];
    if (!d || !d.still || !stills[name]) return null;
    return wrap(stills[name]);
  }

  function faceLeft(name) {
    const d = DEFS[name];
    return !!(d && d.faceLeft);
  }

  window.Sunny = { ready, has, frame, still, faceLeft };
})();
