"use strict";
const { CELL, T } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./constants') : window.__TANKS__;
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
if (typeof module !== 'undefined') module.exports = { computeField, computeFieldTo, cellCost, nextCellTo, ENEMY_CELLS, PLAYER_CELL };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { computeField, computeFieldTo, nextCellTo });
