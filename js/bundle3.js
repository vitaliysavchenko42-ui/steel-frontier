(function(){
const C = window.__TANKS__;
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
function drawTankCore(ctx, cx, cy, dir, palette, t, isP){
const s = TANK;
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
ctx.fillStyle = palette.barrel;
ctx.fillRect(-1.5, -TANK/2 - 3, 3, TANK/2 - 1);
ctx.fillStyle = palette.accent;
ctx.fillRect(-2.5, 1, 5, 4);
return;
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
const paletteRed = { body: '#c03a2e', body2: '#8f241b', tracks: '#1e1e1e', barrel: '#d88a7a', accent: '#5a1410' };
if (style === 'red') return drawTankCore(ctx, cx, cy, dir, paletteRed, t, false);
const palette = isP
? { body: '#4d7a3a', body2: '#3a5c2b', tracks: '#2b2b2b', barrel: '#8a8a8a', accent: '#c8b06a' }
: et === 'fast' ? { body: '#49c2d4', body2: '#2a8fa0', tracks: '#1e1e1e', barrel: '#c8f2f8', accent: '#0e5a66' }
: et === 'sniper' ? { body: '#d4b13a', body2: '#a3851f', tracks: '#1e1e1e', barrel: '#8a7a3a', accent: '#5a4810' }
: et === 'armor' ? { body: '#7fae46', body2: '#57832c', tracks: '#141414', barrel: '#a8c98a', accent: '#2c4020' }
: { body: '#9a9a9a', body2: '#6f6f6f', tracks: '#2b2b2b', barrel: '#c0c0c0', accent: '#4a4a4a' };
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
function drawBrickTile(ctx, x, y, t, hp){
ctx.fillStyle = '#8a4a2a';
ctx.fillRect(x, y, CELL, CELL);
ctx.fillStyle = '#6a3620';
ctx.fillRect(x, y + CELL/2 - 1, CELL, 1.5);
ctx.fillRect(x + (t % 2 ? CELL/2 : 0), y, 1, CELL/2);
ctx.fillRect(x + (t % 2 ? 0 : CELL/2), y + CELL/2, 1, CELL/2);
ctx.fillStyle = 'rgba(255,255,255,0.08)';
ctx.fillRect(x, y, CELL, 1);
if (hp !== undefined && hp < 4){
ctx.fillStyle = 'rgba(20,10,6,0.55)';
if (hp <= 2) ctx.fillRect(x + CELL/2 - 1.5, y + 2, 3, CELL - 4);
if (hp <= 1) ctx.fillRect(x + 2, y + CELL/2 - 1.5, CELL - 4, 3);
if (hp <= 2){ ctx.fillStyle = 'rgba(139,74,42,0.9)'; ctx.fillRect(x + CELL/2 - 3, y + CELL/2 - 1, 6, 2); }
}
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
const cx = x + 16, cy = y + 15;
const pulse = 0.5 + 0.5 * Math.sin(time * 3);
ctx.fillStyle = 'rgba(24,16,16,0.55)';
roundRect(ctx, x + 1, y + 2, 30, 28, 4); ctx.fill();
ctx.fillStyle = 'rgba(255,110,90,' + (0.05 + 0.07 * pulse).toFixed(3) + ')';
ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 7); ctx.fill();
ctx.fillStyle = '#d42a2a';
ctx.beginPath();
if (ctx.ellipse) ctx.ellipse(cx, cy + 4.5, 4.6, 6.8, 0, 0, 7); else ctx.arc(cx, cy + 4.5, 5.5, 0, 7);
ctx.fill();
ctx.beginPath(); ctx.arc(cx - 4.6, cy - 6.5, 3.1, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(cx + 4.6, cy - 6.5, 3.1, 0, 7); ctx.fill();
ctx.fillStyle = '#e8b020';
ctx.fillRect(cx - 6.8, cy - 7, 1.7, 1.3);
ctx.fillRect(cx + 5.1, cy - 7, 1.7, 1.3);
ctx.fillStyle = '#a81d1d';
ctx.beginPath();
ctx.moveTo(cx - 2, cy - 1.5);
ctx.lineTo(cx - 14.5, cy - 9.5);
ctx.lineTo(cx - 10, cy + 1.5);
ctx.lineTo(cx - 3.5, cy + 0.5);
ctx.closePath(); ctx.fill();
ctx.beginPath();
ctx.moveTo(cx + 2, cy - 1.5);
ctx.lineTo(cx + 14.5, cy - 9.5);
ctx.lineTo(cx + 10, cy + 1.5);
ctx.lineTo(cx + 3.5, cy + 0.5);
ctx.closePath(); ctx.fill();
ctx.fillStyle = '#8f1818';
ctx.beginPath();
ctx.moveTo(cx - 3, cy + 9);
ctx.lineTo(cx + 3, cy + 9);
ctx.lineTo(cx, cy + 14.5);
ctx.closePath(); ctx.fill();
ctx.fillStyle = '#e8c840';
ctx.fillRect(cx - 4.2, cy - 12, 8.4, 1.7);
ctx.fillRect(cx - 3.2, cy - 13.8, 1.3, 2);
ctx.fillRect(cx - 0.65, cy - 14.5, 1.3, 2.6);
ctx.fillRect(cx + 1.9, cy - 13.8, 1.3, 2);
ctx.fillStyle = '#fff';
ctx.beginPath(); ctx.arc(cx - 4, cy - 7, 0.9, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(cx + 4, cy - 7, 0.9, 0, 7); ctx.fill();
}
function drawEagleFallen(ctx, cx, cy){
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(0.75);
ctx.globalAlpha = 0.9;
ctx.fillStyle = '#7a2a24';
ctx.beginPath(); ctx.arc(0, 4, 7.5, 0, 7); ctx.fill();
ctx.beginPath();
ctx.moveTo(-11.5, -1); ctx.lineTo(-2, -6.5); ctx.lineTo(-5, 4.5);
ctx.closePath(); ctx.fill();
ctx.beginPath();
ctx.moveTo(11.5, -1); ctx.lineTo(2, -6.5); ctx.lineTo(5, 4.5);
ctx.closePath(); ctx.fill();
ctx.fillStyle = '#5a1815';
ctx.beginPath(); ctx.arc(-4, -6, 2.6, 0, 7); ctx.fill();
ctx.beginPath(); ctx.arc(4, -6, 2.6, 0, 7); ctx.fill();
ctx.fillStyle = '#e8b020';
ctx.fillRect(cx ? -5.5 : -5.5, -7.6, 1.6, 1.2);
ctx.fillRect(3.9, -7.6, 1.6, 1.2);
ctx.fillStyle = '#e8c840';
ctx.fillRect(-4.2, -11.5, 8.4, 1.7);
ctx.restore();
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
shovel: '#cfd8dc', tank: '#66bb6a', clock: '#f5f5f5', raft: '#8d6e63',
};
function drawBonus(ctx, b, time){
const age = time - (b.t0 === undefined ? 0 : b.t0);
if (age > 27) { if ((time * 8) % 1 < 0.5) return; }
else if (age > 22) { if ((time * 4) % 1 < 0.5) return; }
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
case 'raft':
ctx.fillStyle = '#8d6e63';
ctx.fillRect(cx - 6.5, cy - 1.5, 13, 3);
ctx.fillRect(cx - 1.5, cy - 6.5, 3, 13);
ctx.fillStyle = '#5d4037';
ctx.fillRect(cx - 6.5, cy - 1.5, 13, 0.8);
ctx.fillRect(cx - 1.5, cy - 6.5, 0.8, 13);
ctx.strokeStyle = 'rgba(120,200,255,0.8)'; ctx.lineWidth = 1.2;
ctx.beginPath();
ctx.moveTo(cx - 6, cy + 7.5); ctx.lineTo(cx - 2, cy + 6);
ctx.lineTo(cx + 2, cy + 7.5); ctx.lineTo(cx + 6, cy + 6);
ctx.stroke();
break;
}
}
function drawExplosion(ctx, ex, time){
const p = (time - ex.t0) / ex.dur;
if (p < 0 || p > 1) return;
const a = 1 - p;
const r = 8 + p * (ex.big ? 36 : 20);
if (p < 0.35){
const fa = 1 - p / 0.35;
ctx.fillStyle = 'rgba(255,255,215,' + (fa * 0.95) + ')';
ctx.beginPath(); ctx.arc(ex.x, ex.y, r * (0.55 + 0.45 * (1 - p / 0.35)), 0, 7); ctx.fill();
}
const petals = ex.big ? 10 : 6;
for (let i = 0; i < petals; i++){
const ang = i * Math.PI / (petals / 2) + ex.seed;
const rr = r * (0.45 + 0.55 * Math.sin(time * 22 + i * 2.1));
ctx.fillStyle = 'rgba(255,' + Math.floor(120 + 110 * (1 - p)) + ',40,' + (a * 0.9) + ')';
ctx.beginPath();
ctx.arc(ex.x + Math.cos(ang) * rr * (0.3 + p), ex.y + Math.sin(ang) * rr * (0.3 + p), (4.5 * (1 - p) + 2) * (ex.big ? 1.2 : 1), 0, 7);
ctx.fill();
}
ctx.strokeStyle = 'rgba(255,205,90,' + (a * 0.75) + ')';
ctx.lineWidth = 3.5 * (1 - p) + 0.8;
ctx.beginPath(); ctx.arc(ex.x, ex.y, r * 1.15, 0, 7); ctx.stroke();
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
if (v === T.BRICK) drawBrickTile(ctx, px, py, x + y, game.engine.tileHp ? game.engine.tileHp[y * COLS + x] : 4);
else if (v === T.STEEL) drawSteelTile(ctx, px, py);
else if (v === T.WATER) drawWaterTile(ctx, px, py, time);
else if (v === T.ICE) drawIceTile(ctx, px, py);
else if (v === T.FOREST) drawForestTile(ctx, px, py);
}
for (const b of game.engine.bonuses) drawBonus(ctx, b, time);
const fx = OFF_X + FLAGT[0] * CELL, fy = OFF_Y + FLAGT[1] * CELL;
if (tiles[FLAGT[1]][FLAGT[0]] === T.FLAG){
const glow = 0.5 + 0.5 * Math.sin(time * 3);
ctx.fillStyle = 'rgba(255,110,90,' + (0.05 + 0.07 * glow).toFixed(3) + ')';
ctx.beginPath(); ctx.arc(fx + 16, fy + 16, 26, 0, 7); ctx.fill();
drawEagle(ctx, fx, fy, time);
} else {
drawEagleFallen(ctx, fx + 18, fy + 16);
const blood = 0.5 + 0.5 * Math.sin(time * 2);
ctx.fillStyle = 'rgba(150,20,20,' + (0.45 + 0.25 * blood).toFixed(3) + ')';
ctx.beginPath();
if (ctx.ellipse) ctx.ellipse(fx + 16, fy + 20, 11 + blood * 2, 7 + blood, 0, 0, 7); else ctx.arc(fx + 16, fy + 20, 9, 0, 7);
ctx.fill();
ctx.fillStyle = 'rgba(170,30,30,' + (0.4 + 0.3 * blood).toFixed(3) + ')';
for (let i = 0; i < 5; i++){ ctx.beginPath(); ctx.arc(fx + 8 + i * 4, fy + 24 + (i % 2 ? 4 : 0), 1.6 + (i % 2) * 0.8, 0, 7); ctx.fill(); }
}
for (const t of game.engine.tanks){
if (!t.alive) continue;
drawTank(ctx, OFF_X + t.x + TANK/2, OFF_Y + t.y + TANK/2, t.dir,
t.isPlayer ? 'player' : (t.elite ? (Math.sin(time * 14) > 0 ? 'red' : (t.type === 'armor' && Math.sin(time * 12) > 0 ? 'gold' : ENEMY_COLOR[t.type] || 'grey')) : (ENEMY_COLOR[t.type] || 'grey')), t);
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
for (const sp of game.splashes || []){
const sp2 = (time - sp.t0) / 0.9;
if (sp2 < 0 || sp2 > 1) continue;
for (let i = 0; i < 14; i++){
const ang = i * 2 * Math.PI / 14 + i * 0.7;
const dist = 6 + sp2 * (14 + (i % 5) * 6);
const sx2 = sp.x + Math.cos(ang) * dist;
const sy2 = sp.y + Math.sin(ang) * dist - sp2 * sp2 * 6;
ctx.fillStyle = 'rgba(175,25,25,' + (1 - sp2).toFixed(2) + ')';
ctx.beginPath(); ctx.arc(sx2, sy2, 2.6 - sp2 * 1.6, 0, 7); ctx.fill();
}
ctx.strokeStyle = 'rgba(195,38,38,' + (0.7 * (1 - sp2)).toFixed(2) + ')';
ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(sp.x, sp.y, 4 + sp2 * 26, 0, 7); ctx.stroke();
}
for (const ex of game.explosions || []) drawExplosion(ctx, ex, time);
for (const d of game.debris || []){
const dp = (time - d.t0) / d.dur;
if (dp < 0 || dp > 1) continue;
const da = 1 - dp;
const px = d.x + d.dx * dp * 34, py = d.y + d.dy * dp * 34;
ctx.fillStyle = d.red ? 'rgba(170,30,30,' + da.toFixed(2) + ')' : 'rgba(125,125,135,' + da.toFixed(2) + ')';
ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
if (dp < 0.35){ ctx.fillStyle = 'rgba(255,180,90,' + (0.5 * (1 - dp / 0.35)).toFixed(2) + ')'; ctx.fillRect(px - 0.5, py - 0.5, 1.5, 1.5); }
}
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
if (menu.recordsOpen){
const recs = C.UI_HELPERS ? C.UI_HELPERS.loadRecords() : [];
ctx.fillStyle = '#0c1018';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
ctx.textAlign = 'center';
ctx.font = 'bold 24px "Courier New", monospace';
ctx.fillStyle = '#e8c840';
ctx.fillText('РЕКОРДЫ', CANVAS_W/2, 70);
ctx.font = '15px "Courier New", monospace';
if (!recs.length){
ctx.fillStyle = '#8a94a8';
ctx.fillText('ПОКА ПУСТО — СЫГРАЙ ПАРТИЮ', CANVAS_W/2, 150);
} else {
const top = recs.slice(0, 10);
ctx.fillStyle = '#e8e8f0';
ctx.fillText('СЧЁТ      УРОВЕНЬ', CANVAS_W/2, 106);
top.forEach((rec, i) => {
ctx.fillStyle = i === 0 ? '#e8c840' : '#9aa4b8';
ctx.fillText(String(rec.score).padStart(6, ' ') + '   УР. ' + (rec.level || 1), CANVAS_W/2, 136 + i * 26);
});
}
ctx.font = '11px "Courier New", monospace';
ctx.fillStyle = '#4a5468';
ctx.fillText('ОГОНЬ / ПРОБЕЛ — НАЗАД', CANVAS_W/2, CANVAS_H - 30);
ctx.textAlign = 'left';
return;
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
function drawStats(ctx, game, time){
time = (time === undefined) ? 99 : time;
ctx.fillStyle = '#0c1018';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
ctx.textAlign = 'center';
ctx.font = 'bold 26px "Courier New", monospace';
ctx.fillStyle = '#4a8a4a';
ctx.fillText('УРОВЕНЬ ' + game.level + ' ПРОЙДЕН', CANVAS_W/2, 70);
const byType = (game.stats && game.stats.byType) || {};
const rows = [
{ type: 'basic', color: '#9a9a9a', pts: 100 },
{ type: 'fast', color: '#49c2d4', pts: 200 },
{ type: 'sniper', color: '#d4b13a', pts: 300 },
{ type: 'armor', color: '#7fae46', pts: 400 },
];
let y = 150;
rows.forEach((row, i) => {
const count = byType[row.type] || 0;
const start = 0.4 + i * 0.55;
if (time >= start){
const prog = Math.min(1, (time - start) / 0.45);
const sum = Math.floor(count * row.pts * prog);
ctx.font = '15px "Courier New", monospace';
ctx.fillStyle = '#e8e8f0';
drawMiniTank(ctx, CANVAS_W/2 - 80, y, row.color);
ctx.fillText('× ' + count + '   ' + sum + ' PT', CANVAS_W/2 + 30, y + 4);
}
y += 42;
});
const totalStart = 0.4 + rows.length * 0.55;
if (time >= totalStart){
ctx.font = 'bold 20px "Courier New", monospace';
ctx.fillStyle = '#e8c840';
ctx.fillText('ИТОГ: ' + game.stats.score, CANVAS_W/2, y + 24);
if (Math.sin(Date.now() / 400) > 0){
ctx.font = '13px "Courier New", monospace';
ctx.fillText('ПРОБЕЛ — ДАЛЬШЕ', CANVAS_W/2, y + 70);
}
}
ctx.textAlign = 'left';
}
function drawGameover(ctx, game){
ctx.fillStyle = 'rgba(8,8,12,0.92)';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
if (game.gameoverReason === 'base') drawEagleFallen(ctx, CANVAS_W/2, 85);
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
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { RENDER: { drawEagle, drawEagleFallen, drawTank, drawField, drawBonus, drawBullet, drawExplosion, drawHUD, drawIntro, drawMenu, drawLevelSelect, drawStats, drawGameover, drawPause, drawIntroTank, CANVAS_W, CANVAS_H, OFF_X, OFF_Y, ENEMY_COLOR } });
})();