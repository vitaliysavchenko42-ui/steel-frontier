"use strict";
const C = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./constants') : window.__TANKS__;
const { CELL, TANK, COLS, ROWS, W, H, T, DIR, DIRV, BIG, FLAG } = C;
const SNAP = 16; // полклетки: повороты и остановки шагом 16px (половина танка)

function rectHitsTiles(x, y, w, h, tiles, predicate){
  const x1 = Math.max(0, Math.floor(x / CELL)), y1 = Math.max(0, Math.floor(y / CELL));
  const x2 = Math.min(COLS-1, Math.ceil((x+w) / CELL) - 1), y2 = Math.min(ROWS-1, Math.ceil((y+h) / CELL) - 1);
  for (let ty = y1; ty <= y2; ty++) for (let tx = x1; tx <= x2; tx++)
    if (predicate(tiles[ty][tx])) return { tx, ty };
  return null;
}
const SOLID_FOR_TANK = (v) => v === T.BRICK || v === T.STEEL || v === T.WATER;
const SOLID_FOR_BULLET = (v) => v === T.BRICK || v === T.STEEL || v === T.FLAG;

class Engine {
  constructor(tiles){
    this.tiles = tiles.map(r => r.slice());
    this.tanks = []; this.bullets = []; this.effects = [];
    this.time = 0; this.bonuses = []; this.stats = { kills: 0, score: 0 };
    this.onShot = null; this.onHit = null; this.onClash = null; this.onDeath = null;
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
    // пуля вылетает с кончика ствола (дуло выступает на 3px за корпус)
    const nose = TANK/2 + 4;
    let bx = tank.x + TANK/2 - bw/2 + dx * nose;
    let by = tank.y + TANK/2 - bw/2 + dy * nose;
    bx = Math.min(W - bw, Math.max(0, bx));
    by = Math.min(H - bw, Math.max(0, by));
    const bullet = { x: bx, y: by, w: bw, h: bw, dir: tank.dir, speed: tank.bulletSpeed,
      owner: tank, power: tank.power || 1, alive: true, fromPlayer: tank.isPlayer };
    this.bullets.push(bullet);
    tank.bulletsAlive++;
    if (this.onShot) this.onShot(tank);
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
    if (v === T.FLAG) {
      // попадание в штаб: флаг уничтожен целиком
      for (let fy = FLAG[1]; fy <= FLAG[3]; fy++) for (let fx2 = FLAG[0]; fx2 <= FLAG[2]; fx2++)
        if (this.tiles[fy][fx2] === T.FLAG) this.tiles[fy][fx2] = T.FLAGDEAD;
      return true;
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
        // столкновение пуль на каждом подшаге — иначе пули проскакивают друг мимо друга
        for (const o of this.bullets){
          if (o === b || !o.alive) continue;
          if (b.fromPlayer !== o.fromPlayer &&
              b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y){
            b.alive = false; o.alive = false;
            if (this.onClash) this.onClash(b.x + b.w/2, b.y + b.h/2);
            break;
          }
        }
        if (!b.alive) break;
        const hit = rectHitsTiles(b.x, b.y, b.w, b.h, this.tiles, SOLID_FOR_BULLET);
        if (hit){
          const wasFlag = this.tiles[hit.ty][hit.tx] === T.FLAG;
          this.damageTile(hit.tx, hit.ty, b.power, b);
          if (b.owner && b.owner.power >= 3){
            const [ox, oy] = dx !== 0 ? [0, 1] : [1, 0];
            this.damageTile(hit.tx + ox, hit.ty + oy, b.power, b);
          }
          if (this.onHit) this.onHit(b.x + b.w/2, b.y + b.h/2, wasFlag ? 'base' : 'wall');
          b.alive = false; break;
        }
        for (const t of this.tanks){
          if (!t.alive || t === b.owner) continue;
          if (!b.fromPlayer && !t.isPlayer) continue;
          if (b.x < t.x + TANK && b.x + b.w > t.x && b.y < t.y + TANK && b.y + b.h > t.y){
            if (t.shield > 0){ b.alive = false; break; }
            t.hp -= b.power;
            if (t.hp <= 0){
              t.alive = false;
              if (!t.isPlayer){ this.stats.kills++; this.stats.score += ENEMY_SCORE[t.type] || 100; }
              if (this.onDeath) this.onDeath(t);
            } else if (this.onHit) this.onHit(b.x + b.w/2, b.y + b.h/2, 'tank');
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

if (typeof module !== 'undefined') module.exports = { Engine, rectHitsTiles, SOLID_FOR_TANK, SOLID_FOR_BULLET, ENEMY_SCORE, SNAP };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { Engine });
