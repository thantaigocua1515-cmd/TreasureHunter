/* ============================================================================
 * sprites.js — Pixel-art vẽ bằng code (không cần file asset).
 * Mỗi sprite là một "bản đồ ký tự": mỗi ký tự → 1 màu trong palette.
 * Vẽ với imageSmoothingEnabled=false để giữ chất pixel-art khi phóng to.
 * ========================================================================== */
(function () {
  'use strict';

  const SCALE = 3; // 1 "pixel" art = 3px trên màn hình

  function make(rows, palette) {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (!col) continue;               // '.' hoặc ký tự lạ = trong suốt
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  const DEFS = {
    /* ------------------------------ nhân vật ------------------------------ */
    hero: {
      pal: { h: '#7a4a21', s: '#f2c89b', e: '#1c1c1c', a: '#3f6fd1', d: '#2c4f9e', p: '#33415c', b: '#5b3a1e' },
      rows: [
        '................',
        '.....hhhhhh.....',
        '....hhhhhhhh....',
        '....hssssssh....',
        '....hsessesh....',
        '....hssssssh....',
        '.....ssssss.....',
        '......ssss......',
        '....aaaaaaaa....',
        '...aaaaaaaaaa...',
        '...adaaaaaada...',
        '...aaaaaaaaaa...',
        '....pppppppp....',
        '....ppp..ppp....',
        '....bbb..bbb....',
        '................',
      ],
    },
    /* ------------------------------ quái ------------------------------ */
    slime: {
      pal: { g: '#58d68d', d: '#3aa76d', w: '#ffffff', b: '#123322' },
      rows: [
        '....gggggg....',
        '..gggggggggg..',
        '.gggggggggggg.',
        '.gwwggggggwwg.',
        '.gwbggggggwbg.',
        'gggggggggggggg',
        'gggggggggggggg',
        '.gggggggggggg.',
        '..dddddddddd..',
      ],
    },
    wolf: {
      pal: { f: '#8a8f98', d: '#5b6068', e: '#e33d3d', t: '#ffffff' },
      rows: [
        '................',
        '..ff........ff..',
        '..ffffffffffff..',
        '..ffeffffffeff..',
        '..ffffffffffff..',
        '...ffftttffff...',
        '...ffffffffff...',
        '...ffffffffff...',
        '....ffffffff....',
        '....ff.ff.ff....',
        '....dd.dd.dd....',
        '................',
      ],
    },
    goblin: {
      pal: { g: '#7bc96f', e: '#ff3b3b', c: '#7a4a8c', w: '#ffffff' },
      rows: [
        '.....gggg.....',
        '....gggggg....',
        '....geggeg....',
        '....gggggg....',
        '.....gwwg.....',
        '......gg......',
        '....cccccc....',
        '...cccccccc...',
        '...cgccccgc...',
        '...cccccccc...',
        '....cccccc....',
        '....cc..cc....',
        '....cc..cc....',
      ],
    },
    golem_boss: {
      pal: { r: '#8d8d99', d: '#5f5f6b', e: '#ffb43f', l: '#ff6a2a' },
      rows: [
        '........rrrr........',
        '......rrrrrrrr......',
        '.....rrrrrrrrrr.....',
        '.....reerrrreer.....',
        '.....rrrrrrrrrr.....',
        '......rrrrrrrr......',
        '...rrrrrrrrrrrrrr...',
        '..rrrrrddrrrrrrrrr..',
        '..rrrrrrrrrrrrrrrr..',
        '..rrrdrrrrrrdrrrrr..',
        '.rrrrdrrrrrrdrrrrr.',
        '.rrrrrrrrllrrrrrr.',
        '.rrrrrrlllllrrrrr.',
        '..rrrrrlllllrrrr..',
        '..rrrrrdlldrrrrr..',
        '...rrrrrddrrrr...',
        '...rrr..rr..rr...',
        '...ddd..dd..dd...',
      ],
    },
    /* ------------------------------ tài nguyên / đồ đạc ------------------------------ */
    tree: {
      pal: { g: '#2f9e44', d: '#237032', t: '#7a4a21', k: '#5b3a1e' },
      rows: [
        '......gggggg......',
        '....gggggggggg....',
        '...gggggggggggg...',
        '..ggdgggggggdgg...',
        '..ggggggggggggg...',
        '.gggggdgggggdggg..',
        '.gggggggggggggg...',
        '..gggggggggggg....',
        '...gggggggggg.....',
        '....gggggggg......',
        '......gggg........',
        '.......tt.........',
        '.......tt.........',
        '......tttt........',
        '......tttt........',
        '.....kkkkkk.......',
      ],
    },
    rock: {
      pal: { g: '#9aa0a8', d: '#6e747c', l: '#c9ced4' },
      rows: [
        '....gggggg....',
        '..ggglggggg...',
        '.ggggggggggg..',
        '.gglggggdggg..',
        'ggggggggggggg.',
        'gggggdggggggg.',
        '.ggggggggggg..',
        '..ddddddddd...',
      ],
    },
    herb: {
      pal: { g: '#51cf66', d: '#2f9e44', f: '#ff8ab3' },
      rows: [
        '....ff....',
        '...ffff...',
        '....gg....',
        '..ggdgg...',
        '.gggdg....',
        '.ggdggg...',
        '..gggg....',
        '...gg.....',
      ],
    },
    chest: {
      pal: { w: '#a06a2c', d: '#7a4f1f', g: '#ffd76a', k: '#3a3a3a' },
      rows: [
        '..wwwwwwwwww..',
        '.wwwwwwwwwwww.',
        '.wwddddddddww.',
        '.wwwwwwwwwwww.',
        'wwwwwwwwwwwwww',
        'wwddwwggwwddww',
        'wwddwwggwwddww',
        'wwwwwwwwwwwwww',
        '.wwwwwwwwwwww.',
        '..kkkkkkkkkk..',
      ],
    },
    tent: {
      pal: { c: '#d9a441', d: '#a5762a', k: '#5b3a1e' },
      rows: [
        '.........cc.........',
        '........cccc........',
        '.......cccccc.......',
        '......cccccccc......',
        '.....ccccdccccc.....',
        '....cccccdcccccc....',
        '...cccccccdcccccc...',
        '...kkkkkkkkkkkkkk...',
        '...kcccccccccccck...',
        '...kccckkkkkccck....',
        '...kccck...kccck....',
        '...kccck...kccck....',
      ],
    },
    workbench: {
      pal: { w: '#a06a2c', d: '#7a4f1f', k: '#3a3a3a', m: '#9aa0a8' },
      rows: [
        '.mmmm......mmmm...',
        '.mmmm......mmmm...',
        '..wwwwwwwwwwwwww..',
        '..wddddddddddddw..',
        '..wwwwwwwwwwwwww..',
        '...ww..ww..ww.....',
        '...ww..ww..ww.....',
        '...kk..kk..kk.....',
      ],
    },
    wall: {
      pal: { w: '#a06a2c', d: '#7a4f1f' },
      rows: [
        '.ww.ww.ww.ww.ww..',
        'wwwwwwwwwwwwwwww..',
        '.ww.ww.ww.ww.ww..',
        'wwwwwwwwwwwwwwww..',
        '.ww.ww.ww.ww.ww..',
        'wwwwwwwwwwwwwwww..',
      ],
    },
  };

  const cache = {};
  function get(name) {
    if (!cache[name]) {
      const def = DEFS[name] || DEFS.slime;
      const cv = make(def.rows, def.pal);
      cache[name] = {
        cv, w: cv.width * SCALE, h: cv.height * SCALE,
        ax: (cv.width * SCALE) / 2, ay: cv.height * SCALE, // neo: giữa-chân
      };
    }
    return cache[name];
  }

  // ánh xạ key quái server -> sprite
  const MOB_SPRITE = { slime: 'slime', wolf: 'wolf', goblin: 'goblin', golem_boss: 'golem_boss' };
  const NODE_SPRITE = { tree: 'tree', rock: 'rock', herb: 'herb' };
  const BUILDING_SPRITE = { tent: 'tent', workbench: 'workbench', chest: 'chest', wall: 'wall' };

  window.Sprites = { get, SCALE, MOB_SPRITE, NODE_SPRITE, BUILDING_SPRITE };
})();
