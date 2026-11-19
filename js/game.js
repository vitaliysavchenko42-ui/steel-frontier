"use strict";
const C = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./constants') : window.__TANKS__;
const { ENEMY_TYPES, enemyBudget, ENEMY_CELLS, PLAYER_CELL, BASE_CELL, FLAG, cellPx, DIR } = C;
const { Engine } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./engine') : window.__TANKS__;
const { EnemyAI } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./ai') : window.__TANKS__;
const { makeRng } = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./rng') : window.__TANKS__;
const MapGen = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./mapgen') : window.__TANKS__.MapGen;

const BONUS_TYPES = ['grenade','helmet','star','shovel','tank','clock'];
const SPAWN_INTERVAL = 10; // секунд между гибелью врага и появлением замены
const BONUS_LIFE = 30;     // сколько секунд бонус живёт на поле
// разные «подходы» к штабу — враги не едут колонной друг за другом
const APPROACHES = [[6,11],[5,10],[7,10],[4,11],[8,11],[6,9]];

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
    const m = MapGen.generateMap(this.level);
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
    const approach = APPROACHES[Math.floor(this.rng.next() * APPROACHES.length)];
    const ai = new EnemyAI(this.engine, tank, BASE_CELL, { fireMul: this.budget.fireMul, approach });
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
            // взрыв на месте каждого врага, снесённого гранатой
            this.explosions.push({ x: 16 + t.x + 16, y: 56 + t.y + 16, t0: this.time, dur: 0.8, big: true, seed: Math.random() * 6 });
          }
        }
        this.onSound('explosion', true);
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

if (typeof module !== 'undefined') module.exports = { Game, BONUS_TYPES };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { Game, BONUS_TYPES });
