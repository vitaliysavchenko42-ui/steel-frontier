"use strict";
const CELL = 16;
const TANK = 32;
const COLS = 26, ROWS = 26;
const W = COLS * CELL, H = ROWS * CELL;
const BG = 13;
const BIG = 32;
const T = { EMPTY:0, BRICK:1, STEEL:2, WATER:3, FOREST:4, ICE:5, FLAG:6, BASEWALL:7 };
const DIR = { UP:0, RIGHT:1, DOWN:2, LEFT:3 };
const DIRV = [[0,-1],[1,0],[0,1],[-1,0]];
const ENEMY_CELLS = [[1,1],[6,1],[11,1]];
const PLAYER_CELL = [4,11];
const BASE_CELL = [6,11];
const FLAG = [12, 22, 13, 23];
function cellPx(cx, cy){ return [cx*BIG, cy*BIG]; }
const ENEMY_TYPES = {
  basic:  { hp:1, speed:34,  bulletSpeed:110, fire:2.0,  score:100, color:'grey' },
  fast:   { hp:1, speed:58,  bulletSpeed:130, fire:1.7,  score:200, color:'cyan' },
  sniper: { hp:1, speed:40,  bulletSpeed:210, fire:2.2,  score:300, color:'gold' },
  armor:  { hp:3, speed:30,  bulletSpeed:120, fire:1.6,  score:400, color:'green' },
};
function enemyBudget(level){
  const total = 20 + Math.floor((level-1)/2);
  const maxOn = Math.min(6, 4 + Math.floor((level-1)/4));
  let pArmor = Math.min(0.35, 0.04 + (level-1)*0.03);
  let pSniper = Math.min(0.25, (level-1)*0.02);
  let pFast = Math.min(0.40, 0.12 + (level-1)*0.02);
  const sum = pArmor + pSniper + pFast;
  if (sum > 0.9){
    const k = 0.9 / sum;
    pArmor *= k; pSniper *= k; pFast *= k;
  }
  const speedMul = 1 + Math.min(0.6, (level-1)*0.04);
  const fireMul = 1 + Math.min(1.2, (level-1)*0.05);
  return { total, maxOn, pArmor, pSniper, pFast, speedMul, fireMul };
}
if (typeof module !== 'undefined') module.exports = { CELL, TANK, COLS, ROWS, W, H, BG, BIG, T, DIR, DIRV, ENEMY_CELLS, PLAYER_CELL, BASE_CELL, FLAG, cellPx, ENEMY_TYPES, enemyBudget };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { CELL, TANK, COLS, ROWS, W, H, BG, BIG, T, DIR, DIRV, ENEMY_CELLS, PLAYER_CELL, BASE_CELL, FLAG, cellPx, ENEMY_TYPES, enemyBudget });
