"use strict";
const R = typeof require !== 'undefined' && typeof window === 'undefined'
  ? require('./render') : window.__TANKS__.RENDER;
const CANVAS_W = R.CANVAS_W, CANVAS_H = R.CANVAS_H;
const LS_KEY = 'steel-frontier-records';
function loadRecords(){
  try { return JSON.parse((typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null) || '[]'); } catch(e){ return []; }
}
function saveRecord(rec){
  const recs = loadRecords();
  recs.push(rec);
  recs.sort((a, b) => b.score - a.score);
  if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(recs.slice(0, 10)));
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
  getGame(){
    return typeof require !== 'undefined' && typeof window === 'undefined'
      ? require('./game').Game : window.__TANKS__.Game;
  }
  spawnFx(x, y, big){
    if (!this.game) return;
    this.game.explosions.push({ x: 16 + x + 16, y: 56 + y + 16, t0: this.time, dur: big ? 0.7 : 0.4, big, seed: Math.random() * 6 });
    if (this.sfx.explosion) this.sfx.explosion(big);
  }
  startGame(level){
    const G = this.getGame();
    this.game = new G(level, {
      onSound: (name) => { if (this.sfx[name]) this.sfx[name](); },
      onEvent: () => {},
    });
    this.game.explosions = [];
    this.game.onEvent = (type, x, y) => { if (type === 'explosion') this.spawnFx(x, y, true); };
    this.mode = 'playing';
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
      if (confirm){ if (sfx.resume) sfx.resume(); this.mode = 'menu'; }
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
    if (this.game && this.game.explosions){
      this.game.explosions = this.game.explosions.filter(e => (this.time - e.t0) < e.dur);
    }
  }
  render(){
    const ctx = this.ctx;
    if (this.mode === 'intro') R.drawIntro(ctx, this.time, loadRecords());
    else if (this.mode === 'menu') R.drawMenu(ctx, this.menu, this.time);
    else if (this.mode === 'levelSelect') R.drawLevelSelect(ctx, this.menu, this.time);
    else if (this.mode === 'playing' || this.mode === 'paused'){
      const g = this.game;
      R.drawField(ctx, g, this.time);
      R.drawHUD(ctx, g, this.time);
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
if (typeof module !== 'undefined') module.exports = { UI, loadRecords, saveRecord, maxUnlocked, LS_KEY };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { UI, UI_HELPERS: { loadRecords, saveRecord, maxUnlocked } });
