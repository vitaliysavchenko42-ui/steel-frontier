// Движок v2: типы врагов, апгрейды, бонусы, эффекты, A*-навигация

import { GRID, CELL, ARENA, TANK, BULLET, T, DIR, DX, DY, PLAYER, ENEMY_TYPES, BONUS, BONUS_TTL, BONUS_DROP, BONUS_SCORE, LEVEL_SCORE, solidTank } from './config.js?v=2';
import { buildLevel, getCfg, compositionFor, PLAYER_CELL, ENEMY_CELLS, BASE_CELL, BASE_RING, LAST_CAMPAIGN_LEVEL } from './level.js?v=2';

export function createTank(role, type, cellX, cellY, dir, flash) {
  const st = role === 'player' ? null : ENEMY_TYPES[type];
  const size = st ? st.size : TANK;
  return {
    role, type: role === 'player' ? 'player' : type,
    size,
    x: cellX * CELL, y: cellY * CELL, dir,
    alive: true,
    hp: st ? st.hp : 1,
    maxHp: st ? st.hp : 1,
    shield: 0,
    fireTimer: 0.6,
    hitT: 0,
    flash: !!flash,
    // ИИ
    aiTimer: 0,
    aiTarget: 'player',
    path: null,
    pathT: 0,
    stuckT: 0,
    lastX: cellX * CELL,
    lastY: cellY * CELL,
    burst: 0,
    burstT: 0
  };
}

export function createGame() {
  return {
    grid: null,
    tanks: [], bullets: [], particles: [], bonuses: [],
    state: 'menu', mode: 'campaign',
    score: 0, lives: PLAYER.lives, power: 1,
    level: 1, time: 0,
    queue: [], spawned: 0, enemiesLeft: 0,
    maxOn: 4, spawnInterval: 3, spawnTimer: 1.5,
    freezeT: 0, shovelT: 0, shovelSaved: null,
    respawnTimer: 0, winT: 0,
    events: []
  };
}

export function startLevel(game, num, mode) {
  const built = buildLevel(num);
  game.grid = built.grid;
  game.mode = mode;
  game.level = num;
  game.tanks.length = 0;
  game.bullets.length = 0;
  game.particles.length = 0;
  game.bonuses.length = 0;
  const p = createTank('player', null, PLAYER_CELL[0], PLAYER_CELL[1], DIR.UP, false);
  p.shield = PLAYER.shieldTime;
  game.tanks.push(p);
  game.state = 'play';
  game.time = 0;
  if (!game.power) game.power = 1;
  if (!game.lives) game.lives = PLAYER.lives;
  game.queue = compositionFor(built.cfg);
  game.spawned = 0;
  game.enemiesLeft = game.queue.length;
  game.maxOn = built.cfg.maxOn;
  game.spawnInterval = built.cfg.interval;
  game.spawnTimer = 1.2;
  game.freezeT = 0;
  game.shovelT = 0;
  game.shovelSaved = null;
  game.respawnTimer = 0;
  game.winT = 0;
  game.nextFired = false;
  game.events.length = 0;
}

export function startCampaign(game) {
  game.score = 0;
  game.lives = PLAYER.lives;
  game.power = 1;
  startLevel(game, 1, 'campaign');
}

export function tileAt(game, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return T.STEEL;
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
    if (x < t.x + t.size && x + w > t.x && y < t.y + t.size && y + h > t.y) return true;
  }
  return false;
}

const snapTo = (v) => Math.round(v / 8) * 8;

export function tryMove(game, tank, dir, dist) {
  if (dir !== tank.dir) {
    const sx = (dir === DIR.LEFT || dir === DIR.RIGHT) ? snapTo(tank.x) : tank.x;
    const sy = (dir === DIR.UP || dir === DIR.DOWN) ? snapTo(tank.y) : tank.y;
    if (!rectBlocked(game, sx, sy, tank.size, tank.size, tank)) { tank.x = sx; tank.y = sy; }
    tank.dir = dir;
  }
  let moved = false, rem = dist;
  while (rem > 0.0001) {
    const d = Math.min(2, rem);
    const nx = tank.x + DX[dir] * d, ny = tank.y + DY[dir] * d;
    if (rectBlocked(game, nx, ny, tank.size, tank.size, tank)) break;
    tank.x = nx; tank.y = ny; moved = true; rem -= d;
  }
  return moved;
}

function playerBulletLimit(game, tank) {
  let n = 0;
  for (const b of game.bullets) if (b.alive && b.from === tank) n++;
  return n;
}

export function fire(game, tank) {
  if (!tank.alive || tank.fireTimer > 0) return false;
  if (tank.role === 'player') {
    if (playerBulletLimit(game, tank) >= PLAYER.maxBullets[game.power - 1]) return false;
    tank.fireTimer = PLAYER.fireCooldown;
    spawnBullet(game, tank, PLAYER.bulletSpeed[game.power - 1], '#ffe890', PLAYER.breaksSteel[game.power - 1]);
  } else {
    const st = ENEMY_TYPES[tank.type];
    tank.fireTimer = st.fireRate;
    spawnBullet(game, tank, st.bulletSpeed, '#ff7040', false);
  }
  return true;
}

function spawnBullet(game, tank, speed, color, breaksSteel) {
  const cx = tank.x + tank.size / 2, cy = tank.y + tank.size / 2;
  const half = tank.size / 2;
  const bx = cx - BULLET / 2 + DX[tank.dir] * half;
  const by = cy - BULLET / 2 + DY[tank.dir] * half;
  game.bullets.push({ x: bx, y: by, dir: tank.dir, speed, from: tank, color, alive: true, breaksSteel: !!breaksSteel });
  game.events.push({ type: 'shot', role: tank.role });
}

function boom(game, x, y, big) {
  const n = big ? 20 : 9;
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * (big ? 150 : 85),
      vy: (Math.random() - 0.5) * (big ? 150 : 85),
      life: big ? 0.7 : 0.4, max: big ? 0.7 : 0.4,
      color: Math.random() < 0.5 ? '#ffb340' : '#ff5b2a',
      size: big ? 4 : 3
    });
  }
}

function spawnBonus(game) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const gx = 1 + Math.floor(Math.random() * (GRID - 2));
    const gy = 3 + Math.floor(Math.random() * (GRID - 6));
    if (game.grid[gy * GRID + gx] !== T.EMPTY) continue;
    const x = gx * CELL, y = gy * CELL;
    let busy = false;
    for (const t of game.tanks) if (t.alive && x < t.x + t.size && x + 16 > t.x && y < t.y + t.size && y + 16 > t.y) busy = true;
    if (busy) continue;
    const type = BONUS_LIST[Math.floor(Math.random() * BONUS_LIST.length)];
    game.bonuses.push({ x, y, type, ttl: BONUS_TTL });
    return;
  }
}

function applyBonus(game, type) {
  game.score += BONUS_SCORE;
  game.events.push({ type: 'bonus', bonus: type });
  const player = game.tanks[0];
  if (type === 'star') {
    game.power = Math.min(4, game.power + 1);
  } else if (type === 'helmet') {
    player.shield = BONUS.helmet.time;
  } else if (type === 'clock') {
    game.freezeT = BONUS.clock.time;
  } else if (type === 'grenade') {
    for (const t of game.tanks.slice()) {
      if (t.role === 'enemy' && t.alive) killTank(game, t, true);
    }
  } else if (type === 'shovel') {
    game.shovelSaved = [];
    for (const [cx, cy] of BASE_RING) {
      const idx = cy * GRID + cx;
      game.shovelSaved.push([idx, game.grid[idx]]);
      game.grid[idx] = T.STEEL;
    }
    game.shovelT = BONUS.shovel.time;
  } else if (type === 'tank') {
    game.lives += 1;
  }
}

function killTank(game, t, noBonus) {
  t.alive = false;
  boom(game, t.x + t.size / 2, t.y + t.size / 2, t.type === 'boss' || t.role === 'player');
  game.events.push({ type: 'boom', role: t.role, kind: t.type });
  if (t.role === 'player') {
    game.power = 1;
    game.lives -= 1;
    if (game.lives > 0) game.respawnTimer = PLAYER.respawnTime;
    else game.state = 'over';
  } else {
    game.score += ENEMY_TYPES[t.type].score;
    game.enemiesLeft -= 1;
    if (t.flash && !noBonus && Math.random() < BONUS_DROP) spawnBonus(game);
    if (game.enemiesLeft <= 0 && !game.tanks.some((x) => x.role === 'enemy' && x.alive)) {
      game.state = 'win';
      game.score += LEVEL_SCORE;
      game.winT = 2;
    }
  }
}

function stepBullets(game, dt) {
  for (const b of game.bullets) {
    if (!b.alive) continue;
    b.x += DX[b.dir] * b.speed * dt;
    b.y += DY[b.dir] * b.speed * dt;
    if (b.x < 0 || b.y < 0 || b.x + BULLET > ARENA || b.y + BULLET > ARENA) { b.alive = false; continue; }
    const x0 = Math.floor(b.x / CELL), y0 = Math.floor(b.y / CELL);
    const x1 = Math.floor((b.x + BULLET - 0.01) / CELL), y1 = Math.floor((b.y + BULLET - 0.01) / CELL);
    let hit = false;
    for (let gy = y0; gy <= y1 && !hit; gy++) {
      for (let gx = x0; gx <= x1 && !hit; gx++) {
        if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
        const t = game.grid[gy * GRID + gx];
        if (t === T.BASE) { b.alive = false; hit = true; game.events.push({ type: 'basehit' }); game.state = 'over'; boom(game, b.x + 8, b.y + 8, true); }
        else if (t === T.BRICK) { game.grid[gy * GRID + gx] = T.EMPTY; game.events.push({ type: 'brick' }); b.alive = false; hit = true; boom(game, b.x + 8, b.y + 8, false); }
        else if (t === T.STEEL) {
          if (b.breaksSteel) { game.grid[gy * GRID + gx] = T.EMPTY; game.events.push({ type: 'steelbreak' }); }
          else game.events.push({ type: 'clank' });
          b.alive = false; hit = true;
        }
        else if (t === T.WALL) { game.events.push({ type: 'clank' }); b.alive = false; hit = true; }
      }
    }
    if (hit) continue;
    for (const t of game.tanks) {
      if (!t.alive || t === b.from) continue;
      if (b.x < t.x + t.size && b.x + BULLET > t.x && b.y < t.y + t.size && b.y + BULLET > t.y) {
        b.alive = false;
        if (t.shield > 0) { game.events.push({ type: 'clank' }); break; }
        if (t.role === 'enemy') {
          t.hp -= 1;
          t.hitT = 0.15;
          if (t.hp <= 0) killTank(game, t, false);
          else game.events.push({ type: 'hit' });
        } else {
          killTank(game, t, false);
        }
        break;
      }
    }
  }
  let w = 0;
  for (const b of game.bullets) if (b.alive) game.bullets[w++] = b;
  game.bullets.length = w;
}

// --- A* по сетке для врагов ---
export function astarPath(game, sx, sy, gx, gy) {
  const N = GRID * GRID;
  const idxOf = (x, y) => y * GRID + x;
  if (sx === gx && sy === gy) return [];
  const blocked = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (solidTank(game.grid[i])) blocked[i] = 1;
  for (const t of game.tanks) {
    if (!t.alive || t.role === 'player') continue; // другие враги — мягкие препятствия, игрок нет
    const x0 = Math.max(0, Math.floor(t.x / CELL)), y0 = Math.max(0, Math.floor(t.y / CELL));
    const x1 = Math.min(GRID - 1, Math.floor((t.x + t.size - 1) / CELL));
    const y1 = Math.min(GRID - 1, Math.floor((t.y + t.size - 1) / CELL));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked[idxOf(x, y)] = 1;
  }
  const startI = idxOf(sx, sy), goalI = idxOf(gx, gy);
  if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID || gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return null;
  blocked[goalI] = 0; // цель может стоять на клетке игрока
  const gCost = new Int32Array(N).fill(-1);
  const from = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const hx = (i) => Math.abs((i % GRID) - gx) + Math.abs(Math.floor(i / GRID) - gy);
  const open = [startI];
  gCost[startI] = 0;
  while (open.length) {
    let bi = 0, bf = gCost[open[0]] + hx(open[0]);
    for (let i = 1; i < open.length; i++) {
      const f = gCost[open[i]] + hx(open[i]);
      if (f < bf) { bf = f; bi = i; }
    }
    const cur = open.splice(bi, 1)[0];
    if (cur === goalI) {
      const path = [];
      let c = cur;
      while (c !== startI && c !== -1) { path.push([c % GRID, Math.floor(c / GRID)]); c = from[c]; }
      path.reverse();
      return path;
    }
    closed[cur] = 1;
    const cx = cur % GRID, cy = Math.floor(cur / GRID);
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      const ni = idxOf(nx, ny);
      if (closed[ni] || blocked[ni]) continue;
      if (gCost[ni] === -1 || gCost[cur] + 1 < gCost[ni]) {
        gCost[ni] = gCost[cur] + 1;
        from[ni] = cur;
        if (open.indexOf(ni) === -1) open.push(ni);
      }
    }
  }
  return null;
}

function cellOf(v) { return Math.min(GRID - 1, Math.max(0, Math.floor((v + 8) / CELL))); }

function aiUpdate(game, e, dt) {
  const st = ENEMY_TYPES[e.type];
  const player = game.tanks[0];
  e.aiTimer -= dt;
  if (e.aiTimer <= 0) {
    e.aiTimer = 1.5 + Math.random() * 1.5;
    e.aiTarget = Math.random() < 0.6 ? 'player' : 'base';
  }
  const isBoss = e.type === 'boss';
  const tx = e.aiTarget === 'base' ? (BASE_CELL[0] + 1) * CELL : player.x + player.size / 2;
  const ty = e.aiTarget === 'base' ? (BASE_CELL[1] + 1) * CELL : player.y + player.size / 2;

  if (!isBoss) {
    e.pathT -= dt;
    if (!e.path || e.pathT <= 0) {
      const goalX = e.aiTarget === 'base' ? BASE_CELL[0] : cellOf(tx);
      const goalY = e.aiTarget === 'base' ? BASE_CELL[1] - 2 : cellOf(ty);
      e.path = astarPath(game, cellOf(e.x), cellOf(e.y), goalX, goalY);
      e.pathT = 1.2 + Math.random() * 0.8;
      if (e.path && e.path.length) {
        // первый шаг пути = собственная клетка, срезаем
        const p0 = e.path[0];
        if (p0[0] === cellOf(e.x) && p0[1] === cellOf(e.y)) e.path.shift();
      }
    }
  }

  let movedOk = false;
  if (e.path && e.path.length) {
    const [px, py] = e.path[0];
    const cx = px * CELL, cy = py * CELL;
    const ddx = cx - e.x, ddy = cy - e.y;
    const dir = Math.abs(ddx) >= Math.abs(ddy) ? (ddx > 0 ? DIR.RIGHT : DIR.LEFT) : (ddy > 0 ? DIR.DOWN : DIR.UP);
    movedOk = tryMove(game, e, dir, st.speed * dt);
    if (Math.abs(cx - e.x) < 1.2 && Math.abs(cy - e.y) < 1.2) e.path.shift();
    if (!movedOk) e.path = null;
  } else {
    // fallback: жадное движение к цели
    const ddx = tx - (e.x + e.size / 2), ddy = ty - (e.y + e.size / 2);
    const candidates = [];
    if (Math.abs(ddx) >= Math.abs(ddy)) {
      candidates.push(ddx > 0 ? DIR.RIGHT : DIR.LEFT);
      candidates.push(ddy > 0 ? DIR.DOWN : DIR.UP);
    } else {
      candidates.push(ddy > 0 ? DIR.DOWN : DIR.UP);
      candidates.push(ddx > 0 ? DIR.RIGHT : DIR.LEFT);
    }
    for (const d of candidates) {
      if (tryMove(game, e, d, st.speed * dt)) { movedOk = true; break; }
    }
    if (!movedOk) {
      const d = Math.floor(Math.random() * 4);
      tryMove(game, e, d, st.speed * dt);
    }
  }

  // детектор застревания
  if (Math.abs(e.x - e.lastX) < 0.1 && Math.abs(e.y - e.lastY) < 0.1) {
    e.stuckT += dt;
    if (e.stuckT > 1.5) {
      e.stuckT = 0;
      e.path = null;
      e.aiTimer = 0;
      tryMove(game, e, Math.floor(Math.random() * 4), st.speed * dt * 4);
    }
  } else {
    e.stuckT = 0;
    e.lastX = e.x; e.lastY = e.y;
  }

  // стрельба
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    const aligned = Math.abs((e.x + e.size / 2) - tx) < 14 || Math.abs((e.y + e.size / 2) - ty) < 14;
    if (aligned || Math.random() < 0.2) {
      if (isBoss) { e.burst = 3; e.burstT = 0; e.fireTimer = st.fireRate; }
      else fire(game, e);
    }
  }
  if (isBoss && e.burst > 0) {
    e.burstT -= dt;
    if (e.burstT <= 0) {
      e.burst -= 1;
      e.burstT = 0.12;
      if (e.alive) fireOnce(game, e, st.bulletSpeed, '#ff9060');
    }
  }
}

function fireOnce(game, tank, speed, color) {
  if (!tank.alive) return;
  spawnBullet(game, tank, speed, color, false);
}

function stepSpawn(game, dt) {
  if (game.spawned >= game.queue.length) return;
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  const aliveEnemies = game.tanks.filter((t) => t.role === 'enemy' && t.alive).length;
  if (aliveEnemies >= game.maxOn) { game.spawnTimer = 0.5; return; }
  const bossSpawn = game.queue[game.spawned] === 'boss';
  const cells = bossSpawn ? [[6, 1], [12, 1], [18, 1]] : ENEMY_CELLS.slice();
  const shuffled = cells.sort(() => Math.random() - 0.5);
  for (const [cx, cy] of shuffled) {
    const type = game.queue[game.spawned];
    const size = ENEMY_TYPES[type].size;
    if (!rectBlocked(game, cx * CELL, cy * CELL, size, size, null)) {
      const flash = game.spawned % 4 === 3;
      game.tanks.push(createTank('enemy', type, cx, cy, DIR.DOWN, flash));
      game.spawned += 1;
      game.spawnTimer = game.spawnInterval;
      return;
    }
  }
  game.spawnTimer = 0.5;
}

function stepBonuses(game, dt) {
  const player = game.tanks[0];
  let w = 0;
  for (const b of game.bonuses) {
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    if (player.alive && b.x < player.x + TANK && b.x + 16 > player.x && b.y < player.y + TANK && b.y + 16 > player.y) {
      applyBonus(game, b.type);
      continue;
    }
    game.bonuses[w++] = b;
  }
  game.bonuses.length = w;
}

export function step(game, input, dt) {
  if (game.state === 'win') {
    game.time += dt;
    game.winT -= dt;
    updateParticles(game, dt);
    if (game.winT <= 0 && !game.nextFired) { game.nextFired = true; game.events.push({ type: 'nextlevel' }); }
    return;
  }
  if (game.state !== 'play') return;
  game.time += dt;
  game.events.length = 0;

  const player = game.tanks[0];

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

  if (game.freezeT > 0) game.freezeT -= dt;
  if (game.shovelT > 0) {
    game.shovelT -= dt;
    if (game.shovelT <= 0 && game.shovelSaved) {
      for (const [idx, t] of game.shovelSaved) game.grid[idx] = t;
      game.shovelSaved = null;
    }
  }

  if (player.alive) {
    player.fireTimer -= dt;
    if (player.shield > 0) player.shield -= dt;
    if (input.wantMove) tryMove(game, player, input.dir, PLAYER.speed * dt);
    if (input.fire) fire(game, player);
  }

  for (const t of game.tanks) {
    if (t.role === 'enemy' && t.alive) {
      t.hitT -= dt;
      if (game.freezeT > 0) continue; // заморозка: враги стоят
      aiUpdate(game, t, dt);
    }
  }

  stepSpawn(game, dt);
  stepBullets(game, dt);
  stepBonuses(game, dt);
  updateParticles(game, dt);
}

function updateParticles(game, dt) {
  let pw = 0;
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life > 0) game.particles[pw++] = p;
  }
  game.particles.length = pw;
}
