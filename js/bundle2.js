/* ===== engine.js ===== */
(function(){
"use strict";
const C = window.__TANKS__;
const { CELL, TANK, COLS, ROWS, W, H, T, DIR, DIRV, BIG, FLAG } = C;
const SNAP = BIG;

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

/* ===== game.js ===== */
(function(){
"use strict";
const C = window.__TANKS__;
const { ENEMY_TYPES, enemyBudget, ENEMY_CELLS, PLAYER_CELL, BASE_CELL, FLAG, cellPx, DIR } = C;
const { Engine } = C;
const { EnemyAI } = C;
const { makeRng } = C;

const BONUS_TYPES = ['grenade','helmet','star','shovel','tank','clock'];
const SPAWN_INTERVAL = 10; // секунд между гибелью врага и появлением замены
const BONUS_LIFE = 30;     // сколько секунд бонус живёт на поле

class Game {
  constructor(level, opts){
    opts = opts || {};
    this.level = level;
    this.budget = enemyBudget(level);
    this.rng = makeRng(level * 104729 + 77);
    this.onSound = opts.onSound || function(){};
    this.onEvent = opts.onEvent || function(){};
    this.state = 'playing';
    this.lives = opts.lives || 3;
    this.time = 0; this.levelTime = 0;
    this.enemiesRemaining = this.budget.total;
    this.spawnQueue = [];
    this.enemiesOnField = 0;
    this.enemyAis = new Map();
    this.respawnQueue = []; // моменты гибели врагов: замена через SPAWN_INTERVAL
    this.baseShovel = 0;
    this.freezeTimer = 0;
    this.stats = { kills:0, score:0, bonuses:0, time:0 };
    this.playerPower = 1;
    this.explosions = [];
    this.sparkles = [];
    this.startLevel();
    const E = this.engine;
    E.onShot = (tank) => this.onSound('shoot', !!tank.isPlayer);
    E.onHit = (x, y, kind) => {
      if (kind === 'steel') this.onSound('ricochet');
      if (kind === 'base'){
        // штаб подбит: большой взрыв + звук
        this.onSound('baseDestroyed');
        this.explosions.push({ x: 16 + x, y: 56 + y, t0: this.time, dur: 1.4, big: true, seed: Math.random() * 6 });
      }
      this.sparkles.push({ x: 16 + x, y: 56 + y, t0: this.time, dur: 0.28 });
    };
    E.onClash = (x, y) => {
      this.onSound('ricochet');
      this.sparkles.push({ x: 16 + x, y: 56 + y, t0: this.time, dur: 0.35 });
    };
    E.onDeath = (t) => {
      this.explosions.push({ x: 16 + t.x + 16, y: 56 + t.y + 16, t0: this.time,
        dur: t.isPlayer ? 0.9 : 0.55, big: t.isPlayer || t.type === 'armor', seed: Math.random() * 6 });
      if (!t.isPlayer){ this.onSound('explosion', false); this.respawnQueue.push(this.time); }
    };
  }
  startLevel(){
    const m = C.MapGen.generateMap(this.level);
    this.engine = new Engine(m.tiles);
    this.map = m;
    this.mapTilesOrig = m.tiles.map(r => r.slice());
    const [px, py] = cellPx(PLAYER_CELL[0], PLAYER_CELL[1]);
    this.player = this.engine.addTank({
      x: px, y: py, dir: DIR.UP, isPlayer: true,
      speed: 46, hp: 1, shield: 3.5, bulletSpeed: 150,
      fireRate: 0.42, power: this.playerPower,
    });
    const b = this.budget;
    this.spawnQueue = [];
    for (let i = 0; i < b.total; i++){
      const r = this.rng.next();
      let type = 'basic';
      if (r < b.pArmor) type = 'armor';
      else if (r < b.pArmor + b.pSniper) type = 'sniper';
      else if (r < b.pArmor + b.pSniper + b.pFast) type = 'fast';
      const elite = (i === 3 || i === 10);
      this.spawnQueue.push({ type, elite,
        speed: ENEMY_TYPES[type].speed * b.speedMul,
        bulletSpeed: ENEMY_TYPES[type].bulletSpeed,
        fireRate: Math.max(0.35, ENEMY_TYPES[type].fire / b.fireMul),
      });
    }
    this.enemiesRemaining = this.spawnQueue.length;
    this.levelTime = 0;
    // старт: сразу три врага (углы + середина верхней кромки)
    let spawnedNow = 0;
    for (let s = 0; s < 3; s++) if (this.spawnEnemy()) spawnedNow++;
    this.enemiesRemaining -= spawnedNow;
  }
  freeEnemyCell(){
    const cells = ENEMY_CELLS.slice().sort(() => this.rng.next() - 0.5);
    for (const [cx, cy] of cells){
      const [x, y] = cellPx(cx, cy);
      const occupied = this.engine.tanks.some(t => t.alive && Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 40);
      if (!occupied) return { x, y, cx, cy };
    }
    return null;
  }
  spawnEnemy(){
    const spot = this.freeEnemyCell();
    if (!spot) return false;
    const spec = this.spawnQueue.shift();
    const t = ENEMY_TYPES[spec.type];
    const tank = this.engine.addTank({
      x: spot.x, y: spot.y, dir: DIR.DOWN, type: spec.type,
      speed: spec.speed, hp: t.hp, bulletSpeed: spec.bulletSpeed,
      fireRate: spec.fireRate, elite: spec.elite, bonusDrop: spec.elite,
      spawnFlash: 2.0, maxBullets: spec.type === 'sniper' ? 2 : 1,
    });
    const ai = new EnemyAI(this.engine, tank, BASE_CELL, { fireMul: this.budget.fireMul });
    this.enemyAis.set(tank, ai);
    this.enemiesOnField++;
    this.onSound('spawn');
    return true;
  }
  dropBonus(x, y){
    const type = this.rng.pick(BONUS_TYPES);
    this.engine.bonuses.push({ x: x + 16 - 12, y: y + 16 - 12, w: 24, h: 24, type, alive: true, t: 0, t0: this.time });
    this.onSound('bonusDrop');
  }
  applyBonus(type){
    const p = this.player;
    this.stats.bonuses++;
    this.onSound('bonus');
    switch(type){
      case 'grenade': {
        for (const t of this.engine.tanks){
          if (!t.isPlayer && t.alive){
            t.alive = false;
            this.engine.stats.score += ENEMY_TYPES[t.type].score;
            this.engine.stats.kills++;
            this.onEvent('explosion', t.x, t.y);
            this.respawnQueue.push(this.time);
          }
        }
        break;
      }
      case 'helmet': p.shield = Math.max(p.shield, 10); break;
      case 'star': {
        p.power = Math.min(3, (p.power || 1) + 1);
        if (p.power >= 2) p.maxBullets = 2;
        if (p.power >= 3) p.bulletSpeed = 220;
        break;
      }
      case 'shovel': {
        this.baseShovel = 15;
        const mTiles = this.engine.tiles;
        const F = FLAG;
        for (let y = F[1]-1; y <= F[3]+1; y++)
          for (let x = F[0]-1; x <= F[2]+1; x++){
            const isFlag = x >= F[0] && y >= F[1] && x <= F[2] && y <= F[3];
            const edge = (y === F[1]-1 || y === F[3]+1 || x === F[0]-1 || x === F[2]+1);
            if (edge) mTiles[y][x] = 2;
          }
        break;
      }
      case 'tank': this.lives++; break;
      case 'clock': this.freezeTimer = 8; for (const t of this.engine.tanks) if (!t.isPlayer) t.frozen = 8; break;
    }
  }
  pickupBonuses(){
    const p = this.player;
    for (const b of this.engine.bonuses){
      if (!b.alive) continue;
      if (p.x < b.x + b.w && p.x + 32 > b.x && p.y < b.y + b.h && p.y + 32 > b.y){
        b.alive = false;
        this.applyBonus(b.type);
      }
    }
    this.engine.bonuses = this.engine.bonuses.filter(b => b.alive);
  }
  playerInput(input, dt){
    const p = this.player;
    if (!p.alive || this.state !== 'playing') return;
    if (input.dir !== undefined && input.dir !== null){
      this.engine.moveTank(p, input.dir, dt);
    } else p.moving = false;
    if (input.fire) this.engine.fire(p);
  }
  killPlayer(){
    const p = this.player;
    p.alive = false;
    this.lives--;
    this.onSound('playerDeath');
    this.onEvent('explosion', p.x, p.y);
    if (this.lives <= 0){
      this.state = 'gameover';
      return;
    }
    const [px, py] = cellPx(PLAYER_CELL[0], PLAYER_CELL[1]);
    this.player = this.engine.addTank({
      x: px, y: py, dir: DIR.UP, isPlayer: true,
      speed: 46, hp: 1, shield: 3.5, bulletSpeed: this.playerPower >= 3 ? 220 : 150,
      fireRate: 0.42, power: this.playerPower,
      maxBullets: this.playerPower >= 2 ? 2 : 1,
    });
  }
  step(dt, input){
    if (this.state !== 'playing') return;
    this.time += dt; this.levelTime += dt;
    this.explosions = this.explosions.filter(e => this.time - e.t0 < e.dur);
    this.sparkles = this.sparkles.filter(e => this.time - e.t0 < e.dur);
    const w = this.engine;
    this.enemiesOnField = w.tanks.filter(t => !t.isPlayer && t.alive).length;
    if (this.enemiesRemaining > 0 && this.enemiesOnField < this.budget.maxOn){
      if (this.respawnQueue.length === 0){
        // очередь пуста, а на поле меньше трёх — спавним сразу
        if (this.spawnEnemy()) this.enemiesRemaining--;
      } else if (this.time - this.respawnQueue[0] >= SPAWN_INTERVAL){
        if (this.spawnEnemy()){
          this.enemiesRemaining--;
          this.respawnQueue.shift();
        }
      }
    }
    if (this.freezeTimer > 0) this.freezeTimer -= dt;
    w.playerX = this.player.alive ? this.player.x : undefined;
    w.playerY = this.player.alive ? this.player.y : undefined;
    for (const t of w.tanks){
      if (t.isPlayer || !t.alive) continue;
      const ai = this.enemyAis.get(t);
      if (ai) ai.step(this.freezeTimer > 0 ? 0 : dt);
    }
    this.playerInput(input, dt);
    w.step(dt);
    if (this.baseShovel > 0){
      this.baseShovel -= dt;
      if (this.baseShovel <= 0){
        const mTiles = w.tiles, F = FLAG;
        for (let y = F[1]-1; y <= F[3]+1; y++)
          for (let x = F[0]-1; x <= F[2]+1; x++){
            const isFlag = x >= F[0] && y >= F[1] && x <= F[2] && y <= F[3];
            if (isFlag) continue;
            const edge = (y === F[1]-1 || y === F[3]+1 || x === F[0]-1 || x === F[2]+1);
            if (edge) mTiles[y][x] = 1;
            else if (mTiles[y][x] === 2 && !this.isOriginalSteel(x,y)) mTiles[y][x] = 0;
          }
      }
    }
    this.pickupBonuses();
    // бонус живёт на поле BONUS_LIFE секунд
    this.engine.bonuses = this.engine.bonuses.filter(b => this.time - (b.t0 || 0) < BONUS_LIFE);
    if (!this.player.alive && this.state === 'playing') this.killPlayer();
    let flagAlive = false;
    for (let y = FLAG[1]; y <= FLAG[3]; y++) for (let x = FLAG[0]; x <= FLAG[2]; x++)
      if (w.tiles[y][x] === 6) flagAlive = true;
    if (!flagAlive && this.state === 'playing'){
      this.state = 'gameover'; this.gameoverReason = 'base';
    }
    for (const t of w.tanks){
      if (!t.isPlayer && !t.alive && t.bonusDrop && !t.dropped){
        t.dropped = true;
        this.dropBonus(t.x, t.y);
      }
    }
    if (this.enemiesRemaining === 0 && this.enemiesOnField === 0 && this.state === 'playing'){
      this.state = 'won';
      this.stats.time = this.levelTime;
      this.stats.score = this.engine.stats.score;
      this.stats.kills = this.engine.stats.kills;
    }
  }
  isOriginalSteel(x, y){
    const orig = this.mapTilesOrig;
    return orig[y][x] === 2;
  }
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { Game, BONUS_TYPES });
})();

/* ===== sound.js ===== */
(function(){
"use strict";
const VOICE_LIMIT = 6;
class SFX {
  constructor(){
    this.ctx = null; this.master = null;
    this.enabled = true;
    this.activeVoices = 0;
    this.engineOsc = null; this.engineGain = null;
  }
  ensure(){
    if (this.ctx) return true;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      return true;
    } catch(e){ return false; }
  }
  setEnabled(v){
    this.enabled = v;
    if (this.master) this.master.gain.value = v ? 0.35 : 0;
    if (!v) this.stopEngine();
  }
  resume(){ if (!this.ctx) this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  voiceOk(){ return this.enabled && this.ctx && this.activeVoices < VOICE_LIMIT; }
  noiseBuffer(dur){
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  playNoise(dur, freqStart, freqEnd, gain){
    if (!this.voiceOk()) return;
    this.activeVoices++;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freqStart, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
    src.onended = () => { this.activeVoices--; };
  }
  playTone(freq, dur, type, gain, freqEnd){
    if (!this.voiceOk()) return;
    this.activeVoices++;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur);
    o.onended = () => { this.activeVoices--; };
  }
  shoot(player){ this.playTone(player ? 520 : 380, 0.08, 'square', 0.15, 120); this.playNoise(0.06, 4000, 800, 0.12); }
  ricochet(){ this.playTone(900, 0.05, 'triangle', 0.1, 500); }
  explosion(big){
    this.playNoise(big ? 0.6 : 0.3, big ? 900 : 1600, 60, big ? 0.5 : 0.3);
    this.playTone(big ? 70 : 110, big ? 0.5 : 0.25, 'sawtooth', 0.25, 30);
  }
  bonus(){ const n = [523, 659, 784, 1047]; n.forEach((f, i) => setTimeout(() => this.playTone(f, 0.12, 'square', 0.18), i * 70)); }
  spawn(){ this.playTone(220, 0.15, 'sawtooth', 0.08, 440); }
  bonusDrop(){ this.playTone(660, 0.2, 'triangle', 0.15, 990); }
  playerDeath(){ this.playNoise(0.7, 1200, 60, 0.5); this.playTone(180, 0.6, 'sawtooth', 0.3, 40); }
  baseDestroyed(){ this.playNoise(1.2, 700, 40, 0.7); this.playTone(90, 1.1, 'sawtooth', 0.4, 25); }
  levelWin(){ const n = [392, 523, 659, 784, 659, 784, 1047]; n.forEach((f, i) => setTimeout(() => this.playTone(f, 0.16, 'square', 0.2), i * 130)); }
  startEngine(){
    if (!this.enabled || !this.ctx || this.engineOsc) return;
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineGain = ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain.gain.value = 0.05;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  setEngine(on){
    if (!this.ctx) return;
    if (on && !this.engineOsc) this.startEngine();
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.05);
    if (!on && this.engineOsc && this.engineGain){
      const o = this.engineOsc;
      setTimeout(() => { try { o.stop(); } catch(e){} }, 200);
      this.engineOsc = null;
    }
  }
  stopEngine(){ this.setEngine(false); }
  playTheme(){
    if (!this.enabled || !this.ctx) return;
    const notes = [
      [164.8, 1], [164.8, 1], [196, 1], [220, 1],
      [246.9, 1], [220, 1], [196, 1], [164.8, 1],
      [146.8, 1], [164.8, 1], [196, 1], [220, 2],
      [164.8, 1], [196, 1], [220, 1], [246.9, 1],
      [261.6, 1], [246.9, 1], [220, 1], [196, 1],
      [164.8, 2], [196, 1], [220, 1],
      [196, 1], [164.8, 1], [146.8, 2],
      [164.8, 3], [0, 1],
    ];
    let t = this.ctx.currentTime + 0.05;
    const beat = 0.21;
    for (const [f, len] of notes){
      if (f > 0){
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.12, t);
        g.gain.setValueAtTime(0.12, t + len * beat - 0.03);
        g.gain.linearRampToValueAtTime(0.001, t + len * beat);
        const o2 = this.ctx.createOscillator();
        o2.type = 'triangle'; o2.frequency.value = f / 2;
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.07, t);
        g2.gain.linearRampToValueAtTime(0.001, t + len * beat);
        o.connect(g); o2.connect(g2);
        g.connect(this.master); g2.connect(this.master);
        o.start(t); o.stop(t + len * beat);
        o2.start(t); o2.stop(t + len * beat);
      }
      t += len * beat;
    }
  }
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { SFX });
})();
