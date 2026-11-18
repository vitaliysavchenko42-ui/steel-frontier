"use strict";
const C = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./constants') : window.__TANKS__;
const { makeRng } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./rng') : window.__TANKS__;
const { COLS, ROWS, T } = C;
const { computeField, ENEMY_CELLS, PLAYER_CELL } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./field') : window.__TANKS__;
const SPAWN_ENEMY = [[2,2],[12,2],[22,2]];
const SPAWN_PLAYER = [8, 22];
const FLAG = [12, 22, 13, 23];
const BASE_RING = [10, 20, 15, 23];
function inRect(x, y, r){ return x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3]; }
function generateMap(level, seedOverride){
  const seed = (seedOverride !== undefined ? seedOverride : level);
  const rng = makeRng(seed * 7919 + 13);
  for (let attempt = 0; attempt < 5; attempt++){
    const tiles = Array.from({length: ROWS}, () => new Array(COLS).fill(T.EMPTY));
    for (let x = 0; x < COLS; x++){ tiles[0][x] = T.STEEL; tiles[ROWS-1][x] = T.STEEL; }
    for (let y = 0; y < ROWS; y++){ tiles[y][0] = T.STEEL; tiles[y][COLS-1] = T.STEEL; }
    const density = Math.min(0.42, 0.20 + level * 0.015);
    const blocked = (x, y) =>
      SPAWN_ENEMY.some(s => inRect(x, y, [s[0]-1, s[1]-1, s[0]+2, s[1]+2])) ||
      inRect(x, y, [6, 20, 11, 24]) ||
      inRect(x, y, BASE_RING);
    const nClusters = 12 + Math.floor(density * 36);
    let steelLeft = 4, waterLeft = 2;
    for (let i = 0; i < nClusters; i++){
      const kind = rng.next();
      const cw = 2 * rng.int(1, 3), ch = 2 * rng.int(1, 3);
      const x0 = 2 * rng.int(1, Math.floor((COLS-2-cw)/2)), y0 = 2 * rng.int(1, Math.floor((ROWS-2-ch)/2));
      if (kind < 0.72) {
        for (let y = y0; y < y0+ch; y++) for (let x = x0; x < x0+cw; x++)
          if (!blocked(x,y) && rng.chance(0.85)) tiles[y][x] = T.BRICK;
      } else if (kind < 0.86 && steelLeft > 0) {
        steelLeft--;
        for (let y = y0; y < y0+2; y++) for (let x = x0; x < x0+2; x++)
          if (!blocked(x,y)) tiles[y][x] = T.STEEL;
      } else if (kind < 0.94 && waterLeft > 0 && level >= 2) {
        waterLeft--;
        const len = 2 * rng.int(2, 4), x = 2 * rng.int(1, Math.floor((COLS-2-len)/2)), y = 2 * rng.int(2, Math.floor((ROWS-4)/2));
        for (let k = 0; k < len; k++){ const xx = x+k; if (!blocked(xx,y)) tiles[y][xx] = T.WATER; }
      } else if (level >= 2 && kind < 0.97) {
        for (let y = y0; y < y0+ch; y++) for (let x = x0; x < x0+cw; x++)
          if (!blocked(x,y) && rng.chance(0.8)) tiles[y][x] = T.FOREST;
      } else if (level >= 2) {
        const cap = Math.floor(COLS*ROWS*0.12);
        let ice = 0;
        for (let y = y0; y < y0+ch && ice < cap; y++) for (let x = x0; x < x0+cw && ice < cap; x++)
          if (!blocked(x,y) && tiles[y][x] === T.EMPTY){ tiles[y][x] = T.ICE; ice++; }
      }
    }
    for (let y = FLAG[1]-1; y <= FLAG[3]+1; y++)
      for (let x = FLAG[0]-1; x <= FLAG[2]+1; x++){
        if (x < 1 || y < 1 || x > COLS-2 || y > ROWS-2) continue;
        const isFlag = inRect(x,y,FLAG);
        const isEdge = (y === FLAG[1]-1 || y === FLAG[3]+1 || x === FLAG[0]-1 || x === FLAG[2]+1);
        if (isFlag) tiles[y][x] = T.FLAG;
        else if (isEdge) tiles[y][x] = T.BRICK;
        else tiles[y][x] = T.EMPTY;
      }
    if (flagCount(tiles) !== 4) continue;
    if (isPlayable(tiles) && cellReachable(tiles)) return { tiles, level, seed };
  }
  return { tiles: fallbackMap(), level, seed };
}
function flagCount(tiles){
  let f = 0;
  for (const row of tiles) for (const v of row) if (v === T.FLAG) f++;
  return f;
}
function isPlayable(tiles){
  const pass = (v) => v === T.EMPTY || v === T.BRICK || v === T.FOREST || v === T.ICE;
  const seen = Array.from({length: ROWS}, () => new Array(COLS).fill(false));
  const start = [SPAWN_PLAYER[0], SPAWN_PLAYER[1]];
  const targets = [...SPAWN_ENEMY.map(s => [s[0], s[1]]), [12, 21], [13, 21]];
  const q = [start]; seen[start[1]][start[0]] = true;
  while (q.length){
    const [x,y] = q.pop();
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = x+dx, ny = y+dy;
      if (nx<0||ny<0||nx>=COLS||ny>=ROWS||seen[ny][nx]||!pass(tiles[ny][nx])) continue;
      seen[ny][nx] = true; q.push([nx,ny]);
    }
  }
  return targets.every(([x,y]) => seen[y][x]);
}
function cellReachable(tiles){
  const d = computeField(tiles);
  const ok = ENEMY_CELLS.every(([cx, cy]) => d[cy][cx] < Infinity) && d[PLAYER_CELL[1]][PLAYER_CELL[0]] < Infinity;
  if (!ok) return false;
  let fin = 0;
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) if (d[y][x] < Infinity) fin++;
  return fin >= 72;
}
function fallbackMap(){
  const tiles = Array.from({length: ROWS}, () => new Array(COLS).fill(T.EMPTY));
  for (let x = 0; x < COLS; x++){ tiles[0][x] = T.STEEL; tiles[ROWS-1][x] = T.STEEL; }
  for (let y = 0; y < ROWS; y++){ tiles[y][0] = T.STEEL; tiles[y][COLS-1] = T.STEEL; }
  for (let y = FLAG[1]-1; y <= FLAG[3]+1; y++)
    for (let x = FLAG[0]-1; x <= FLAG[2]+1; x++){
      if (x < 1 || y < 1 || x > COLS-2 || y > ROWS-2) continue;
      if (inRect(x,y,FLAG)) tiles[y][x] = T.FLAG;
      else if (y === FLAG[1]-1 || y === FLAG[3]+1 || x === FLAG[0]-1 || x === FLAG[2]+1) tiles[y][x] = T.BRICK;
    }
  return tiles;
}
const MapGen = { generateMap, SPAWN_ENEMY, SPAWN_PLAYER, FLAG, isPlayable, cellReachable, fallbackMap };
if (typeof module !== 'undefined') module.exports = MapGen;
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { MapGen });
