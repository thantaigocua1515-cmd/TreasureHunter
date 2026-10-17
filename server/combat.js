'use strict';
/* ============================================================================
 * combat.js — Công thức sát thương & roll phẩm chất (chạy phía SERVER,
 * server là authoritative để chống cheat).
 * ========================================================================== */

/**
 * Sát thương vật lý cơ bản:
 *   mitigation = def / (def + 120)   → def càng cao, giảm càng nhiều nhưng
 *                                      diminishing return, không bao giờ miễn nhiễm
 *   variance  ±10%  ·  crit x1.6
 */
function calcDamage(atk, def, critChance = 0.05) {
  const mitigation = def / (def + 120);
  const variance = 0.9 + Math.random() * 0.2;
  const isCrit = Math.random() < critChance;
  const dmg = Math.max(1, Math.round(atk * (1 - mitigation) * variance * (isCrit ? 1.6 : 1)));
  return { dmg, crit: isCrit };
}

/** Roll phẩm chất rơi đồ. luck tăng tỉ trọng Sử Thi / Huyền Thoại. */
function rollRarity(luck = 0) {
  const w = [62, 25, 10, 3];
  w[2] += luck; w[3] += luck * 2;
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}

module.exports = { calcDamage, rollRarity };
