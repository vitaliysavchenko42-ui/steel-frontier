
/* ===== engine.js ===== */
(function(){
"use strict";
const C = window.__TANKS__;
const { CELL, TANK, COLS, ROWS, W, H, T, DIR, DIRV, BIG } = C;
const SNAP = BIG;

function rectHitsTiles(x, y, w, h, tiles, predicate){
  const x1 = Math.max(0, Math.floor(x / CELL)), y1 = Math.max(0, Math.floor(y / CELL));
  const x2 = Math.min(COLS-1, Math.ceil((x+w) / CELL) - 1), y2 = Math.min(ROWS-1, Math.ceil((y+h) / CELL) - 1);
  for (let ty = y1; ty <= y2; ty++) for (let tx = x1; tx <= x2; tx++)
    if (predicate(tiles[ty][tx])) return { tx, ty };
  return null;
}
const SOLID_FOR_TANK = (v) => v === T.BRICK || v === T.STEEL || v === T.WATER;
const SOLID_FOR_BULLET = (v) => v === T.BRICK || v === T.STEEL;

class Engine {
  constructor(tiles){
    this.tiles = tiles.map(r => r.slice());
    this.tanks = []; this.bullets = []; this.effects = [];
    this.time = 0; this.bonuses = []; this.stats = { kills: 0, score: 0 };
  }
  addTank(o){
    const tank = Object.assign({
      x: 0, y: 0, dir: DIR.UP, speed: 50, hp: 1, alive: true,
      isPlayer: false, type: null, shield: 0, frozen: 0, sliding: null,
      bulletSpeed: 120, fireCd: 0, fireRate: 1.0, bulletsAlive: 0, maxBullets: 1,
      moving: false, spawnFlash: 0, score: 0, elite: false, bonusDrop: false, power: 1,
    }, o);
    this.tanks.push(tank);
    return tank;
  }
  canMove(tank, dir, dt){
    const [dx, dy] = DIRV[dir];
    const nx = tank.x + dx * tank.speed * dt;
    const ny = tank.y + dy * tank.speed * dt;
    if (nx < 0 || ny < 0 || nx + TANK > W || ny + TANK > H) return false;
    if (rectHitsTiles(nx, ny, TANK, TANK, this.tiles, SOLID_FOR_TANK)) return false;
    for (const o of this.tanks){
      if (o === tank || !o.alive) continue;
      if (nx < o.x + TANK && nx + TANK > o.x && ny < o.y + TANK && ny + TANK > o.y) return false;
    }
    return { nx, ny };
  }
  moveTank(tank, dir, dt){
    tank.moving = false;
    if (tank.frozen > 0 && !tank.isPlayer) return;
    if (tank.dir !== dir){
      if (dir === DIR.UP || dir === DIR.DOWN)
        tank.x = Math.min(W - TANK, Math.max(0, Math.round(tank.x / SNAP) * SNAP));
      else
        tank.y = Math.min(H - TANK, Math.max(0, Math.round(tank.y / SNAP) * SNAP));
      tank.dir = dir;
    }
    let mv = this.canMove(tank, dir, dt);
    let div = 1;
    while (!mv && div <= 16 && tank.speed * dt / div > 0.5){
      div *= 2;
      mv = this.canMove(tank, dir, dt / div);
    }
    if (mv){
      const realDt = dt / div;
      const [dx, dy] = DIRV[dir];
      tank.x += dx * tank.speed * realDt;
      tank.y += dy * tank.speed * realDt;
      tank.moving = true;
      const cx = Math.floor((tank.x + TANK/2) / CELL), cy = Math.floor((tank.y + TANK/2) / CELL);
      const tile = this.tiles[cy] ? this.tiles[cy][cx] : T.EMPTY;
      tank.onIce = tile === T.ICE;
    } else tank.onIce = false;
  }
  fire(tank){
    if (tank.fireCd > 0 || !tank.alive) return null;
    if (tank.bulletsAlive >= tank.maxBullets) return null;
    tank.fireCd = tank.fireRate;
    const [dx, dy] = DIRV[tank.dir];
    const bw = 6;
    const bx = tank.x + TANK/2 - bw/2 + dx * (TANK/2);
    const by = tank.y + TANK/2 - bw/2 + dy * (TANK/2);
    const bullet = { x: bx, y: by, w: bw, h: bw, dir: tank.dir, speed: tank.bulletSpeed,
      owner: tank, power: tank.power || 1, alive: true, fromPlayer: tank.isPlayer };
    this.bullets.push(bullet);
    tank.bulletsAlive++;
    return bullet;
  }
  damageTile(tx, ty, power, b){
    const v = this.tiles[ty] && this.tiles[ty][tx];
    if (v === T.BRICK) {
      this.tiles[ty][tx] = T.EMPTY;
      const [ddx, ddy] = b ? (b.dir % 2 === 0 ? [1, 0] : [0, 1]) : [0, 0];
      const nx2 = tx + ddx, ny2 = ty + ddy;
      if (nx2 >= 0 && ny2 >= 0 && nx2 < COLS && ny2 < ROWS && this.tiles[ny2][nx2] === T.BRICK)
        this.tiles[ny2][nx2] = T.EMPTY;
      return true;
    }
    if (v === T.BASEWALL) {
      this.tiles[ty][tx] = T.EMPTY;
      const [wdx, wdy] = (b && b.dir % 2 === 0) ? [1, 0] : [0, 1];
      const nx4 = tx + wdx, ny4 = ty + wdy;
      if (nx4 >= 0 && ny4 >= 0 && nx4 < COLS && ny4 < ROWS && this.tiles[ny4][nx4] === T.BASEWALL)
        this.tiles[ny4][nx4] = T.EMPTY;
      return true;
    }
    if (v === T.STEEL) {
      if (power >= 3) {
        this.tiles[ty][tx] = T.EMPTY;
        const [sdx, sdy] = (b && b.dir % 2 === 0) ? [1, 0] : [0, 1];
        const nx3 = tx + sdx, ny3 = ty + sdy;
        if (nx3 >= 0 && ny3 >= 0 && nx3 < COLS && ny3 < ROWS && this.tiles[ny3][nx3] === T.STEEL)
          this.tiles[ny3][nx3] = T.EMPTY;
        return true;
      } return false;
    }
    return false;
  }
  hitFlag(){ return this.tiles.some((row, y) => row.some((v, x) => v === T.FLAG)); }
  step(dt){
    this.time += dt;
    for (const t of this.tanks){
      if (!t.alive) continue;
      if (t.fireCd > 0) t.fireCd = Math.max(0, t.fireCd - dt);
      if (t.shield > 0) t.shield = Math.max(0, t.shield - dt);
      if (t.frozen > 0) t.frozen = Math.max(0, t.frozen - dt);
    }
    for (const b of this.bullets){
      if (!b.alive) continue;
      const [dx, dy] = DIRV[b.dir];
      const steps = Math.max(1, Math.ceil(b.speed * dt / 4));
      const sd = (b.speed * dt) / steps;
      for (let s = 0; s < steps && b.alive; s++){
        b.x += dx * sd; b.y += dy * sd;
        if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H){ b.alive = false; break; }
        const hit = rectHitsTiles(b.x, b.y, b.w, b.h, this.tiles, SOLID_FOR_BULLET);
        if (hit){
          this.damageTile(hit.tx, hit.ty, b.power, b);
          if (b.owner && b.owner.power >= 3){
            const [ox, oy] = dx !== 0 ? [0, 1] : [1, 0];
            this.damageTile(hit.tx + ox, hit.ty + oy, b.power, b);
          }
          b.alive = false; break;
        }
        for (const o of this.bullets){
          if (o === b || !o.alive) continue;
          if (b.fromPlayer !== o.fromPlayer &&
              b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y){
            b.alive = false; o.alive = false; break;
          }
        }
        if (!b.alive) break;
        for (const t of this.tanks){
          if (!t.alive || t === b.owner) continue;
          if (!b.fromPlayer && !t.isPlayer) continue;
          if (b.x < t.x + TANK && b.x + b.w > t.x && b.y < t.y + TANK && b.y + b.h > t.y){
            if (t.shield > 0){ b.alive = false; break; }
            t.hp -= b.power;
            if (t.hp <= 0){
              t.alive = false;
              if (!t.isPlayer){ this.stats.kills++; this.stats.score += ENEMY_SCORE[t.type] || 100; }
            }
            b.alive = false; break;
          }
        }
      }
    }
    for (const b of this.bullets) if (!b.alive && b.owner) b.owner.bulletsAlive = Math.max(0, b.owner.bulletsAlive - 1);
    this.bullets = this.bullets.filter(b => b.alive);
  }
}
const ENEMY_SCORE = { basic: 100, fast: 200, sniper: 300, armor: 400 };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { Engine });
})();

/* ===== ai.js ===== */
(function(){
"use strict";
const C = window.__TANKS__;
const { DIR, DIRV, CELL, TANK, T, BG } = C;
const { computeField } = C;
const rand = () => Math.random();
function bigCell(px){ return Math.min(BG-1, Math.max(0, Math.ceil((px + TANK/2) / (CELL*2)) - 1)); }
function centerOfBig(cx, cy){ return { x: cx*CELL*2, y: cy*CELL*2 }; }

class EnemyAI {
  constructor(world, tank, basePos, params){
    this.world = world; this.tank = tank;
    this.basePos = basePos || [6, 11];
    this.p = Object.assign({ fireMul: 1, attackOnSight: 3.0 }, params || {});
    this.dist = computeField(this.world.tiles);
    this.goal = null;
    this.attackT = 0;
    this.replanCd = 2 + rand();
    this.stuck = 0; this.lastX = tank.x; this.lastY = tank.y;
  }
  refreshField(){ this.dist = computeField(this.world.tiles); }
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
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { EnemyAI });
})();
