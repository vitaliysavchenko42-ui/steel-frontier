// Движок: состояние игры, шаг логики 60 Гц, коллизии, простое поведение врагов

import { GRID, CELL, ARENA, TANK, BULLET, T, DIR, DX, DY, PLAYER, ENEMY, solidTank } from './config.js';
import { buildDefaultMap, PLAYER_CELL, ENEMY_CELLS, BASE_CELL } from './level.js';

export function createTank(role, cellX, cellY, dir) {
  return {
    role, // 'player' | 'enemy'
    x: cellX * CELL,
    y: cellY * CELL,
    dir,
    alive: true,
    shield: 0,
    fireTimer: 0,
    // ИИ
    aiTimer: 0,
    aiTarget: 'player'
  };
}

export function createGame() {
  const game = {
    grid: buildDefaultMap(),
    tanks: [],
    bullets: [],
    particles: [],
    state: 'menu', // 'menu' | 'play' | 'over' | 'win'
    score: 0,
    lives: PLAYER.lives,
    level: 1,
    time: 0,
    spawnTimer: 1.5,
    spawned: 0,
    enemiesLeft: ENEMY.total,
    respawnTimer: 0,
    events: []
  };
  const p = createTank('player', PLAYER_CELL[0], PLAYER_CELL[1], DIR.UP);
  p.shield = 0;
  game.tanks.push(p);
  return game;
}

export function startGame(game) {
  game.grid = buildDefaultMap();
  game.bullets.length = 0;
  game.particles.length = 0;
  game.tanks.length = 0;
  const p = createTank('player', PLAYER_CELL[0], PLAYER_CELL[1], DIR.UP);
  p.shield = PLAYER.shieldTime;
  game.tanks.push(p);
  game.state = 'play';
  game.score = 0;
  game.lives = PLAYER.lives;
  game.time = 0;
  game.spawnTimer = 1.2;
  game.spawned = 0;
  game.enemiesLeft = ENEMY.total;
  game.respawnTimer = 0;
}

export function tileAt(game, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return T.STEEL; // за краем — как сталь
  return game.grid[gy * GRID + gx];
}

export function rectBlocked(game, x, y, w, h, self) {
  const x0 = Math.floor(x / CELL), y0 = Math.floor(y / CELL);
  const x1 = Math.floor((x + w - 0.01) / CELL), y1 = Math.floor((y + h - 0.01) / CELL);
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return true;
      if (solidTank(game.grid[gy * GRID + gx])) return true;
    }
  }
  for (const t of game.tanks) {
    if (t === self || !t.alive) continue;
    if (x < t.x + TANK && x + w > t.x && y < t.y + TANK && y + h > t.y) return true;
  }
  return false;
}

const snapTo = (v) => Math.round(v / 8) * 8;

export function tryMove(game, tank, dir, dist) {
  if (dir !== tank.dir) {
    // поворот: выравнивание по полусетке, если это не зажимает в стену
    const sx = (dir === DIR.LEFT || dir === DIR.RIGHT) ? snapTo(tank.x) : tank.x;
    const sy = (dir === DIR.UP || dir === DIR.DOWN) ? snapTo(tank.y) : tank.y;
    if (!rectBlocked(game, sx, sy, TANK, TANK, tank)) { tank.x = sx; tank.y = sy; }
    tank.dir = dir;
  }
  let moved = false, rem = dist;
  while (rem > 0.0001) {
    const d = Math.min(2, rem);
    const nx = tank.x + DX[dir] * d, ny = tank.y + DY[dir] * d;
    if (rectBlocked(game, nx, ny, TANK, TANK, tank)) break;
    tank.x = nx; tank.y = ny; moved = true; rem -= d;
  }
  return moved;
}

export function fire(game, tank, speed, color) {
  if (!tank.alive || tank.fireTimer > 0) return false;
  tank.fireTimer = tank.role === 'player' ? PLAYER.fireCooldown : ENEMY.fireCooldown;
  const cx = tank.x + TANK / 2, cy = tank.y + TANK / 2;
  const bx = cx - BULLET / 2 + DX[tank.dir] * (TANK / 2);
  const by = cy - BULLET / 2 + DY[tank.dir] * (TANK / 2);
  game.bullets.push({ x: bx, y: by, dir: tank.dir, speed, from: tank, color, alive: true });
  game.events.push({ type: 'shot', role: tank.role });
  return true;
}

function boom(game, x, y, big) {
  const n = big ? 18 : 8;
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * (big ? 130 : 80),
      vy: (Math.random() - 0.5) * (big ? 130 : 80),
      life: big ? 0.7 : 0.4, max: big ? 0.7 : 0.4,
      color: Math.random() < 0.5 ? '#ffb340' : '#ff5b2a',
      size: big ? 4 : 3
    });
  }
}

function killTank(game, t) {
  t.alive = false;
  boom(game, t.x + TANK / 2, t.y + TANK / 2, t.role === 'player');
  game.events.push({ type: 'boom', role: t.role });
  if (t.role === 'player') {
    game.lives -= 1;
    if (game.lives > 0) game.respawnTimer = PLAYER.respawnTime;
    else game.state = 'over';
  } else {
    game.score += ENEMY.score;
    game.enemiesLeft -= 1;
    if (game.enemiesLeft <= 0 && game.tanks.filter((x) => x.role === 'enemy' && x.alive).length === 0) {
      game.state = 'win';
    }
  }
}

function damageTile(game, gx, gy) {
  const t = tileAt(game, gx, gy);
  if (t === T.BRICK) {
    game.grid[gy * GRID + gx] = T.EMPTY;
    game.events.push({ type: 'brick' });
    return true;
  }
  return false;
}

function stepBullets(game, dt) {
  for (const b of game.bullets) {
    if (!b.alive) continue;
    b.x += DX[b.dir] * b.speed * dt;
    b.y += DY[b.dir] * b.speed * dt;
    // за краем поля
    if (b.x < 0 || b.y < 0 || b.x + BULLET > ARENA || b.y + BULLET > ARENA) { b.alive = false; continue; }
    // тайлы
    const x0 = Math.floor(b.x / CELL), y0 = Math.floor(b.y / CELL);
    const x1 = Math.floor((b.x + BULLET - 0.01) / CELL), y1 = Math.floor((b.y + BULLET - 0.01) / CELL);
    let hit = false;
    for (let gy = y0; gy <= y1 && !hit; gy++) {
      for (let gx = x0; gx <= x1 && !hit; gx++) {
        const t = game.grid[gy * GRID + gx];
        if (t === T.BASE) { b.alive = false; hit = true; game.events.push({ type: 'basehit' }); game.state = 'over'; boom(game, b.x + 8, b.y + 8, true); }
        else if (t === T.BRICK) { damageTile(game, gx, gy); b.alive = false; hit = true; }
        else if (t === T.STEEL || t === T.WALL) { b.alive = false; hit = true; game.events.push({ type: 'clank' }); }
      }
    }
    if (hit) continue;
    // танки
    for (const t of game.tanks) {
      if (!t.alive || t === b.from) continue;
      if (b.x < t.x + TANK && b.x + BULLET > t.x && b.y < t.y + TANK && b.y + BULLET > t.y) {
        b.alive = false;
        if (t.shield <= 0) killTank(game, t);
        else game.events.push({ type: 'clank' });
        break;
      }
    }
  }
  let w = 0;
  for (const b of game.bullets) if (b.alive) game.bullets[w++] = b;
  game.bullets.length = w;
}

// --- ИИ врага: движение к цели (игрок или база), объезд, стрельба ---
function aiUpdate(game, e, dt) {
  e.aiTimer -= dt;
  if (e.aiTimer <= 0) {
    e.aiTimer = 1 + Math.random() * 1.6;
    e.aiTarget = Math.random() < 0.6 ? 'player' : 'base';
  }
  const player = game.tanks[0];
  const tx = e.aiTarget === 'base' ? (BASE_CELL[0] + 1) * CELL : player.x + TANK / 2;
  const ty = e.aiTarget === 'base' ? (BASE_CELL[1] + 1) * CELL : player.y + TANK / 2;
  const ex = e.x + TANK / 2, ey = e.y + TANK / 2;
  const ddx = tx - ex, ddy = ty - ey;

  const candidates = [];
  if (Math.abs(ddx) >= Math.abs(ddy)) {
    candidates.push(ddx > 0 ? DIR.RIGHT : DIR.LEFT);
    candidates.push(ddy > 0 ? DIR.DOWN : DIR.UP);
  } else {
    candidates.push(ddy > 0 ? DIR.DOWN : DIR.UP);
    candidates.push(ddx > 0 ? DIR.RIGHT : DIR.LEFT);
  }
  const dirs = [0, 1, 2, 3].filter((d) => d !== candidates[0] && d !== candidates[1]);
  if (Math.random() < 0.25) candidates.push(dirs[Math.floor(Math.random() * dirs.length)]);

  for (const d of candidates) {
    if (tryMove(game, e, d, ENEMY.speed * dt)) break;
  }
  // Стрельба по кулдауну с вероятностью, чтобы не спамили очередями
  if (e.fireTimer <= 0 && Math.random() < 0.35) fire(game, e, ENEMY.bulletSpeed, '#ff7040');
}

function stepSpawn(game, dt) {
  if (game.spawned >= ENEMY.total) return;
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  const aliveEnemies = game.tanks.filter((t) => t.role === 'enemy' && t.alive).length;
  if (aliveEnemies >= ENEMY.maxOn) { game.spawnTimer = 0.5; return; }
  const shuffled = ENEMY_CELLS.slice().sort(() => Math.random() - 0.5);
  for (const [cx, cy] of shuffled) {
    if (!rectBlocked(game, cx * CELL, cy * CELL, TANK, TANK, null)) {
      game.tanks.push(createTank('enemy', cx, cy, DIR.DOWN));
      game.spawned += 1;
      game.spawnTimer = ENEMY.spawnInterval;
      return;
    }
  }
  game.spawnTimer = 0.5;
}

export function step(game, input, dt) {
  if (game.state !== 'play') return;
  game.time += dt;
  game.events.length = 0;

  const player = game.tanks[0];

  // Возрождение игрока
  if (!player.alive) {
    game.respawnTimer -= dt;
    if (game.respawnTimer <= 0 && game.lives > 0) {
      player.alive = true;
      player.x = PLAYER_CELL[0] * CELL; player.y = PLAYER_CELL[1] * CELL;
      player.dir = DIR.UP;
      player.shield = PLAYER.shieldTime;
      game.events.push({ type: 'respawn' });
    }
  }

  if (player.alive) {
    player.fireTimer -= dt;
    if (player.shield > 0) player.shield -= dt;
    if (input.wantMove) tryMove(game, player, input.dir, PLAYER.speed * dt);
    if (input.fire && player.fireTimer <= 0) fire(game, player, PLAYER.bulletSpeed, '#ffe890');
  }

  for (const t of game.tanks) {
    if (t.role === 'enemy' && t.alive) {
      t.fireTimer -= dt;
      aiUpdate(game, t, dt);
    }
  }

  stepSpawn(game, dt);
  stepBullets(game, dt);

  // частицы
  let pw = 0;
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life > 0) game.particles[pw++] = p;
  }
  game.particles.length = pw;
}
