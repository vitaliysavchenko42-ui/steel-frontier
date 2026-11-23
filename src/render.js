// Рендер: оригинальный процедурный пиксель-арт, без внешних ассетов

import { GRID, CELL, ARENA, TANK, BULLET, T, DIR, BASE_CELL } from './config.js';

const BRICK_A = '#a8552c', BRICK_B = '#8a3b22', MORTAR = '#5a2415';
const STEEL_L = '#c8ced6', STEEL_M = '#9aa0a8', STEEL_D = '#5f666e';
const WATER_A = '#1d4e7a', WATER_B = '#2f6ea8';
const FOREST_A = '#1e4d1e', FOREST_B = '#2f7a2f';
const FLOOR_A = '#14141a', FLOOR_B = '#17171e';

function drawFloorTile(ctx, gx, gy) {
  ctx.fillStyle = (gx + gy) % 2 === 0 ? FLOOR_A : FLOOR_B;
  ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
}

function drawBrickTile(ctx, gx, gy) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = MORTAR;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = BRICK_A;
  ctx.fillRect(x, y, 7, 7);
  ctx.fillRect(x + 9, y, 7, 7);
  ctx.fillRect(x + 4, y + 9, 7, 7);
  ctx.fillStyle = BRICK_B;
  ctx.fillRect(x, y + 5, 7, 2);
  ctx.fillRect(x + 9, y + 5, 7, 2);
  ctx.fillRect(x + 4, y + 14, 7, 2);
}

function drawSteelTile(ctx, gx, gy) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = STEEL_M;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = STEEL_L;
  ctx.fillRect(x, y, CELL, 2);
  ctx.fillRect(x, y, 2, CELL);
  ctx.fillStyle = STEEL_D;
  ctx.fillRect(x, y + CELL - 2, CELL, 2);
  ctx.fillRect(x + CELL - 2, y, 2, CELL);
  ctx.fillRect(x + 6, y + 6, 4, 4);
}

function drawWaterTile(ctx, gx, gy, time) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = WATER_A;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = WATER_B;
  const ph = Math.sin(time * 2.2 + (gx * 0.8 + gy * 1.3)) > 0 ? 2 : 5;
  ctx.fillRect(x, y + ph, CELL, 2);
  ctx.fillRect(x, y + 11, CELL, 2);
}

function drawForestTile(ctx, gx, gy, time) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = FOREST_A;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = FOREST_B;
  if (Math.sin(time * 3 + gx * 2 + gy) > 0.4) {
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + 9, y + 7, 4, 4);
  }
  ctx.fillRect(x + 4, y + 9, 3, 3);
  ctx.fillRect(x + 10, y + 3, 3, 3);
}

function drawWallTile(ctx, gx, gy) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = '#3d3d44';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = '#7d7d84';
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = '#3d3d44';
  ctx.fillRect(x + 7, y, 2, CELL);
  ctx.fillRect(x, y + 7, CELL, 2);
}

function drawBase(ctx, time, dead) {
  const x = BASE_CELL[0] * CELL, y = BASE_CELL[1] * CELL, s = 32;
  ctx.fillStyle = '#241414';
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = '#3a1d1d';
  ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
  if (dead) {
    ctx.fillStyle = '#4a2424';
    ctx.fillRect(x + 6, y + 6, s - 12, s - 12);
    return;
  }
  // Оригинальная эмблема: красная звезда на тёмном подиуме
  const cx = x + s / 2, cy = y + s / 2, R = 11;
  ctx.fillStyle = '#d42a2a';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? R : R * 0.45;
    const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  const glow = 0.25 + 0.15 * Math.sin(time * 3);
  ctx.fillStyle = 'rgba(255,110,90,' + glow.toFixed(3) + ')';
  ctx.fillRect(x, y, s, s);
}

function drawTank(ctx, t, time) {
  const x = Math.round(t.x), y = Math.round(t.y);
  const colors = t.role === 'player'
    ? { body: '#4a7a3a', dark: '#2f5426', light: '#6fa653', turret: '#8fbf76' }
    : { body: '#9a5a40', dark: '#6e3c28', light: '#c07a55', turret: '#d9a06a' };
  // гусеницы
  ctx.fillStyle = colors.dark;
  ctx.fillRect(x, y, TANK, 4);
  ctx.fillRect(x, y + TANK - 4, TANK, 4);
  const anim = Math.floor(time * 10) % 2 === 0;
  ctx.fillStyle = colors.light;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 2 + i * 8, y + (anim ? 1 : 2), 4, 2);
    ctx.fillRect(x + 6 - i * 8, y + TANK - 3 - (anim ? 0 : 1), 4, 2);
  }
  // корпус
  ctx.fillStyle = colors.body;
  ctx.fillRect(x + 3, y + 3, TANK - 6, TANK - 6);
  ctx.fillStyle = colors.dark;
  ctx.fillRect(x + 3, y + 3, TANK - 6, 2);
  // башня и ствол по направлению
  ctx.fillStyle = colors.turret;
  ctx.fillRect(x + 11, y + 11, 10, 10);
  ctx.fillStyle = colors.dark;
  const d = t.dir;
  if (d === DIR.UP) ctx.fillRect(x + 14, y + 2, 4, 10);
  else if (d === DIR.DOWN) ctx.fillRect(x + 14, y + 20, 4, 10);
  else if (d === DIR.LEFT) ctx.fillRect(x + 2, y + 14, 10, 4);
  else ctx.fillRect(x + 20, y + 14, 10, 4);
  // щит
  if (t.shield > 0) {
    const blink = t.shield < 0.7 ? (Math.floor(time * 12) % 2 === 0) : true;
    if (blink) {
      ctx.strokeStyle = '#7ec8ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1.5, y - 1.5, TANK + 3, TANK + 3);
    }
  }
}

function drawBullet(ctx, b) {
  const x = Math.round(b.x), y = Math.round(b.y);
  ctx.fillStyle = '#ffe890';
  ctx.fillRect(x + 4, y + 4, BULLET - 8, BULLET - 8);
  ctx.fillStyle = '#fff8d0';
  ctx.fillRect(x + 6, y + 6, 4, 4);
}

export function draw(ctx, game) {
  const time = game.time;
  ctx.clearRect(0, 0, ARENA, ARENA);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const t = game.grid[gy * GRID + gx];
      drawFloorTile(ctx, gx, gy);
      if (t === T.BRICK) drawBrickTile(ctx, gx, gy);
      else if (t === T.STEEL) drawSteelTile(ctx, gx, gy);
      else if (t === T.WATER) drawWaterTile(ctx, gx, gy, time);
      else if (t === T.WALL) drawWallTile(ctx, gx, gy);
    }
  }
  drawBase(ctx, time, game.state === 'over');
  for (const t of game.tanks) if (t.alive) drawTank(ctx, t, time);
  for (const b of game.bullets) drawBullet(ctx, b);
  // лес поверх танков
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (game.grid[gy * GRID + gx] === T.FOREST) drawForestTile(ctx, gx, gy, time);
    }
  }
  // частицы
  for (const p of game.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    ctx.globalAlpha = 1;
  }
}
