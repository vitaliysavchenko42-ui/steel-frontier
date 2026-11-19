"use strict";
const C = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./constants') : window.__TANKS__;
const { DIR, DIRV, CELL, TANK, T, BG } = C;
const { computeField, computeFieldTo } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./field') : window.__TANKS__;
const rand = () => Math.random();
function bigCell(px){ return Math.min(BG-1, Math.max(0, Math.ceil((px + TANK/2) / (CELL*2)) - 1)); }
function centerOfBig(cx, cy){ return { x: cx*CELL*2, y: cy*CELL*2 }; }

class EnemyAI {
  constructor(world, tank, basePos, params){
    this.world = world; this.tank = tank;
    this.basePos = basePos || [6, 11];
    this.p = Object.assign({ fireMul: 1, attackOnSight: 3.0 }, params || {});
    // подходная точка: враги идут к штабу разными дорогами
    this.approach = this.p.approach || null;
    this.spread = 1 + rand() * 2;
    this.dist = this.approach ? computeFieldTo(this.world.tiles, this.approach) : computeField(this.world.tiles);
    this.goal = null;
    this.attackT = 0;
    this.replanCd = 2 + rand();
    this.stuck = 0; this.lastX = tank.x; this.lastY = tank.y;
  }
  refreshField(){ this.dist = this.approach ? computeFieldTo(this.world.tiles, this.approach) : computeField(this.world.tiles); }
  cellFree(bx, by){
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++){
      const v = this.world.tiles[by*2+sy][bx*2+sx];
      if (v === T.STEEL || v === T.WATER) return false;
    }
    return true;
  }
  pickGoal(){
    const t = this.tank;
    const cx = bigCell(t.x), cy = bigCell(t.y);
    const neighbors = [[1,0],[-1,0],[0,1],[0,-1]]
      .map(([dx,dy]) => ({ cx: cx+dx, cy: cy+dy }))
      .filter(c => c.cx>=0 && c.cy>=0 && c.cx<13 && c.cy<13);
    const free = neighbors.filter(c => this.cellFree(c.cx, c.cy));
    const pool = free.length ? free : neighbors;
    let best = null, bestD = Infinity;
    for (const c of pool){
      const d = this.dist[c.cy][c.cx];
      if (d < bestD){ bestD = d; best = c; }
    }
    if (best === null || bestD === Infinity){
      best = pool.length ? pool[Math.floor(rand() * pool.length)] : { cx, cy };
    } else {
      // «разъезд»: иногда выбираем не самый короткий путь, а один из почти равных
      const near = pool.filter(c => this.dist[c.cy][c.cx] <= bestD + this.spread);
      if (near.length > 1 && rand() < 0.45) best = near[Math.floor(rand() * near.length)];
    }
    this.goal = best;
  }
  isBrickCell(bx, by){
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++)
      if (this.world.tiles[by*2+sy][bx*2+sx] === T.BRICK) return true;
    return false;
  }
  seesPlayer(){
    const w = this.world;
    if (w.playerX === undefined) return false;
    const t = this.tank;
    const cx = t.x + TANK/2, cy = t.y + TANK/2;
    if (Math.abs(w.playerY - cy) < TANK/2 + CELL*0.5 && Math.abs(w.playerX - cx) < 11*CELL) return 'horiz';
    if (Math.abs(w.playerX - cx) < TANK/2 + CELL*0.5 && Math.abs(w.playerY - cy) < 11*CELL) return 'vert';
    return false;
  }
  step(dt){
    const t = this.tank, w = this.world;
    if (!t.alive || t.frozen > 0) return;
    this.replanCd -= dt;
    if (this.replanCd <= 0){ this.replanCd = 1.5 + rand(); this.refreshField(); }
    if (!this.goal) this.pickGoal();
    if (Math.abs(t.x - this.lastX) < 1 && Math.abs(t.y - this.lastY) < 1) this.stuck += dt;
    else this.stuck = 0;
    this.lastX = t.x; this.lastY = t.y;
    if (this.stuck > 1.2){
      let shotAtGoal = false;
      if (this.goal && this.isBrickCell(this.goal.cx, this.goal.cy)){
        const c = centerOfBig(this.goal.cx, this.goal.cy);
        const ddx = c.x - t.x, ddy = c.y - t.y;
        t.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 1 : 3) : (ddy > 0 ? 2 : 0);
        w.fire(t); shotAtGoal = true;
      } else if (this.brickAhead()){
        w.fire(t); shotAtGoal = true;
      }
      if (!shotAtGoal) this.pickGoal();
      this.stuck = 0;
    }
    const sight = this.seesPlayer();
    let targetDir = t.dir;
    if (sight && this.attackT <= 0 && rand() < 0.65) this.attackT = this.p.attackOnSight * (0.5 + rand()*0.7);
    if (this.attackT > 0){
      this.attackT -= dt;
      targetDir = sight === 'horiz' ? (w.playerX > t.x ? DIR.RIGHT : DIR.LEFT)
                : sight === 'vert'  ? (w.playerY > t.y ? DIR.DOWN : DIR.UP) : t.dir;
    } else if (this.goal){
      const c = centerOfBig(this.goal.cx, this.goal.cy);
      const dx = c.x - t.x, dy = c.y - t.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) this.pickGoal();
      targetDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.RIGHT : DIR.LEFT) : (dy > 0 ? DIR.DOWN : DIR.UP);
    }
    w.moveTank(t, targetDir, dt);
    let goalDist = Infinity;
    if (this.goal){
      const c = centerOfBig(this.goal.cx, this.goal.cy);
      goalDist = Math.abs(t.x - c.x) + Math.abs(t.y - c.y);
    }
    const shootNow = (sight && this.attackT > 0 && rand() < 0.5) || (this.goal && this.isBrickCell(this.goal.cx, this.goal.cy) && goalDist < 64) || this.brickAhead();
    if (t.fireCd <= 0 && shootNow && rand() < 0.85 * this.p.fireMul) w.fire(t);
  }
  brickAhead(){
    const t = this.tank, w = this.world;
    const [dx, dy] = DIRV[t.dir];
    for (let s = 1; s <= 6; s++){
      const tx = Math.floor((t.x + TANK/2 + dx*s*CELL) / CELL);
      const ty = Math.floor((t.y + TANK/2 + dy*s*CELL) / CELL);
      if (ty < 0 || ty >= 26 || tx < 0 || tx >= 26) return false;
      if (w.tiles[ty][tx] === T.BRICK) return true;
      if (w.tiles[ty][tx] === T.STEEL || w.tiles[ty][tx] === T.WATER) return false;
    }
    return false;
  }
}
if (typeof module !== 'undefined') module.exports = { EnemyAI, bigCell, centerOfBig };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { EnemyAI });
