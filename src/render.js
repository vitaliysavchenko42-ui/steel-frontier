// Рендер v4: тени, свечение пуль, трещины кирпича, мягкая вода, фактура пола

import { GRID, CELL, ARENA, BULLET, T, DIR, BONUS_LIST } from './config.js?v=4';
import { BASE_CELL } from './level.js?v=3';

const BRICK_A = '#c06a3a', BRICK_B = '#9a4a28', MORTAR = '#6b3020';
const STEEL_L = '#e4e9ef', STEEL_M = '#a9b2bd', STEEL_D = '#67707e';
const WATER_A = '#1f5f96', WATER_B = '#4d94d4', WATER_C = '#8ec6ec';
const FOREST_A = '#265426', FOREST_B = '#3d8238', FOREST_C = '#63b054';
const FLOOR_A = '#3a3a30', FLOOR_B = '#42423a';
const WALL_D = '#3d3d46', WALL_L = '#8f8f99';

const TYPE_COLORS = {
  player: { body: '#5c7a48', dark: '#3f5631', light: '#84ab66', turret: '#a9cd8b' },
  basic:  { body: '#96683f', dark: '#6b4a2a', light: '#c08e5c', turret: '#dcb083' },
  fast:   { body: '#b3a13e', dark: '#7f7122', light: '#d8c862', turret: '#ece194' },
  fire:   { body: '#c25a30', dark: '#8c3c1c', light: '#e88a5c', turret: '#f4b183' },
  armor:  { body: '#5f7a8a', dark: '#405666', light: '#90aebd', turret: '#b9d0da' },
  boss:   { body: '#8a2828', dark: '#571616', light: '#c05040', turret: '#e8846c' }
};

function drawFloorTile(ctx, gx, gy) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = (gx + gy) % 2 === 0 ? FLOOR_A : FLOOR_B;
  ctx.fillRect(x, y, CELL, CELL);
  if ((gx * 7 + gy * 13) % 5 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(x + 3, y + 9, 3, 2);
    ctx.fillRect(x + 10, y + 4, 2, 2);
  }
}

function drawBrickTile(ctx, gx, gy, cracked) {
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
  if (cracked) {
    ctx.strokeStyle = 'rgba(26,12,6,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 1);
    ctx.lineTo(x + 5, y + 6);
    ctx.lineTo(x + 2, y + 10);
    ctx.lineTo(x + 6, y + 15);
    ctx.moveTo(x + 13, y + 2);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x + 13, y + 14);
    ctx.stroke();
  }
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
  const w1 = Math.sin(time * 1.6 + gx * 0.9 + gy * 0.6);
  const w2 = Math.sin(time * 1.6 + gx * 0.9 + gy * 0.6 + 2.1);
  ctx.fillStyle = WATER_B;
  ctx.fillRect(x, y + 4 + w1 * 2, CELL, 2);
  ctx.fillStyle = WATER_C;
  ctx.fillRect(x, y + 10 + w2 * 2, CELL, 1.5);
}

function drawForestTile(ctx, gx, gy, time) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = FOREST_A;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = FOREST_B;
  ctx.fillRect(x + 1, y + 2, 6, 4);
  ctx.fillRect(x + 9, y + 8, 5, 4);
  if (Math.sin(time * 2 + gx * 2.1 + gy * 1.7) > 0.2) {
    ctx.fillStyle = FOREST_C;
    ctx.fillRect(x + 3, y + 1, 3, 3);
    ctx.fillRect(x + 10, y + 9, 3, 3);
  }
}

function drawWallTile(ctx, gx, gy) {
  const x = gx * CELL, y = gy * CELL;
  ctx.fillStyle = WALL_D;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = WALL_L;
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = WALL_D;
  ctx.fillRect(x + 7, y, 2, CELL);
  ctx.fillRect(x, y + 7, CELL, 2);
}

function drawBase(ctx, time, dead) {
  const x = BASE_CELL[0] * CELL, y = BASE_CELL[1] * CELL, s = 32;
  ctx.fillStyle = '#2a1c1a';
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = '#442a24';
  ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
  if (dead) {
    ctx.fillStyle = '#5a3a34';
    ctx.fillRect(x + 6, y + 6, s - 12, s - 12);
    return;
  }
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
  ctx.strokeStyle = '#e8c840';
  ctx.lineWidth = 1;
  ctx.stroke();
  const glow = 0.16 + 0.1 * Math.sin(time * 3);
  ctx.fillStyle = 'rgba(255,140,110,' + glow.toFixed(3) + ')';
  ctx.fillRect(x, y, s, s);
}

function drawTank(ctx, t, time) {
  const s = t.size;
  const x = Math.round(t.x), y = Math.round(t.y);
  let c = t.role === 'player' ? TYPE_COLORS.player : (TYPE_COLORS[t.type] || TYPE_COLORS.basic);
  const carrier = t.flash && Math.floor(time * 8) % 2 === 0;
  if (carrier) c = { body: '#d43a2a', dark: '#8a1c14', light: '#ff705c', turret: '#ffb8a4' };
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 2, y + 3, s, s);
  const hw = Math.max(3, Math.round(s * 0.12));
  ctx.fillStyle = c.dark;
  ctx.fillRect(x, y, s, hw);
  ctx.fillRect(x, y + s - hw, s, hw);
  ctx.fillStyle = c.light;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 2 + i * Math.round(s / 4), y + Math.round(hw / 4), Math.max(2, Math.round(s / 8)), Math.max(1, Math.round(hw / 2)));
    ctx.fillRect(x + Math.round(s / 4) * (3 - i) + 2, y + s - hw - 1, Math.max(2, Math.round(s / 8)), Math.max(1, Math.round(hw / 2)));
  }
  ctx.fillStyle = c.body;
  ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, s - hw * 2 + 2);
  ctx.fillStyle = c.dark;
  ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, 2);
  ctx.fillStyle = c.turret;
  ctx.fillRect(x + Math.round(s * 0.34), y + Math.round(s * 0.34), Math.round(s * 0.32), Math.round(s * 0.32));
  ctx.fillStyle = c.dark;
  const bl = Math.round(s * 0.32), bw = Math.max(3, Math.round(s * 0.12));
  const bx0 = x + Math.round(s / 2) - Math.round(bw / 2), by0 = y + Math.round(s / 2) - Math.round(bw / 2);
  if (t.dir === DIR.UP) ctx.fillRect(bx0, y + 1, bw, bl);
  else if (t.dir === DIR.DOWN) ctx.fillRect(bx0, y + s - bl - 1, bw, bl);
  else if (t.dir === DIR.LEFT) ctx.fillRect(x + 1, by0, bl, bw);
  else ctx.fillRect(x + s - bl - 1, by0, bl, bw);
  if (t.role === 'enemy' && t.maxHp > 1 && t.hp < t.maxHp) {
    ctx.fillStyle = 'rgba(20,16,12,0.35)';
    ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, s - hw * 2 + 2);
    if (Math.floor(time * 6) % 2 === 0 && t.hitT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, s - hw * 2 + 2);
    }
  }
  if (t.type === 'boss') {
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - 4, y - 8, s + 8, 4);
    ctx.fillStyle = '#d43a2a';
    ctx.fillRect(x - 4, y - 8, Math.round((s + 8) * (t.hp / t.maxHp)), 4);
  }
  if (t.shield > 0) {
    const blink = t.shield < 0.7 ? (Math.floor(time * 12) % 2 === 0) : true;
    if (blink) {
      ctx.strokeStyle = '#8fd4ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1.5, y - 1.5, s + 3, s + 3);
    }
  }
}

function drawBullet(ctx, b) {
  const x = Math.round(b.x), y = Math.round(b.y);
  const c = b.color || '#ffe890';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = c;
  ctx.fillRect(x + 2, y + 2, BULLET - 4, BULLET - 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c;
  ctx.fillRect(x + 4, y + 4, BULLET - 8, BULLET - 8);
  ctx.fillStyle = '#fff8d0';
  ctx.fillRect(x + 6, y + 6, 4, 4);
}

function drawBonus(ctx, b, time) {
  if (b.ttl < 3 && Math.floor(time * 6) % 2 === 0) return;
  const x = b.x, y = b.y, s = 16;
  ctx.fillStyle = '#181820';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = '#d8d2be';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  const cx = x + 8, cy = y + 8;
  if (b.type === 'star') {
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? 6 : 2.6;
      const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  } else if (b.type === 'helmet') {
    ctx.fillStyle = '#7ec8ff';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 6, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 6, cy + 2, 12, 2);
  } else if (b.type === 'clock') {
    ctx.fillStyle = '#efe9d8';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a3a42';
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + 3, cy);
    ctx.stroke();
  } else if (b.type === 'grenade') {
    ctx.fillStyle = '#6ab05a';
    ctx.beginPath(); ctx.arc(cx, cy + 1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(cx - 1, cy - 7, 3, 3);
  } else if (b.type === 'shovel') {
    ctx.fillStyle = '#9a6630';
    ctx.fillRect(cx - 1, cy - 6, 2, 7);
    ctx.fillStyle = '#c2c8d2';
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 1); ctx.lineTo(cx + 3, cy + 1); ctx.lineTo(cx, cy + 7);
    ctx.closePath(); ctx.fill();
  } else if (b.type === 'tank') {
    ctx.fillStyle = '#5c7a48';
    ctx.fillRect(cx - 6, cy - 3, 12, 7);
    ctx.fillRect(cx - 1, cy - 6, 2, 4);
    ctx.fillStyle = '#3f5631';
    ctx.fillRect(cx - 7, cy + 4, 14, 2);
  }
}

export function draw(ctx, game) {
  const time = game.time;
  ctx.clearRect(0, 0, ARENA, ARENA);
  if (!game.grid) return;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const i = gy * GRID + gx;
      const t = game.grid[i];
      drawFloorTile(ctx, gx, gy);
      if (t === T.BRICK) drawBrickTile(ctx, gx, gy, !!game.brickHp && game.brickHp[i] === 1);
      else if (t === T.STEEL) drawSteelTile(ctx, gx, gy);
      else if (t === T.WATER) drawWaterTile(ctx, gx, gy, time);
      else if (t === T.WALL) drawWallTile(ctx, gx, gy);
    }
  }
  drawBase(ctx, time, game.state === 'over');
  for (const b of game.bonuses) drawBonus(ctx, b, time);
  for (const t of game.tanks) if (t.alive) drawTank(ctx, t, time);
  for (const b of game.bullets) drawBullet(ctx, b);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (game.grid[gy * GRID + gx] === T.FOREST) drawForestTile(ctx, gx, gy, time);
    }
  }
  for (const p of game.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    ctx.globalAlpha = 1;
  }
  if (game.freezeT > 0) {
    ctx.fillStyle = 'rgba(143,212,255,0.10)';
    ctx.fillRect(0, 0, ARENA, ARENA);
  }
}
