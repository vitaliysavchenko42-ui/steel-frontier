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
function drawStarShape(ctx, cx, cy, rO, rI){
ctx.beginPath();
for (let i = 0; i < 10; i++){
const r = i % 2 ? rI : rO;
const a = -Math.PI/2 + i * Math.PI/5;
ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
}
ctx.closePath();
}
function drawTank(ctx, cx, cy, dir, style, t){
const s = TANK;
const isP = style === 'player';
const et = isP ? 'basic' : ((t && t.type) || 'basic');
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(dir * Math.PI / 2);
ctx.fillStyle = 'rgba(0,0,0,0.22)';
ctx.fillRect(-s/2 - 1, -s/2 + 5, s + 2, s - 3);
const palette = isP
? { body: '#4d7a3a', body2: '#3a5c2b', tracks: '#2b2b2b', barrel: '#8a8a8a', accent: '#c8b06a' }
: et === 'fast'   ? { body: '#49c2d4', body2: '#2a8fa0', tracks: '#1e1e1e', barrel: '#c8f2f8', accent: '#0e5a66' }
: et === 'sniper' ? { body: '#d4b13a', body2: '#a3851f', tracks: '#1e1e1e', barrel: '#8a7a3a', accent: '#5a4810' }
: et === 'armor'  ? { body: '#7fae46', body2: '#57832c', tracks: '#141414', barrel: '#a8c98a', accent: '#2c4020' }
:                    { body: '#9a9a9a', body2: '#6f6f6f', tracks: '#2b2b2b', barrel: '#c0c0c0', accent: '#4a4a4a' };
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
ctx.fillStyle = 'rgba(255,255,255,0.16)';
ctx.fillRect(-s/2 + 7, -s/2 + 3, s - 14, 3);
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
if (et === 'fast'){
const hpStage = (t && t.hp !== undefined) ? t.hp : 3;
if (hpStage <= 1){ palette.body = '#8d8d8d'; palette.body2 = '#6f6f6f'; palette.accent = '#4a4a4a'; }
else if (hpStage === 2){ palette.body = '#d4b13a'; palette.body2 = '#a3851f'; palette.accent = '#5a4810'; }
ctx.fillStyle = palette.body;
ctx.fillRect(-s/2 + 7, -s/2 + 3, s - 14, s - 6);
ctx.fillStyle = palette.body2;
roundRect(ctx, -7, -7, 14, 14, 4); ctx.fill();
ctx.fillStyle = palette.body;
roundRect(ctx, -5.5, -5.5, 11, 11, 3.5); ctx.fill();
ctx.fillStyle = 'rgba(0,0,0,0.30)';
ctx.beginPath();
ctx.moveTo(-s/2 + 7, -s/2 + 3);
ctx.lineTo(s/2 - 7, -s/2 + 3);
ctx.lineTo(0, s/2 - 2);
ctx.closePath(); ctx.fill();
ctx.fillStyle = '#1a1a1a';
for (const wx of [-s/2 + 1, -s/2 + 9, s/2 - 15, s/2 - 7]){
ctx.fillRect(wx, s/2 - 6, 7, 5);
}
ctx.fillStyle = '#111';
ctx.fillRect(-s/2 + 8, s/2 - 10, 5, 4);
ctx.fillRect(s/2 - 13, s/2 - 10, 5, 4);
ctx.strokeStyle = palette.accent; ctx.lineWidth = 1.2;
ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-7, -s/2 + 4); ctx.stroke();
} else if (et === 'armor'){
const hpStage = (t && t.hp !== undefined) ? t.hp : 3;
if (hpStage <= 1){ palette.body = '#8d8d8d'; palette.body2 = '#6f6f6f'; palette.accent = '#4a4a4a'; }
else if (hpStage === 2){ palette.body = '#d4b13a'; palette.body2 = '#a3851f'; palette.accent = '#5a4810'; }
ctx.fillStyle = '#101010';
ctx.fillRect(-s/2 - 2, -s/2 + 1, 9, s - 2);
ctx.fillRect(s/2 - 7, -s/2 + 1, 9, s - 2);
ctx.fillStyle = '#8a8a8a';
for (let i = 0; i < 4; i++){
ctx.fillRect(-s/2 + 0.5, -s/2 + 4 + i * 7, 3, 3);
ctx.fillRect(s/2 - 3.5, -s/2 + 4 + i * 7, 3, 3);
}
ctx.fillStyle = 'rgba(0,0,0,0.30)';
ctx.fillRect(-s/2 + 6, -s/2 + 4, s - 12, 3.5);
ctx.fillRect(-s/2 + 6, s/2 - 8, s - 12, 3.5);
ctx.fillStyle = palette.body2;
ctx.beginPath();
for (let i = 0; i < 8; i++){
const a = i * Math.PI / 4 + Math.PI / 8;
ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 9.5, Math.sin(a) * 9.5);
}
ctx.closePath(); ctx.fill();
ctx.fillStyle = palette.body;
ctx.beginPath();
for (let i = 0; i < 8; i++){
const a = i * Math.PI / 4 + Math.PI / 8;
ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 6.8, Math.sin(a) * 6.8);
}
ctx.closePath(); ctx.fill();
}
if (et === 'sniper'){
ctx.fillStyle = palette.barrel;
ctx.fillRect(-1.5, -TANK/2 - 7, 3, TANK/2 - 1 + 7);
ctx.fillStyle = '#333';
ctx.fillRect(-2.5, -TANK/2 - 8.5, 5, 2.5);
ctx.fillStyle = '#1a1a1a';
ctx.beginPath(); ctx.arc(0, -2, 3.4, 0, 7); ctx.fill();
ctx.fillStyle = '#7fdcff';
ctx.beginPath(); ctx.arc(0, -2, 1.8, 0, 7); ctx.fill();
} else if (et === 'fast'){
ctx.fillStyle = palette.barrel;
ctx.fillRect(-1.5, -TANK/2 - 2, 3, TANK/2 - 2);
ctx.fillStyle = '#0e5a66';
ctx.fillRect(-4, -3, 8, 6);
} else {
ctx.fillStyle = palette.barrel;
ctx.fillRect(-1.5, -TANK/2 - 6, 3, TANK/2 - 1);
}
if (isP && t){
if (t.power >= 3){
ctx.fillStyle = '#e8d070';
ctx.fillRect(-4.2, -TANK/2 - 4, 2.8, TANK/2 - 2);
ctx.fillRect(1.4, -TANK/2 - 4, 2.8, TANK/2 - 2);
} else if (t.power >= 2){
ctx.fillStyle = '#e8d070';
ctx.fillRect(-1.5, -TANK/2 - 5, 3, TANK/2 - 2);
}
if (t.power >= 3){
ctx.fillStyle = '#ffd700';
drawStarShape(ctx, 0, 0.5, 3.8, 1.8); ctx.fill();
}
if (t.power >= 4){
ctx.strokeStyle = '#e8c840';
ctx.lineWidth = 1.6;
roundRect(ctx, -s/2 + 5.5, -s/2 + 2.5, s - 11, s - 5, 2); ctx.stroke();
}
}
if (isP && t && t.raft){
ctx.strokeStyle = 'rgba(90,190,255,0.9)';
ctx.lineWidth = 2;
if (ctx.setLineDash) ctx.setLineDash([4, 3]);
roundRect(ctx, -s/2 - 4, -s/2 - 4, s + 8, s + 8, 3); ctx.stroke();
if (ctx.setLineDash) ctx.setLineDash([]);
}
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
function drawEagle(ctx, x, y, time){
ctx.fillStyle = '#7d6a4a';
ctx.fillRect(x + 4, y + 6, 4, 26);
ctx.fillStyle = '#8f241b';
ctx.beginPath();
ctx.moveTo(x + 9, y + 7);
ctx.lineTo(x + 27, y + 7);
ctx.lineTo(x + 27, y + 19);
ctx.quadraticCurveTo(x + 18, y + 30, x + 9, y + 19);
ctx.closePath(); ctx.fill();
ctx.strokeStyle = '#d8b020'; ctx.lineWidth = 1.3;
ctx.beginPath();
ctx.moveTo(x + 10.5, y + 8.5);
ctx.lineTo(x + 25.5, y + 8.5);
ctx.lineTo(x + 25.5, y + 18.5);
ctx.quadraticCurveTo(x + 18, y + 27.5, x + 10.5, y + 18.5);
ctx.closePath(); ctx.stroke();
const cx = x + 18, cy = y + 14.5;
ctx.fillStyle = '#e8c840';
ctx.beginPath();
if (ctx.ellipse) ctx.ellipse(cx, cy + 2.5, 3, 4.5, 0, 0, 7);
else ctx.arc(cx, cy + 2.5, 3.5, 0, 7);
ctx.fill();
ctx.beginPath();
ctx.moveTo(cx - 1, cy - 1);
ctx.lineTo(cx - 8.5, cy - 5.5);
ctx.lineTo(cx - 6, cy + 1);
ctx.lineTo(cx - 8.5, cy + 0.5);
ctx.lineTo(cx - 3, cy + 4);
ctx.closePath(); ctx.fill();
ctx.beginPath();
ctx.moveTo(cx + 1, cy - 1);
ctx.lineTo(cx + 8.5, cy - 5.5);
ctx.lineTo(cx + 6, cy + 1);
ctx.lineTo(cx + 8.5, cy + 0.5);
ctx.lineTo(cx + 3, cy + 4);
ctx.closePath(); ctx.fill();
ctx.beginPath(); ctx.arc(cx - 2.5, cy - 4, 1.7, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(cx + 2.5, cy - 4, 1.7, 0, 7); ctx.fill();
ctx.fillStyle = '#5a4010';
ctx.fillRect(cx - 4.8, cy - 4.3, 2.2, 0.9);
ctx.fillRect(cx + 2.6, cy - 4.3, 2.2, 0.9);
ctx.fillStyle = '#d8b020';
ctx.fillRect(cx - 3, cy - 7, 6, 1.6);
ctx.fillRect(cx - 2, cy - 8.2, 1, 1.4);
ctx.fillRect(cx + 0.8, cy - 8.2, 1, 1.4);
}
function drawEagleFallen(ctx, cx, cy){
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(0.8);
ctx.globalAlpha = 0.9;
ctx.fillStyle = '#4a4038';
ctx.beginPath(); ctx.arc(0, 6, 8, 0, 7); ctx.fill();
ctx.beginPath();
ctx.moveTo(-13, 0); ctx.lineTo(-2, -7); ctx.lineTo(-6, 5);
ctx.closePath(); ctx.fill();
ctx.beginPath();
ctx.moveTo(13, 0); ctx.lineTo(2, -7); ctx.lineTo(6, 5);
ctx.closePath(); ctx.fill();
ctx.fillStyle = '#2f2a26';
ctx.fillRect(-5, -13, 10, 2.4);
ctx.restore();
ctx.fillStyle = 'rgba(170,20,20,0.8)';
ctx.beginPath(); ctx.arc(cx - 8, cy + 14, 3.2, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(cx + 7, cy + 16, 2.4, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(cx, cy + 11, 1.8, 0, 7); ctx.fill();
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