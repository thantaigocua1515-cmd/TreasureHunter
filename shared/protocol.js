/* ============================================================================
 * Treasure Hunter Survival — Shared Protocol & Constants
 * File dùng chung cho cả client (browser) và server (Node.js).
 *  - Browser: <script src="../shared/protocol.js"> → dùng THS.Shared
 *  - Node:    const { Msg, CFG } = require('../shared/protocol')
 * ========================================================================== */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.THS = root.THS || {};
    root.THS.Shared = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Message types: client -> server (c_*) và server -> client (s_*) ----
  const Msg = {
    C_HELLO:    'c_hello',     // -> { name }            chào server, xin slot
    S_WELCOME:  's_welcome',    // <- { id, tick, snap, zone } cấp id + snapshot đầu
    C_INPUT:    'c_input',      // -> { seq, dx, dy, sprint, attack, fx, fy }
    S_SNAPSHOT: 's_snapshot',   // <- { tick, players, mobs, nodes, buildings, events }
    C_CHAT:     'c_chat',       // -> { text }
    S_CHAT:     's_chat',       // <- { from, text }
    C_HARVEST:  'c_harvest',    // -> { nodeId }  tương tác: chặt / đào / hái
    C_CRAFT:    'c_craft',      // -> { recipeId }
    C_BUILD:    'c_build',      // -> { kind, x, y } đặt lều / bàn chế tạo / rương / tường
  };

  // ---- Cấu hình thế giới ----
  const CFG = {
    TICK: 1 / 20,              // server tick 20Hz
    WORLD_W: 3200,
    WORLD_H: 3200,
    PLAYER_SPEED: 175,         // px/s
    SPRINT_MULT: 1.5,
    ATTACK_RANGE: 90,
    ATTACK_CD: 0.45,           // giây giữa 2 đòn
    VIEW_W: 960,               // độ phân giải logic của client
    VIEW_H: 640,
  };

  // ---- Phẩm chất trang bị: Thường -> Tinh Lệ -> Sử Thi -> Huyền Thoại ----
  const RARITY = [
    { key: 'common',    name: 'Thường',      color: '#c9c9c9', mult: 1.0 },
    { key: 'fine',      name: 'Tinh Lệ',     color: '#3fa7ff', mult: 1.25 },
    { key: 'epic',      name: 'Sử Thi',      color: '#b44dff', mult: 1.6 },
    { key: 'legendary', name: 'Huyền Thoại',  color: '#ffb43f', mult: 2.1 },
  ];

  // ---- Công thức chế tạo (đủ chạy prototype) ----
  const RECIPES = [
    { id: 'sword_wood',  name: 'Kiếm Gỗ',   cost: { wood: 8 },            atk: 6  },
    { id: 'sword_iron',  name: 'Kiếm Sắt',   cost: { wood: 6, stone: 10 }, atk: 14 },
    { id: 'bow_wood',    name: 'Cung Gỗ',    cost: { wood: 12 },           atk: 10 },
    { id: 'staff_herb',  name: 'Trượng Thảo Dược', cost: { wood: 6, herb: 8 }, atk: 12 },
  ];

  // ---- Công trình xây dựng ----
  const BUILDINGS = [
    { kind: 'tent',      name: 'Lều',        cost: { wood: 10 } },
    { kind: 'workbench', name: 'Bàn Chế Tạo', cost: { wood: 12, stone: 4 } },
    { kind: 'chest',     name: 'Rương',       cost: { wood: 8 } },
    { kind: 'wall',      name: 'Tường Gỗ',    cost: { wood: 4 } },
  ];

  return { Msg, CFG, RARITY, RECIPES, BUILDINGS };
});
