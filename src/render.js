// Рендер v2: типизированные враги, бонусы, процедурный пиксель-арт

import { GRID, CELL, ARENA, T, DIR, BONUS_LIST } from './config.js?v=2';
import { BASE_CELL } from './level.js?v=2';

const BRICK_A = '#a8552c', BRICK_B = '#8a3b22', MORTAR = '#5a2415';
const STEEL_L = '#c8ced6', STEEL_M = '#9aa0a8', STEEL_D = '#5f666e';
const WATER_A = '#1d4e7a', WATER_B = '#2f6ea8';
const FOREST_A = '#1e4d1e', FOREST_B = '#2f7a2f';
const FLOOR_A = '#14141a', FLOOR_B = '#17171e';

const TYPE_COLORS = {
  basic: { body: '#9a5a40', dark: '#6e3c28', light: '#c07a55', turret: '#d9a06a' },
  fast:  { body: '#b0a03a', dark: '#7a6d20', light: '#d4c45e', turret: '#e8dd86' },
  fire:  { body: '#c05030', dark: '#8a3018', light: '#e07a4a', turret: '#f0a070' },
  armor: { body: '#5a7080', dark: '#3c4c58', light: '#88a0b0', turret: '#b0c4d0' },
  boss:  { body: '#7a2020', dark: '#4c1212', light: '#b04838', turret: '#e07050' }
};

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
  const glow = 0.2 + 0.12 * Math.sin(time * 3);
  ctx.fillStyle = 'rgba(255,110,90,' + glow.toFixed(3) + ')';
  ctx.fillRect(x, y, s, s);
}

function drawTank(ctx, t, time) {
  const s = t.size;
  const x = Math.round(t.x), y = Math.round(t.y);
  let c = TYPE_COLORS[t.type] || TYPE_COLORS.basic;
  const carrier = t.flash && Math.floor(time * 8) % 2 === 0;
  if (carrier) c = { body: '#d42a2a', dark: '#8a1414', light: '#ff6a5a', turret: '#ffb0a0' };
  const hw = Math.max(3, Math.round(s * 0.12));
  // гусеницы
  ctx.fillStyle = c.dark;
  ctx.fillRect(x, y, s, hw);
  ctx.fillRect(x, y + s - hw, s, hw);
  const anim = Math.floor(time * 10) % 2 === 0;
  ctx.fillStyle = c.light;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 2 + i * Math.round(s / 4), y + Math.round(hw / 4), Math.max(2, Math.round(s / 8)), Math.max(1, Math.round(hw / 2)));
    ctx.fillRect(x + Math.round(s / 4) * (3 - i) + 2, y + s - hw - 1, Math.max(2, Math.round(s / 8)), Math.max(1, Math.round(hw / 2)));
  }
  // корпус
  ctx.fillStyle = c.body;
  ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, s - hw * 2 + 2);
  ctx.fillStyle = c.dark;
  ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, 2);
  // башня
  ctx.fillStyle = c.turret;
  ctx.fillRect(x + Math.round(s * 0.34), y + Math.round(s * 0.34), Math.round(s * 0.32), Math.round(s * 0.32));
  ctx.fillStyle = c.dark;
  const bl = Math.round(s * 0.32), bw = Math.max(3, Math.round(s * 0.12));
  const bx0 = x + Math.round(s / 2) - Math.round(bw / 2), by0 = y + Math.round(s / 2) - Math.round(bw / 2);
  if (t.dir === DIR.UP) ctx.fillRect(bx0, y + 1, bw, bl);
  else if (t.dir === DIR.DOWN) ctx.fillRect(bx0, y + s - bl - 1, bw, bl);
  else if (t.dir === DIR.LEFT) ctx.fillRect(x + 1, by0, bl, bw);
  else ctx.fillRect(x + s - bl - 1, by0, bl, bw);
  // урон у брони
  if (t.role === 'enemy' && t.maxHp > 1 && t.hp < t.maxHp) {
    ctx.fillStyle = 'rgba(10,10,14,0.35)';
    ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, s - hw * 2 + 2);
    if (Math.floor(time * 6) % 2 === 0 && t.hitT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + hw - 1, y + hw - 1, s - hw * 2 + 2, s - hw * 2 + 2);
    }
  }
  // полоска HP босса
  if (t.type === 'boss') {
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - 4, y - 8, s + 8, 4);
    ctx.fillStyle = '#d42a2a';
    ctx.fillRect(x - 4, y - 8, Math.round((s + 8) * (t.hp / t.maxHp)), 4);
  }
  // щит
  if (t.shield > 0) {
    const blink = t.shield < 0.7 ? (Math.floor(time * 12) % 2 === 0) : true;
    if (blink) {
      ctx.strokeStyle = '#7ec8ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1.5, y - 1.5, s + 3, s + 3);
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

function drawBonus(ctx, b, time) {
  if (b.ttl < 3 && Math.floor(time * 6) % 2 === 0) return;
  const x = b.x, y = b.y, s = 16;
  ctx.fillStyle = '#101018';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = '#cfc6a8';
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
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#33333c';
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + 3, cy);
    ctx.stroke();
  } else if (b.type === 'grenade') {
    ctx.fillStyle = '#5aa05a';
    ctx.beginPath(); ctx.arc(cx, cy + 1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(cx - 1, cy - 7, 3, 3);
  } else if (b.type === 'shovel') {
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(cx - 1, cy - 6, 2, 7);
    ctx.fillStyle = '#b0b4bc';
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 1); ctx.lineTo(cx + 3, cy + 1); ctx.lineTo(cx, cy + 7);
    ctx.closePath(); ctx.fill();
  } else if (b.type === 'tank') {
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(cx - 6, cy - 3, 12, 7);
    ctx.fillRect(cx - 1, cy - 6, 2, 4);
    ctx.fillStyle = '#2f5426';
    ctx.fillRect(cx - 7, cy + 4, 14, 2);
  }
}

export function draw(ctx, game) {
  const time = game.time;
  ctx.clearRect(0, 0, ARENA, ARENA);
  if (!game.grid) return;
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
  // заморозка — холодная вуаль
  if (game.freezeT > 0) {
    ctx.fillStyle = 'rgba(126,200,255,0.10)';
    ctx.fillRect(0, 0, ARENA, ARENA);
  }
}
