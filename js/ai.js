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
    this.fireTimer = 1.0; // регулярная стрельба: каждые fireRate сек (±20%) — как в оригинале
    this.replanCd = 2 + rand();
    this.stuck = 0; this.lastX = tank.x; this.lastY = tank.y;
    this.stuckWindow = 0; this.winX = undefined; this.winY = undefined;
    this.escapeT = 0; // таймер выхода из тупика
    this.moveFailed = false; // не поехал в прошлом кадре — инерция отменяется
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
      if (near.length > 1 && this.spread > 0 && rand() < 0.45) best = near[Math.floor(rand() * near.length)];
    }
    this.goal = best;
  }
  isBrickCell(bx, by){
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++)
      if (this.world.tiles[by*2+sy][bx*2+sx] === T.BRICK) return true;
    return false;
  }
  // (механика оригинала: у врагов нет «зрения» — они едут к штабу по своему алгоритму
  //  и стреляют вперёд по своему курсу с рандомной регулярностью)
  step(dt){
    const t = this.tank, w = this.world;
    if (!t.alive || t.frozen > 0) return;
    this.replanCd -= dt;
    if (this.replanCd <= 0){ this.replanCd = 1.5 + rand(); this.refreshField(); }
    if (!this.goal) this.pickGoal();
    if (Math.abs(t.x - this.lastX) < 1 && Math.abs(t.y - this.lastY) < 1) this.stuck += dt;
    else this.stuck = 0;
    this.lastX = t.x; this.lastY = t.y;
    // анти-топтание: не стоять на месте дольше ~2с — принудительный разъезд
    this.stuckWindow += dt;
    if (this.stuckWindow >= 2){
      const moved = Math.abs(t.x - (this.winX === undefined ? t.x : this.winX))
                  + Math.abs(t.y - (this.winY === undefined ? t.y : this.winY));
      this.stuckWindow = 0; this.winX = t.x; this.winY = t.y;
      if (moved < 16) this.hardUnstick(t);
    }
    if (this.escapeT > 0) this.escapeT -= dt;
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
    let targetDir = t.dir;
    if (this.goal){
      const c = centerOfBig(this.goal.cx, this.goal.cy);
      const dx = c.x - t.x, dy = c.y - t.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2){
        // дошёл до цели: если это штаб — стрелять по флагу вниз (как в оригинале — «штаб пал»)
        const gd = this.dist[this.goal.cy] ? this.dist[this.goal.cy][this.goal.cx] : 0;
        if (gd === 0){
          t.dir = DIR.DOWN;
          if (t.fireCd <= 0) w.fire(t);
          this.fireTimer = Math.min(this.fireTimer, 0.6);
          return;
        }
        this.pickGoal();
      }
      // инерция: держим направление, пока оно ведёт к цели И танк реально едет;
      // если прошлый moveTank упёрся в стену/танк — инерция отменяется
      const cur = DIRV[t.dir];
      const curGood = !this.moveFailed && ((cur[0] !== 0 && cur[0] === Math.sign(dx) && Math.abs(dx) > 2)
                   || (cur[1] !== 0 && cur[1] === Math.sign(dy) && Math.abs(dy) > 2));
      if (!curGood)
        targetDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.RIGHT : DIR.LEFT) : (dy > 0 ? DIR.DOWN : DIR.UP);
      this.moveFailed = false; // повторно проставится после w.moveTank ниже
    }
    w.moveTank(t, targetDir, dt);
    if (!t.moving) this.moveFailed = true;
    let goalDist = Infinity;
    if (this.goal){
      const c = centerOfBig(this.goal.cx, this.goal.cy);
      goalDist = Math.abs(t.x - c.x) + Math.abs(t.y - c.y);
    }
    // регулярная рандомная стрельба по курсу (как в оригинале)
    this.fireTimer -= dt;
    if (this.fireTimer <= 0){
      this.fireTimer = (this.p.fireRate || 1.0) * (0.8 + rand() * 0.4);
      if (rand() < 0.75) w.fire(t);
    }
    // стены на пути к штабу враги ломают, как в оригинале
    if (this.goal && this.isBrickCell(this.goal.cx, this.goal.cy) && goalDist < 64 && t.fireCd <= 0 && rand() < 0.5)
      w.fire(t);
    else if (this.brickAhead() && t.fireCd <= 0 && rand() < 0.5)
      w.fire(t);
  }
  tankAt(bx, by){
    const px = bx * 32, py = by * 32;
    for (const o of this.world.tanks){
      if (o === this.tank || !o.alive) continue;
      if (o.x < px + 32 && o.x + 32 > px && o.y < py + 32 && o.y + 32 > py) return true;
    }
    return false;
  }
  hardUnstick(t){
    // принудительный разъезд: клетка с приоритетом «вниз, к штабу»
    const cx = bigCell(t.x), cy = bigCell(t.y);
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]]; // вниз, вверх, вправо, влево
    let best = null, bestScore = Infinity;
    for (const [dx, dy] of dirs){
      const ncx = cx + dx, ncy = cy + dy;
      if (ncx < 0 || ncy < 0 || ncx >= 13 || ncy >= 13) continue;
      if (!this.cellFree(ncx, ncy)) continue;
      if (this.tankAt(ncx, ncy)) continue;
      const d = (this.dist[ncy] && this.dist[ncy][ncx] !== undefined) ? this.dist[ncy][ncx] : Infinity;
      const downBias = dy === 1 ? 0 : (dy === -1 ? 4 : 1);
      const score = (d === Infinity ? 999 : d) + downBias;
      if (score < bestScore){ bestScore = score; best = { cx: ncx, cy: ncy }; }
    }
    if (best) this.goal = best;
    this.spread = 0;  // никакого блуждания, пока не поедет
    this.fireTimer = Math.max(this.fireTimer, 1.0); // после выхода не палить сразу
    this.escapeT = 1.4;
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
