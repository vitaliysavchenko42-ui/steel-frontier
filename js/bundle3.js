/* ===== render.js ===== */
(function(){
"use strict";
const C = window.__TANKS__;
const R = C;
const { CELL, TANK, COLS, ROWS, W, H, T, DIRV, FLAG: FLAGT, enemyBudget } = C;
const OFF_X = 16, OFF_Y = 56, HUD_H = 48;
const CANVAS_W = W + OFF_X * 2;
const CANVAS_H = H + OFF_Y + OFF_X;
const ENEMY_COLOR = { basic: 'grey', fast: 'cyan', sniper: 'gold', armor: 'green' };

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawTank(ctx, cx, cy, dir, style, t){
  const s = TANK;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dir * Math.PI / 2);
  const palette = style === 'player'
    ? { body: '#4d7a3a', body2: '#3a5c2b', tracks: '#2b2b2b', barrel: '#8a8a8a', accent: '#c8b06a' }
    : style === 'grey'   ? { body: '#8d8d8d', body2: '#6f6f6f', tracks: '#2b2b2b', barrel: '#b0b0b0', accent: '#4a4a4a' }
    : style === 'cyan'   ? { body: '#4fa8b8', body2: '#3a7d8a', tracks: '#2b2b2b', barrel: '#a0d0d8', accent: '#2a5a64' }
    : style === 'gold'   ? { body: '#c8a832', body2: '#9a7d20', tracks: '#2b2b2b', barrel: '#e8d070', accent: '#5a4810' }
    :                      { body: '#5a7d4a', body2: '#43602f', tracks: '#2b2b2b', barrel: '#9ab878', accent: '#2c4020' };
  ctx.fillStyle = palette.tracks;
  ctx.fillRect(-s/2, -s/2 + 2, 7, s - 4);
  ctx.fillRect(s/2 - 7, -s/2 + 2, 7, s - 4);
  ctx.fillStyle = '#555';
  for (let i = 0; i < 4; i++){
    ctx.fillRect(-s/2 + 1.5, -s/2 + 5 + i * 7, 4, 4);
    ctx.fillRect(s/2 - 5.5, -s/2 + 5 + i * 7, 4, 4);
  }
  ctx.fillStyle = palette.body;
  ctx.fillRect(-s/2 + 7, -s/2 + 3, s - 14, s - 6);
  ctx.fillStyle = palette.body2;
  ctx.beginPath();
  ctx.moveTo(-s/2 + 7, -s/2 + 3);
  ctx.lineTo(s/2 - 7, -s/2 + 3);
  ctx.lineTo(s/2 - 4, -s/2 + 10);
  ctx.lineTo(-s/2 + 4, -s/2 + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.body2;
  roundRect(ctx, -7, -7, 14, 14, 4); ctx.fill();
  ctx.fillStyle = palette.body;
  roundRect(ctx, -5.5, -5.5, 11, 11, 3.5); ctx.fill();
  ctx.fillStyle = palette.barrel;
  ctx.fillRect(-1.5, -TANK/2 - 3, 3, TANK/2 - 1);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(-2.5, 1, 5, 4);
  ctx.restore();
}
function drawBrickTile(ctx, x, y, t){
  ctx.fillStyle = '#8a4a2a';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = '#6a3620';
  ctx.fillRect(x, y + CELL/2 - 1, CELL, 1.5);
  ctx.fillRect(x + (t % 2 ? CELL/2 : 0), y, 1, CELL/2);
  ctx.fillRect(x + (t % 2 ? 0 : CELL/2), y + CELL/2, 1, CELL/2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, CELL, 1);
}
function drawSteelTile(ctx, x, y){
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = '#7d838b';
  ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
  ctx.fillStyle = '#b8bec6';
  ctx.fillRect(x, y, CELL, 2);
  ctx.fillStyle = '#565b62';
  ctx.fillRect(x + 3, y + 3, 2, 2);
  ctx.fillRect(x + CELL - 5, y + CELL - 5, 2, 2);
}
function drawWaterTile(ctx, x, y, time){
  ctx.fillStyle = '#1d4e7a';
  ctx.fillRect(x, y, CELL, CELL);
  const ph = Math.sin(time * 3 + x * 0.4 + y * 0.4);
  ctx.fillStyle = '#2d6a9e';
  ctx.fillRect(x, y + 4 + ph * 2, CELL, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y + 10 + ph, CELL, 1);
}
function drawForestTile(ctx, x, y){
  ctx.fillStyle = '#1f5c2a';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = '#2f7d3a';
  for (const [dx, dy] of [[2,3],[9,2],[4,8],[11,7],[6,12],[12,12],[2,13]]){
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 3.2, 0, 7);
    ctx.fill();
  }
}
function drawIceTile(ctx, x, y){
  ctx.fillStyle = '#b8d8e8';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + CELL/2, y + CELL/2);
  ctx.moveTo(x + CELL - 3, y + 3); ctx.lineTo(x + 4, y + CELL - 4);
  ctx.stroke();
}
function drawFlag(ctx, x, y, time){
  ctx.fillStyle = '#7d6a4a';
  ctx.fillRect(x + 4, y + 6, 4, 26);
  ctx.fillStyle = '#d8b020';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 6);
  ctx.lineTo(x + 26, y + 11 + Math.sin(time * 4) * 1.5);
  ctx.lineTo(x + 8, y + 17);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a82020';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 11);
  ctx.lineTo(x + 22, y + 13.5);
  ctx.lineTo(x + 8, y + 16);
  ctx.closePath(); ctx.fill();
}
function drawBullet(ctx, b, player){
  const cx = OFF_X + b.x + b.w/2, cy = OFF_Y + b.y + b.h/2;
  const [dx, dy] = DIRV[b.dir];
  ctx.fillStyle = player ? 'rgba(255,232,144,0.35)' : 'rgba(255,112,64,0.35)';
  ctx.beginPath();
  ctx.arc(cx - dx * 9, cy - dy * 9, 2.4, 0, 7); ctx.fill();
  ctx.arc(cx - dx * 4.5, cy - dy * 4.5, 3.2, 0, 7); ctx.fill();
  ctx.fillStyle = player ? '#ffe890' : '#ff7040';
  ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.6, 0, 7); ctx.fill();
}
function drawSpawnStar(ctx, cx, cy, r, a){
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r*0.25, cy - r*0.25);
  ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r*0.25, cy + r*0.25);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r*0.25, cy + r*0.25);
  ctx.lineTo(cx - r, cy); ctx.lineTo(cx - r*0.25, cy - r*0.25);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = a * 0.55;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, 7); ctx.fill();
  ctx.restore();
}
function drawSparkle(ctx, sp, time){
  const p = (time - sp.t0) / sp.dur;
  if (p < 0 || p > 1) return;
  const a = 1 - p;
  ctx.strokeStyle = 'rgba(255,240,180,' + a + ')';
  ctx.lineWidth = 2;
  const r = 2 + p * 7;
  ctx.beginPath();
  ctx.moveTo(sp.x - r, sp.y); ctx.lineTo(sp.x + r, sp.y);
  ctx.moveTo(sp.x, sp.y - r); ctx.lineTo(sp.x, sp.y + r);
  ctx.stroke();
}
const BONUS_ICONS = {
  grenade: '#9ccc3d', helmet: '#4fc3f7', star: '#ffe082',
  shovel: '#cfd8dc', tank: '#66bb6a', clock: '#f5f5f5',
};
function drawBonus(ctx, b, time){
  const age = time - (b.t0 === undefined ? 0 : b.t0);
  if (age > 27) { if ((time * 8) % 1 < 0.5) return; }      // финальное быстрое мигание
  else if (age > 22) { if ((time * 4) % 1 < 0.5) return; } // предсмертное мигание
  const bob = Math.sin(time * 5) * 2;
  const x = OFF_X + b.x, y = OFF_Y + b.y + bob;
  const cx = x + b.w/2, cy = y + b.h/2;
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  const col = BONUS_ICONS[b.type] || '#ffe082';
  ctx.fillStyle = 'rgba(255,220,90,' + (0.08 + 0.13 * pulse) + ')';
  ctx.beginPath(); ctx.arc(cx, cy, 20 + pulse * 4, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,235,150,' + (0.13 + 0.17 * pulse) + ')';
  ctx.beginPath(); ctx.arc(cx, cy, 13.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,170,0.95)';
  for (let i = 0; i < 3; i++){
    const a2 = time * 2.6 + i * 2.1;
    const rr2 = 15.5 + Math.sin(time * 6 + i * 1.9) * 2.5;
    const sx = cx + Math.cos(a2) * rr2;
    const sy = cy + Math.sin(a2 * 0.83) * rr2 * 0.75;
    const tw = 1.1 + 1.2 * (0.5 + 0.5 * Math.sin(time * 9 + i * 2.4));
    ctx.beginPath(); ctx.arc(sx, sy, tw, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(14,14,20,0.92)';
  roundRect(ctx, x, y, b.w, b.h, 5); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, b.w - 2, b.h - 2, 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  roundRect(ctx, x + 3, y + 3, b.w - 6, b.h - 6, 2.5); ctx.stroke();
  ctx.fillStyle = col;
  switch(b.type){
    case 'grenade':
      ctx.beginPath(); ctx.arc(cx, cy + 1, 5.2, 0, 7); ctx.fill();
      ctx.fillRect(cx - 1.5, cy - 8.5, 4, 4.5);
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(cx - 1, cy - 10, 2.5, 2.5);
      break;
    case 'helmet':
      ctx.beginPath(); ctx.arc(cx, cy + 2, 6.2, Math.PI, 0); ctx.fill();
      ctx.fillRect(cx - 7.5, cy + 1, 15, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(cx - 2, cy - 1.5, 2.2, 0, 7); ctx.fill();
      break;
    case 'star':
      ctx.beginPath();
      for (let i = 0; i < 10; i++){
        const r = i % 2 ? 3.2 : 7.4;
        const a = -Math.PI/2 + i * Math.PI/5;
        ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, 7); ctx.fill();
      break;
    case 'shovel':
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(cx - 1.5, cy - 7, 3, 7.5);
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath(); ctx.moveTo(cx - 4.5, cy + 0.5); ctx.lineTo(cx + 5.5, cy + 0.5); ctx.lineTo(cx + 0.5, cy + 8.5); ctx.closePath(); ctx.fill();
      break;
    case 'tank':
      ctx.fillRect(cx - 6.5, cy - 3, 13, 6);
      ctx.fillRect(cx - 2.5, cy - 6.5, 6, 4.5);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cx - 5, cy - 1.5, 10, 1.5);
      break;
    case 'clock':
      ctx.beginPath(); ctx.arc(cx, cy, 6.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 4.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 3.4, cy); ctx.stroke();
      break;
  }
}
function drawExplosion(ctx, ex, time){
  const p = (time - ex.t0) / ex.dur;
  if (p < 0 || p > 1) return;
  const a = 1 - p;
  const r = 8 + p * (ex.big ? 36 : 20);
  // яркая вспышка в начале
  if (p < 0.35){
    const fa = 1 - p / 0.35;
    ctx.fillStyle = 'rgba(255,255,215,' + (fa * 0.95) + ')';
    ctx.beginPath(); ctx.arc(ex.x, ex.y, r * (0.55 + 0.45 * (1 - p / 0.35)), 0, 7); ctx.fill();
  }
  // огненные лепестки
  const petals = ex.big ? 10 : 6;
  for (let i = 0; i < petals; i++){
    const ang = i * Math.PI / (petals / 2) + ex.seed;
    const rr = r * (0.45 + 0.55 * Math.sin(time * 22 + i * 2.1));
    ctx.fillStyle = 'rgba(255,' + Math.floor(120 + 110 * (1 - p)) + ',40,' + (a * 0.9) + ')';
    ctx.beginPath();
    ctx.arc(ex.x + Math.cos(ang) * rr * (0.3 + p), ex.y + Math.sin(ang) * rr * (0.3 + p), (4.5 * (1 - p) + 2) * (ex.big ? 1.2 : 1), 0, 7);
    ctx.fill();
  }
  // расширяющееся кольцо ударной волны
  ctx.strokeStyle = 'rgba(255,205,90,' + (a * 0.75) + ')';
  ctx.lineWidth = 3.5 * (1 - p) + 0.8;
  ctx.beginPath(); ctx.arc(ex.x, ex.y, r * 1.15, 0, 7); ctx.stroke();
  // осколки, разлетающиеся наружу
  const shards = ex.big ? 12 : 8;
  for (let i = 0; i < shards; i++){
    const ang = i * 2 * Math.PI / shards + ex.seed * 1.7;
    const dd = r * (0.85 + 0.45 * ((i * 37 % 10) / 10));
    const sx = ex.x + Math.cos(ang) * dd * (0.35 + 0.65 * p);
    const sy = ex.y + Math.sin(ang) * dd * (0.35 + 0.65 * p);
    ctx.fillStyle = 'rgba(255,' + Math.floor(130 + 70 * (1 - p)) + ',55,' + a + ')';
    ctx.beginPath(); ctx.arc(sx, sy, 2.4 * (1 - p) + 1, 0, 7); ctx.fill();
  }
}
function drawField(ctx, game, time){
  const tiles = game.engine.tiles;
  ctx.fillStyle = '#101014';
  ctx.fillRect(OFF_X, OFF_Y, W, H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
    const v = tiles[y][x];
    const px = OFF_X + x * CELL, py = OFF_Y + y * CELL;
    if (v === T.BRICK) drawBrickTile(ctx, px, py, x + y);
    else if (v === T.STEEL) drawSteelTile(ctx, px, py);
    else if (v === T.WATER) drawWaterTile(ctx, px, py, time);
    else if (v === T.ICE) drawIceTile(ctx, px, py);
    else if (v === T.FOREST) drawForestTile(ctx, px, py);
  }
  for (const b of game.engine.bonuses) drawBonus(ctx, b, time);
  const fx = OFF_X + FLAGT[0] * CELL, fy = OFF_Y + FLAGT[1] * CELL;
  if (tiles[FLAGT[1]][FLAGT[0]] === T.FLAG) drawFlag(ctx, fx, fy, time);
  else {
    ctx.fillStyle = '#555';
    ctx.fillRect(fx + 4, fy + 10, 24, 22);
    ctx.fillStyle = '#777';
    ctx.fillRect(fx + 8, fy + 14, 16, 12);
  }
  for (const t of game.engine.tanks){
    if (!t.alive) continue;
    drawTank(ctx, OFF_X + t.x + TANK/2, OFF_Y + t.y + TANK/2, t.dir,
      t.isPlayer ? 'player' : (t.elite && Math.sin(time * 12) > 0 ? 'gold' : (ENEMY_COLOR[t.type] || 'grey')), t);
    if (t.spawnFlash > 0){
      const a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * 16));
      drawSpawnStar(ctx, OFF_X + t.x + TANK/2, OFF_Y + t.y + TANK/2, 11 + 3 * Math.sin(time * 12), a);
    }
    if (t.shield > 0){
      const a = 0.4 + 0.3 * Math.sin(time * 10);
      ctx.strokeStyle = 'rgba(120,220,255,' + a + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(OFF_X + t.x + 16, OFF_Y + t.y + 16, 22, 0, 7); ctx.stroke();
    }
  }
  for (const b of game.engine.bullets) drawBullet(ctx, b, b.fromPlayer);
  for (const ex of game.explosions || []) drawExplosion(ctx, ex, time);
  for (const sp of game.sparkles || []) drawSparkle(ctx, sp, time);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (tiles[y][x] === T.FOREST) drawForestTile(ctx, OFF_X + x * CELL, OFF_Y + y * CELL);
}
function drawMiniTank(ctx, x, y, color){
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 5, y - 4, 3, 8); ctx.fillRect(x + 2, y - 4, 3, 8);
  ctx.fillStyle = color; ctx.fillRect(x - 2, y - 3, 4, 6);
  ctx.fillRect(x - 0.5, y - 7, 1.5, 4);
}
function drawMiniEnemy(ctx, x, y, color){
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x + 4, y + 4, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 3.5, y - 1, 1, 4);
}
function drawHUD(ctx, game, time){
  ctx.fillStyle = '#14141a';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = '#2a2a34';
  ctx.fillRect(0, HUD_H - 2, CANVAS_W, 2);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#e8e8f0';
  ctx.textBaseline = 'middle';
  ctx.fillText('УРОВЕНЬ ' + game.level, OFF_X, 18);
  ctx.fillText('СЧЁТ ' + game.engine.stats.score, OFF_X, 34);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText('ЖИЗНИ', CANVAS_W/2 - 40, 18);
  for (let i = 0; i < Math.min(6, game.lives); i++)
    drawMiniTank(ctx, CANVAS_W/2 - 40 + 8 + i * 20, 34, '#4d7a3a');
  const icons = Math.min(game.enemiesRemaining + game.enemiesOnField, 20);
  for (let i = 0; i < icons; i++){
    const col = i % 10, row = Math.floor(i / 10);
    drawMiniEnemy(ctx, CANVAS_W - 16 - (10 - col) * 14, 14 + row * 16, '#8d8d8d');
  }
  if (game.baseShovel > 0){
    ctx.fillStyle = '#e8c840';
    ctx.fillText('БЕТОН ' + Math.ceil(game.baseShovel), CANVAS_W/2 - 40, 34);
  }
  if (game.freezeTimer > 0){
    ctx.fillStyle = '#78c8e8';
    ctx.fillText('ФРИЗ ' + Math.ceil(game.freezeTimer), CANVAS_W/2 + 40, 34);
  }
}
function drawIntroTank(ctx, cx, cy, scale, time){
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(0, Math.sin(time * 2) * 2);
  ctx.fillStyle = '#222';
  ctx.fillRect(-52, 8, 104, 18);
  for (let i = 0; i < 5; i++){
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.arc(-42 + i * 21, 17, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(-42 + i * 21, 17, 4, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#3d5c30';
  ctx.beginPath();
  ctx.moveTo(-56, 8);
  ctx.lineTo(-30, -10);
  ctx.lineTo(52, -10);
  ctx.lineTo(56, 4);
  ctx.lineTo(40, 8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4d7a3a';
  ctx.fillRect(-52, -4, 100, 8);
  ctx.fillStyle = '#4d7a3a';
  ctx.beginPath();
  ctx.moveTo(-24, -10);
  ctx.lineTo(-16, -26);
  ctx.lineTo(18, -26);
  ctx.lineTo(26, -10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d5c30';
  ctx.fillRect(2, -30, 12, 5);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(24, -22, 34, 4.5);
  ctx.fillStyle = '#7d838b';
  ctx.fillRect(56, -23.5, 5, 7.5);
  ctx.fillStyle = '#c83030';
  ctx.save();
  ctx.translate(-2, -18);
  ctx.beginPath();
  for (let i = 0; i < 10; i++){
    const r = i % 2 ? 2.5 : 6;
    const a = -Math.PI/2 + i * Math.PI/5;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#2b2b2b';
  for (let i = 0; i < 5; i++) ctx.fillRect(-14 + i * 12, -6, 8, 2.5);
  ctx.restore();
}
function drawIntro(ctx, time, records){
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#0a0d18');
  grad.addColorStop(0.6, '#141a2c');
  grad.addColorStop(1, '#1a1220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < 60; i++){
    const sx = (i * 173) % CANVAS_W;
    const sy = ((i * 97) % (CANVAS_H * 0.55)) | 0;
    ctx.globalAlpha = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2 + i * 1.7));
    ctx.fillStyle = '#c8d4e8';
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.fillStyle = '#e8c840';
  ctx.fillText('СТАЛЬНОЙ РУБЕЖ', CANVAS_W/2, 84);
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#8a94a8';
  ctx.fillText('ТАНКОВАЯ АРКАДА · БЕСКОНЕЧНЫЙ ФРОНТ', CANVAS_W/2, 108);
  drawIntroTank(ctx, CANVAS_W/2, 250, 1.9, time);
  const beam = ctx.createLinearGradient(0, 330, 0, CANVAS_H);
  beam.addColorStop(0, 'rgba(232,200,64,0.10)');
  beam.addColorStop(1, 'rgba(232,200,64,0)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 330, CANVAS_W, CANVAS_H - 330);
  if (Math.sin(time * 4) > -0.2){
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText('НАЖМИТЕ ПРОБЕЛ ИЛИ КАСАНИЕ', CANVAS_W/2, 408);
  }
  if (records && records.length){
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#6a748c';
    ctx.fillText('РЕКОРД: ' + records[0].score + ' · УРОВЕНЬ ' + records[0].level, CANVAS_W/2, 434);
  }
  ctx.textAlign = 'left';
}
function drawMenu(ctx, menu, time){
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.fillStyle = '#e8c840';
  ctx.fillText('СТАЛЬНОЙ РУБЕЖ', CANVAS_W/2, 90);
  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = '#6a748c';
  ctx.fillText('ОДИН ТАНК. БЕСКОНЕЧНЫЙ ФРОНТ.', CANVAS_W/2, 116);
  for (let i = 0; i < menu.items.length; i++){
    const y = 190 + i * 42;
    if (i === menu.index){
      ctx.fillStyle = 'rgba(232,200,64,0.12)';
      ctx.fillRect(CANVAS_W/2 - 150, y - 16, 300, 28);
      ctx.fillStyle = '#e8c840';
      ctx.fillText('► ' + menu.items[i].label, CANVAS_W/2, y);
    } else {
      ctx.fillStyle = '#9aa4b8';
      ctx.fillText(menu.items[i].label, CANVAS_W/2, y);
    }
  }
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#4a5468';
  ctx.fillText('↑ ↓ — выбор · ПРОБЕЛ — подтвердить · P — пауза', CANVAS_W/2, CANVAS_H - 30);
  ctx.textAlign = 'left';
}
function drawLevelSelect(ctx, menu, time){
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillStyle = '#e8c840';
  ctx.fillText('ВЫБОР УРОВНЯ', CANVAS_W/2, 110);
  ctx.font = 'bold 72px "Courier New", monospace';
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(String(menu.level), CANVAS_W/2, 230);
  const b = enemyBudget(menu.level);
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#9aa4b8';
  ctx.fillText('ВРАГОВ: ' + b.total + ' · НА ПОЛЕ: ' + b.maxOn + ' · СКОРОСТЬ ×' + b.speedMul.toFixed(2), CANVAS_W/2, 280);
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = menu.level <= menu.maxUnlocked ? '#4a8a4a' : '#8a4a4a';
  ctx.fillText(menu.level <= menu.maxUnlocked ? 'ДОСТУПЕН' : 'ЗАКРЫТ — ПРОЙДИТЕ ПРЕДЫДУЩИЕ', CANVAS_W/2, 320);
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#4a5468';
  ctx.fillText('← → — уровень · ПРОБЕЛ — в бой · ESC — назад', CANVAS_W/2, CANVAS_H - 30);
  ctx.textAlign = 'left';
}
function drawStats(ctx, game){
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.fillStyle = '#4a8a4a';
  ctx.fillText('УРОВЕНЬ ' + game.level + ' ПРОЙДЕН', CANVAS_W/2, 120);
  ctx.font = '16px "Courier New", monospace';
  ctx.fillStyle = '#e8e8f0';
  const s = game.stats;
  ctx.fillText('СЧЁТ: ' + s.score, CANVAS_W/2, 190);
  ctx.fillText('УНИЧТОЖЕНО: ' + s.kills, CANVAS_W/2, 220);
  ctx.fillText('БОНУСЫ: ' + s.bonuses, CANVAS_W/2, 250);
  ctx.fillText('ВРЕМЯ: ' + Math.floor(s.time/60) + ':' + String(Math.floor(s.time%60)).padStart(2,'0'), CANVAS_W/2, 280);
  ctx.font = '13px "Courier New", monospace';
  if (Math.sin(Date.now() / 400) > 0){
    ctx.fillStyle = '#e8c840';
    ctx.fillText('ПРОБЕЛ — ДАЛЬШЕ', CANVAS_W/2, 360);
  }
  ctx.textAlign = 'left';
}
function drawGameover(ctx, game){
  ctx.fillStyle = 'rgba(8,8,12,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px "Courier New", monospace';
  ctx.fillStyle = '#c85050';
  ctx.fillText(game.gameoverReason === 'base' ? 'ШТАБ ПАЛ' : 'ТАНК ПОДБИТ', CANVAS_W/2, 150);
  ctx.font = '16px "Courier New", monospace';
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText('СЧЁТ: ' + game.engine.stats.score, CANVAS_W/2, 220);
  ctx.fillText('ДОСТИГНУТ УРОВЕНЬ: ' + game.level, CANVAS_W/2, 250);
  ctx.font = '13px "Courier New", monospace';
  if (Math.sin(Date.now() / 400) > 0){
    ctx.fillStyle = '#e8c840';
    ctx.fillText('ПРОБЕЛ — В МЕНЮ', CANVAS_W/2, 330);
  }
  ctx.textAlign = 'left';
}
function drawPause(ctx, time){
  ctx.fillStyle = 'rgba(8,8,12,0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText('ПАУЗА', CANVAS_W/2, CANVAS_H/2 - 10);
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#8a94a8';
  ctx.fillText('P — продолжить · ESC — в меню', CANVAS_W/2, CANVAS_H/2 + 22);
  ctx.textAlign = 'left';
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { RENDER: { drawTank, drawField, drawBonus, drawBullet, drawExplosion, drawHUD, drawIntro, drawMenu, drawLevelSelect, drawStats, drawGameover, drawPause, drawIntroTank, CANVAS_W, CANVAS_H, OFF_X, OFF_Y, ENEMY_COLOR } });
})();

/* ===== ui.js ===== */
(function(){
"use strict";
const C = window.__TANKS__;
const R = C.RENDER;
const CANVAS_W = R.CANVAS_W, CANVAS_H = R.CANVAS_H;
const LS_KEY = 'steel-frontier-records';
function loadRecords(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e){ return []; }
}
function saveRecord(rec){
  const recs = loadRecords();
  recs.push(rec);
  recs.sort((a, b) => b.score - a.score);
  localStorage.setItem(LS_KEY, JSON.stringify(recs.slice(0, 10)));
}
function maxUnlocked(){
  const r = loadRecords();
  return Math.max(1, ...r.map(x => (x.level || 1) + 1));
}
class UI {
  constructor(canvas, sfx){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = sfx;
    this.mode = 'intro';
    this.time = 0;
    this.menu = { items: [
      { label: 'ИГРАТЬ', action: 'play' },
      { label: 'ВЫБОР УРОВНЯ', action: 'select' },
      { label: 'ЗВУК: ВКЛ', action: 'sound' },
      { label: 'РЕКОРДЫ', action: 'records' },
    ], index: 0, level: 1, maxUnlocked: maxUnlocked(), recordsOpen: false };
    this.game = null;
    this.pendingStats = null;
  }
  startGame(level){
    const G = C.Game;
    this.game = new G(level, {
      onSound: (name) => { if (this.sfx[name]) this.sfx[name](); },
      onEvent: () => {},
    });
    this.mode = 'playing';
    if (this.sfx.ensure) this.sfx.ensure();
    if (this.sfx.resume) this.sfx.resume();
    if (this.sfx.playTheme) this.sfx.playTheme();
  }
  nextLevel(){
    const old = this.game;
    const score = old.engine.stats.score;
    const lives = old.lives;
    const power = old.playerPower;
    const level = old.level + 1;
    this.startGame(level);
    this.game.engine.stats.score = score;
    this.game.playerPower = power;
    this.game.lives = lives;
  }
  onKey(code, down){
    const sfx = this.sfx;
    const confirm = down && (code === 'Space' || code === 'Enter' || code === 'TouchStart');
    if (this.mode === 'intro'){
      if (confirm){ if (sfx.ensure) sfx.ensure(); if (sfx.resume) sfx.resume(); this.mode = 'menu'; if (sfx.playTheme) sfx.playTheme(); }
      return;
    }
    if (this.mode === 'menu'){
      if (down && (code === 'ArrowUp' || code === 'KeyW')) this.menu.index = (this.menu.index + this.menu.items.length - 1) % this.menu.items.length;
      else if (down && (code === 'ArrowDown' || code === 'KeyS')) this.menu.index = (this.menu.index + 1) % this.menu.items.length;
      else if (confirm){
        const a = this.menu.items[this.menu.index].action;
        if (a === 'play') this.startGame(this.menu.level || 1);
        else if (a === 'select') this.mode = 'levelSelect';
        else if (a === 'sound'){ this.sfx.setEnabled(!this.sfx.enabled); this.menu.items[2].label = 'ЗВУК: ' + (this.sfx.enabled ? 'ВКЛ' : 'ВЫКЛ'); }
        else if (a === 'records') this.menu.recordsOpen = !this.menu.recordsOpen;
      }
      return;
    }
    if (this.mode === 'levelSelect'){
      if (down && code === 'ArrowLeft') this.menu.level = Math.max(1, this.menu.level - 1);
      else if (down && code === 'ArrowRight') this.menu.level = Math.min(999, this.menu.level + 1);
      else if (confirm && this.menu.level <= this.menu.maxUnlocked) this.startGame(this.menu.level);
      else if (down && code === 'Escape') this.mode = 'menu';
      return;
    }
    if (this.mode === 'playing'){
      if (down && code === 'KeyP') this.mode = 'paused';
      else if (down && code === 'Escape') this.mode = 'paused';
      return;
    }
    if (this.mode === 'paused' && down && (code === 'KeyP' || code === 'Escape')){
      this.mode = (code === 'Escape') ? 'menu' : 'playing';
      return;
    }
    if (this.mode === 'stats' && confirm) this.nextLevel();
    else if (this.mode === 'gameover' && confirm) this.mode = 'menu';
  }
  update(dt, keys){
    this.time += dt;
  }
  render(){
    const ctx = this.ctx;
    if (this.mode === 'intro') R.drawIntro(ctx, this.time, loadRecords());
    else if (this.mode === 'menu') R.drawMenu(ctx, this.menu, this.time);
    else if (this.mode === 'levelSelect') R.drawLevelSelect(ctx, this.menu, this.time);
    else if (this.mode === 'playing' || this.mode === 'paused'){
      const g = this.game;
      R.drawField(ctx, g, g.time);
      R.drawHUD(ctx, g, g.time);
      if (this.mode === 'paused') R.drawPause(ctx, this.time);
      if (g.state === 'won' && !g.statsShown){
        g.statsShown = true;
        this.pendingStats = g;
        setTimeout(() => { if (this.mode === 'playing') this.mode = 'stats'; }, 900);
      }
      if (g.state === 'gameover' && !g.overShown){
        g.overShown = true;
        saveRecord({ score: g.engine.stats.score, level: g.level, date: new Date().toISOString().slice(0,10) });
        this.menu.maxUnlocked = maxUnlocked();
        setTimeout(() => { if (this.mode === 'playing') this.mode = 'gameover'; }, 1200);
      }
    }
    else if (this.mode === 'stats' && this.pendingStats) R.drawStats(ctx, this.pendingStats);
    else if (this.mode === 'gameover' && this.game) R.drawGameover(ctx, this.game);
  }
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { UI, UI_HELPERS: { loadRecords, saveRecord, maxUnlocked } });
})();

/* ===== main.js ===== */
(function(){
"use strict";
(function boot(){
  const C = window.__TANKS__;
  const canvas = document.getElementById('game');
  const sfx = new C.SFX();
  const ui = new C.UI(canvas, sfx);
  window.__SF = { ui, sfx };
  let last = performance.now();
  const keys = new Set();
  const HOLD_KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space'];
  window.addEventListener('keydown', (e) => {
    if (HOLD_KEYS.includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    ui.onKey(e.code, true);
    if (sfx.resume) sfx.resume();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  const touchState = {};
  document.querySelectorAll('.tbtn').forEach(btn => {
    const key = btn.dataset.key;
    const on = (e) => { e.preventDefault(); touchState[key] = true; keys.add(key); ui.onKey('TouchStart', true); if (sfx.resume) sfx.resume(); };
    const off = (e) => { e.preventDefault(); touchState[key] = false; keys.delete(key); };
    btn.addEventListener('touchstart', on, { passive: false });
    btn.addEventListener('touchend', off, { passive: false });
    btn.addEventListener('touchcancel', off, { passive: false });
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  });
  function loop(now){
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ui.update(dt, keys);
    if (ui.mode === 'playing' && ui.game){
      const input = {};
      if (keys.has('ArrowUp') || keys.has('KeyW')) input.dir = 0;
      else if (keys.has('ArrowRight') || keys.has('KeyD')) input.dir = 1;
      else if (keys.has('ArrowDown') || keys.has('KeyS')) input.dir = 2;
      else if (keys.has('ArrowLeft') || keys.has('KeyA')) input.dir = 3;
      input.fire = keys.has('Space');
      ui.game.step(dt, input);
      if (sfx.setEngine) sfx.setEngine(!!input.dir && ui.game.player.alive);
    }
    ui.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
})();