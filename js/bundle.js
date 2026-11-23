window.__TANKS__ = window.__TANKS__ || {};
(function(){
const CELL = 16;
const TANK = 32;
const COLS = 26, ROWS = 26;
const W = COLS * CELL, H = ROWS * CELL;
const BG = 13;
const BIG = 32;
const T = { EMPTY:0, BRICK:1, STEEL:2, WATER:3, FOREST:4, ICE:5, FLAG:6, BASEWALL:7, FLAGDEAD:8 };
const DIR = { UP:0, RIGHT:1, DOWN:2, LEFT:3 };
const DIRV = [[0,-1],[1,0],[0,1],[-1,0]];
const ENEMY_CELLS = [[1,1],[6,1],[11,1]];
const PLAYER_CELL = [4,11];
const BASE_CELL = [6,11];
const FLAG = [12, 22, 13, 23];
function cellPx(cx, cy){ return [cx*BIG, cy*BIG]; }
const ENEMY_TYPES = {
basic: { hp:1, speed:34, bulletSpeed:110, fire:2.0, score:100, color:'grey' },
fast: { hp:1, speed:58, bulletSpeed:130, fire:1.7, score:200, color:'cyan' }, // «БТР»: 3 удара, окраска меняется
sniper: { hp:1, speed:40, bulletSpeed:210, fire:2.2, score:300, color:'gold' },
armor: { hp:3, speed:30, bulletSpeed:120, fire:1.6, score:400, color:'green' },
};
function enemyBudget(level){
const total = 20 + Math.floor((level-1)/2);
const maxOn = 3; // на поле всегда ровно три врага
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
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { CELL, TANK, COLS, ROWS, W, H, BG, BIG, T, DIR, DIRV, ENEMY_CELLS, PLAYER_CELL, BASE_CELL, FLAG, cellPx, ENEMY_TYPES, enemyBudget });
})();
(function(){
function hashSeed(n){
let x = (n | 0) ^ 0x9E3779B9;
x = Math.imul(x ^ (x >>> 16), 0x21F0AAAD);
x = Math.imul(x ^ (x >>> 15), 0x735A2D97);
x = x ^ (x >>> 15);
return (x >>> 0);
}
function mulberry32(seed){
let a = seed >>> 0;
return function(){
a |= 0; a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
function makeRng(seed){
const f = mulberry32(hashSeed(seed));
return {
next: f,
int(lo, hi){ return lo + Math.floor(f() * (hi - lo + 1)); },
chance(p){ return f() < p; },
pick(arr){ return arr[Math.floor(f() * arr.length)]; },
shuffle(arr){
for (let i = arr.length - 1; i > 0; i--){
const j = Math.floor(f() * (i + 1));
[arr[i], arr[j]] = [arr[j], arr[i]];
}
return arr;
}
};
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { makeRng });
})();
(function(){
const { CELL, T } = window.__TANKS__;
function cellCost(tiles){
const BG = 13;
const cost = Array.from({length: BG}, () => new Array(BG).fill(1));
for (let by = 0; by < BG; by++) for (let bx = 0; bx < BG; bx++){
for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++){
const v = tiles[by*2+sy][bx*2+sx];
if (v === T.STEEL || v === T.WATER){ cost[by][bx] = Infinity; }
}
if (cost[by][bx] !== Infinity){
let brick = 0;
for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++){
const v = tiles[by*2+sy][bx*2+sx];
if (v === T.BRICK || v === T.FLAG) brick++;
}
if (brick > 0) cost[by][bx] = 8;
}
}
return cost;
}
function dijkstra(cost, sr, sc){
const BG = cost.length;
const dist = Array.from({length: BG}, () => new Array(BG).fill(Infinity));
dist[sr][sc] = 0;
const q = [[sr, sc]];
while (q.length){
let bi = 0;
for (let i = 1; i < q.length; i++)
if (dist[q[i][0]][q[i][1]] < dist[q[bi][0]][q[bi][1]]) bi = i;
const [cy, cx] = q.splice(bi, 1)[0];
const d = dist[cy][cx];
for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
const nx = cx+dx, ny = cy+dy;
if (nx<0||ny<0||nx>=BG||ny>=BG) continue;
const nd = d + cost[ny][nx];
if (nd < dist[ny][nx]){ dist[ny][nx] = nd; q.push([ny, nx]); }
}
}
return dist;
}
function computeField(tiles){ return dijkstra(cellCost(tiles), 11, 6); }
function computeFieldTo(tiles, cell){ return dijkstra(cellCost(tiles), cell[1], cell[0]); }
const ENEMY_CELLS = [[1,1],[6,1],[11,1]];
const PLAYER_CELL = [4,11];
function nextCellTo(tiles, tankX, tankY, targetCell){
const dist = computeFieldTo(tiles, targetCell);
const cx = Math.min(12, Math.max(0, Math.ceil((tankX + 16) / 32) - 1));
const cy = Math.min(12, Math.max(0, Math.ceil((tankY + 16) / 32) - 1));
const neighbors = [[1,0],[-1,0],[0,1],[0,-1]]
.map(([dx,dy]) => ({ cx: cx+dx, cy: cy+dy }))
.filter(c => c.cx>=0 && c.cy>=0 && c.cx<13 && c.cy<13);
let best = null, bestD = Infinity;
for (const c of neighbors){
let d = dist[c.cy][c.cx];
if (d === Infinity) continue;
let brick = false;
for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++)
if (tiles[c.cy*2+sy][c.cx*2+sx] === 1) brick = true;
if (brick) d += 8;
if (d < bestD){ bestD = d; best = c; }
}
return best;
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { computeField, computeFieldTo, nextCellTo });
})();
(function(){
const C = window.__TANKS__;
const { makeRng } = C;
const { COLS, ROWS, T } = C;
const { computeField, ENEMY_CELLS, PLAYER_CELL } = C;
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
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { MapGen });
})();
