'use strict';
/* ============================================================================
 * monsters.js — Định nghĩa quái & Boss.
 * Boss có `patterns`: các skill pattern riêng, server telegraph trước khi nổ.
 * ========================================================================== */
module.exports = {
  slime: {
    name: 'Slime', hp: 40, atk: 6, def: 2, speed: 55,
    aggro: 170, xp: 8, gold: [1, 4],
  },
  wolf: {
    name: 'Sói Hoang', hp: 70, atk: 11, def: 4, speed: 125,
    aggro: 250, xp: 15, gold: [3, 8],
  },
  goblin: {
    name: 'Goblin', hp: 110, atk: 16, def: 7, speed: 95,
    aggro: 270, xp: 25, gold: [5, 12],
  },
  golem_boss: {
    name: 'Golem Cổ Đại', hp: 2600, atk: 42, def: 18, speed: 70,
    aggro: 520, xp: 300, gold: [80, 150], boss: true,
    // Skill patterns của Boss — xem World.doBossPattern()
    patterns: ['slam', 'rockfall', 'summon'],
  },
};
