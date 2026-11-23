// Уровни: конфиги (состав врагов, плотность карты), детерминированная генерация

import { GRID, T } from './config.js?v=2';

export const PLAYER_CELL = [4, 22];
export const ENEMY_CELLS = [[1, 1], [12, 1], [24, 1]];
export const BASE_CELL = [12, 23];

export const BASE_RING = (() => {
  const cells = [];
  for (let x = 11; x <= 14; x++) { cells.push([x, 22]); cells.push([x, 25]); }
  cells.push([11, 23]); cells.push([14, 23]);
  cells.push([11, 24]); cells.push([14, 24]);
  return cells;
})();

export const LAST_CAMPAIGN_LEVEL = 10;

export const LEVELS = [
  { num: 1,  seed: 2301, total: 16, maxOn: 3, interval: 3.0, basic: 12, fast: 2, fire: 1, armor: 1, boss: false, brick: 0.14, steel: 4, ponds: 2, groves: 2 },
  { num: 2,  seed: 2302, total: 16, maxOn: 3, interval: 3.0, basic: 10, fast: 3, fire: 2, armor: 1, boss: false, brick: 0.16, steel: 4, ponds: 2, groves: 2 },
  { num: 3,  seed: 2303, total: 18, maxOn: 4, interval: 2.8, basic: 10, fast: 4, fire: 2, armor: 2, boss: false, brick: 0.18, steel: 5, ponds: 2, groves: 3 },
  { num: 4,  seed: 2304, total: 18, maxOn: 4, interval: 2.8, basic: 8,  fast: 5, fire: 3, armor: 2, boss: false, brick: 0.20, steel: 5, ponds: 3, groves: 2 },
  { num: 5,  seed: 2305, total: 19, maxOn: 4, interval: 2.7, basic: 8,  fast: 4, fire: 3, armor: 3, boss: true,  brick: 0.20, steel: 6, ponds: 2, groves: 2 },
  { num: 6,  seed: 2306, total: 20, maxOn: 4, interval: 2.6, basic: 8,  fast: 5, fire: 4, armor: 3, boss: false, brick: 0.22, steel: 6, ponds: 3, groves: 3 },
  { num: 7,  seed: 2307, total: 20, maxOn: 4, interval: 2.5, basic: 7,  fast: 5, fire: 4, armor: 4, boss: false, brick: 0.24, steel: 7, ponds: 3, groves: 2 },
  { num: 8,  seed: 2308, total: 22, maxOn: 4, interval: 2.4, basic: 7,  fast: 6, fire: 4, armor: 5, boss: false, brick: 0.24, steel: 8, ponds: 3, groves: 3 },
  { num: 9,  seed: 2309, total: 22, maxOn: 4, interval: 2.3, basic: 6,  fast: 6, fire: 5, armor: 5, boss: false, brick: 0.26, steel: 8, ponds: 4, groves: 2 },
  { num: 10, seed: 2310, total: 23, maxOn: 4, interval: 2.2, basic: 6,  fast: 6, fire: 5, armor: 5, boss: true,  brick: 0.26, steel: 8, ponds: 3, groves: 3 }
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getCfg(num) {
  if (num >= 1 && num <= LEVELS.length) return LEVELS[num - 1];
  const n = num;
  const total = 20 + Math.floor((n - 1) / 2);
  return {
    num: n, seed: 9000 + n, total, maxOn: 4, interval: Math.max(1.6, 2.6 - n * 0.05),
    basic: Math.max(4, 10 - Math.floor(n / 3)),
    fast: 4 + n,
    fire: 2 + Math.floor(n / 2),
    armor: Math.floor(n / 2),
    boss: n % 5 === 0,
    brick: Math.min(0.3, 0.16 + n * 0.01), steel: Math.min(10, 5 + Math.floor(n / 2)),
    ponds: 2 + (n % 3), groves: 2 + (n % 2)
  };
}

export function compositionFor(cfg) {
  const q = [];
  for (let i = 0; i < cfg.basic; i++) q.push('basic');
  const mid = [];
  for (let i = 0; i < cfg.fast; i++) mid.push('fast');
  for (let i = 0; i < cfg.fire; i++) mid.push('fire');
  for (let i = mid.length - 1; i > 0; i--) {
    const j = Math.floor(mulberry32(cfg.seed + i)() * (i + 1));
    const tmp = mid[i]; mid[i] = mid[j]; mid[j] = tmp;
  }
  for (const t of mid) q.push(t);
  for (let i = 0; i < cfg.armor; i++) q.push('armor');
  if (cfg.boss) q.push('boss');
  return q;
}

export function buildLevel(num) {
  const cfg = getCfg(num);
  const rnd = mulberry32(cfg.seed);
  const grid = new Uint8Array(GRID * GRID);
  const set = (x, y, t) => {
    if (x < 1 || y < 3 || x > GRID - 2 || y > GRID - 1) return;
    if (y >= 20 && x <= 9) return;
    if (x >= 10 && x <= 15 && y >= 21) return;
    grid[y * GRID + x] = t;
  };
  const rect = (x0, y0, w, h, t) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, t); };

  const clusters = Math.floor((GRID * GRID * cfg.brick) / 4);
  for (let i = 0; i < clusters; i++) {
    const x = 1 + Math.floor(rnd() * (GRID - 4));
    const y = 3 + Math.floor(rnd() * (GRID - 8));
    rect(x, y, 2, 2, T.BRICK);
    rect(GRID - 2 - x, y, 2, 2, T.BRICK);
  }
  for (let i = 0; i < cfg.steel; i++) {
    const x = 2 + Math.floor(rnd() * (GRID - 6));
    const y = 4 + Math.floor(rnd() * (GRID - 10));
    set(x, y, T.STEEL);
    set(GRID - 1 - x, y, T.STEEL);
  }
  for (let i = 0; i < cfg.ponds; i++) {
    const x = 2 + Math.floor(rnd() * (GRID - 8));
    const y = 4 + Math.floor(rnd() * (GRID - 12));
    rect(x, y, 3, 2, T.WATER);
    rect(GRID - 3 - x, y, 3, 2, T.WATER);
  }
  for (let i = 0; i < cfg.groves; i++) {
    const x = 2 + Math.floor(rnd() * (GRID - 8));
    const y = 4 + Math.floor(rnd() * (GRID - 12));
    rect(x, y, 3, 3, T.FOREST);
    rect(GRID - 3 - x, y, 3, 3, T.FOREST);
  }

  const base = (x, y, t) => { grid[y * GRID + x] = t; };
  for (let x = 11; x <= 14; x++) { base(x, 22, T.WALL); base(x, 25, T.WALL); }
  base(11, 23, T.WALL); base(14, 23, T.WALL);
  base(11, 24, T.WALL); base(14, 24, T.WALL);
  base(12, 23, T.BASE); base(13, 23, T.BASE);
  base(12, 24, T.BASE); base(13, 24, T.BASE);

  return { grid, cfg };
}

export function parseLevel(data) {
  const grid = new Uint8Array(GRID * GRID);
  if (!data || !Array.isArray(data.rows)) return buildLevel(1).grid;
  const map = { '.': T.EMPTY, 'B': T.BRICK, 'S': T.STEEL, 'W': T.WATER, 'F': T.FOREST, 'E': T.BASE, 'X': T.WALL };
  for (let y = 0; y < GRID && y < data.rows.length; y++) {
    const row = String(data.rows[y]);
    for (let x = 0; x < GRID && x < row.length; x++) grid[y * GRID + x] = map[row[x]] || T.EMPTY;
  }
  return grid;
}
