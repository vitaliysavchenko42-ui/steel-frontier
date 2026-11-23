(function(){
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
startGame(level, power){
const G = C.Game;
this.game = new G(level, {
onSound: (name) => { if (this.sfx[name]) this.sfx[name](); },
onEvent: () => {},
playerPower: power,
});
this.mode = 'playing';
this.statsTime = 0;
for (let i = 0; i < 4; i++){ this['_done' + i] = false; this['_last' + i] = 0; }
this['_total'] = false;
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
this.startGame(level, power);
this.game.engine.stats.score = score;
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
if (this.menu.recordsOpen){
if (confirm) this.menu.recordsOpen = false;
return;
}
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
if (this.mode === 'stats' && this.pendingStats){
this.statsTime = (this.statsTime || 0) + dt;
const byType = (this.pendingStats.stats && this.pendingStats.stats.byType) || {};
const rows = [['basic',100],['fast',200],['sniper',300],['armor',400]];
for (let i = 0; i < rows.length; i++){
const [ty] = rows[i];
const start = 0.4 + i * 0.55;
const cnt = byType[ty] || 0;
const prog = Math.min(1, Math.max(0, (this.statsTime - start) / 0.45));
const shown = Math.floor(cnt * prog);
if (this['_last' + i] === undefined) this['_last' + i] = 0;
if (shown > this['_last' + i]){ this['_last' + i] = shown; if (this.sfx.tick) this.sfx.tick(); }
if (!this['_done' + i] && this.statsTime >= start + 0.45 && cnt > 0){ this['_done' + i] = true; if (this.sfx.tickDone) this.sfx.tickDone(); }
}
const totalStart = 0.4 + rows.length * 0.55;
if (!this['_total'] && this.statsTime >= totalStart){ this['_total'] = true; if (this.sfx.levelWin) this.sfx.levelWin(); }
}
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
else if (this.mode === 'stats' && this.pendingStats) R.drawStats(ctx, this.pendingStats, this.time);
else if (this.mode === 'gameover' && this.game) R.drawGameover(ctx, this.game);
}
}
if (typeof window !== 'undefined') Object.assign(window.__TANKS__, { UI, UI_HELPERS: { loadRecords, saveRecord, maxUnlocked } });
})();
(function(){
(function boot(){
const C = window.__TANKS__;
const canvas = document.getElementById('game');
const sfx = new C.SFX();
const ui = new C.UI(canvas, sfx);
window.__SF = { ui, sfx };
let last = performance.now();
const keys = new Set();
let lastDir = null;
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
const on = (e) => { e.preventDefault(); touchState[key] = true; keys.add(key); if (key === 'Space') ui.onKey('TouchStart', true); else ui.onKey(key, true); if (sfx.resume) sfx.resume(); };
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
const DIR_KEY = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
let dir = null;
if (lastDir !== null){
for (const k of keys){ if (DIR_KEY[k] === lastDir){ dir = lastDir; break; } }
}
if (dir === null){
for (const k of keys){ if (DIR_KEY[k] !== undefined){ dir = DIR_KEY[k]; break; } }
}
if (dir !== null){ input.dir = dir; lastDir = dir; } else lastDir = null;
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