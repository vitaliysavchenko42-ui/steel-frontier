// Точка входа v2: меню, цикл 60 Гц, HUD, переходы уровней, диагностика ошибок

import { ARENA } from './config.js?v=2';
import { createGame, startLevel, startCampaign, step } from './engine.js?v=2';
import { draw } from './render.js?v=2';
import { createInput } from './input.js?v=2';
import { unlock, setMuted, playEvent } from './sound.js?v=2';
import { LAST_CAMPAIGN_LEVEL } from './level.js?v=2';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = {
  level: document.getElementById('hud-level'),
  enemies: document.getElementById('hud-enemies'),
  score: document.getElementById('hud-score'),
  lives: document.getElementById('hud-lives'),
  bonus: document.getElementById('hud-bonus')
};
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const menuEl = document.getElementById('menu');
const btnCampaign = document.getElementById('btn-campaign');
const btnEndless = document.getElementById('btn-endless');

const game = createGame();
const input = createInput();
let muted = false;

function showMenu() {
  game.state = 'menu';
  overlayTitle.textContent = 'СТАЛЬНОЙ РУБЕЖ';
  overlayText.textContent = 'WASD/стрелки — движение · Space — огонь · M — звук. На телефоне — джойстик слева и ОГОНЬ справа';
  menuEl.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
  menuEl.classList.add('hidden');
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove('hidden');
}

function fitCanvas() {
  const stage = document.getElementById('stage');
  const size = Math.min(stage.clientWidth, stage.clientHeight);
  const scale = Math.max(1, Math.floor(size / ARENA * 100) / 100);
  canvas.style.width = Math.round(ARENA * scale) + 'px';
  canvas.style.height = Math.round(ARENA * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

window.addEventListener('sf-mute', () => { muted = !muted; setMuted(muted); });

btnCampaign.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); beginCampaign(); });
btnEndless.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); beginEndless(); });
window.addEventListener('keydown', (e) => {
  unlock();
  if (game.state === 'menu') {
    if (e.code === 'Digit1') beginCampaign();
    else if (e.code === 'Digit2') beginEndless();
  }
});

function beginCampaign() { unlock(); startCampaign(game); hideOverlay(); }
function beginEndless() { unlock(); startLevel(game, 1, 'endless'); hideOverlay(); }

overlay.addEventListener('pointerdown', (e) => {
  if (e.target === btnCampaign || e.target === btnEndless) return;
  unlock();
  if (game.state === 'over') showMenu();
  else if (game.state === 'win' && winHold > 0) { winHold = 0; advance(); }
  else if (game.state === 'play') overlay.classList.add('hidden');
});

let paused = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { paused = true; if (game.state === 'play') showOverlay('ПАУЗА', 'Коснитесь экрана или нажмите любую клавишу, чтобы продолжить'); }
  else { paused = false; prev = performance.now(); }
});
window.addEventListener('keydown', () => {
  if (paused) { paused = false; prev = performance.now(); hideOverlay(); }
});

const STEP = 1 / 60;
let acc = 0;
let prev = performance.now();
let winHold = 0;

function advance() {
  const next = game.level + 1;
  startLevel(game, next, game.mode);
  hideOverlay();
}

function updateHud() {
  hud.level.textContent = game.mode === 'endless' ? 'Волна ' + game.level : 'Ур. ' + game.level;
  hud.enemies.textContent = 'Враги: ' + Math.max(0, game.enemiesLeft);
  hud.score.textContent = 'Счёт: ' + game.score;
  hud.lives.textContent = 'Жизни: ' + Math.max(0, game.lives) + ' · Апгрейд: ' + game.power;
  const parts = [];
  if (game.tanks[0] && game.tanks[0].shield > 0) parts.push('Щит ' + Math.ceil(game.tanks[0].shield) + 'с');
  if (game.freezeT > 0) parts.push('Часы ' + Math.ceil(game.freezeT) + 'с');
  if (game.shovelT > 0) parts.push('Лопата ' + Math.ceil(game.shovelT) + 'с');
  hud.bonus.textContent = parts.join(' · ');
}

function frame(now) {
  let dt = (now - prev) / 1000;
  prev = now;
  if (dt > 0.25) dt = 0.25;
  const beforeState = game.state;
  if (started(game) && !paused) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      step(game, input, STEP);
      acc -= STEP;
      steps++;
    }
    for (const ev of game.events) {
      if (ev.type === 'nextlevel') { winHold = 0; advance(); }
      else playEvent(ev);
    }
    game.events.length = 0;
    updateHud();
  }
  if (beforeState === 'play' && game.state === 'win') { winHold = 1.2; showOverlay('УРОВЕНЬ ПРОЙДЕН', 'Счёт: ' + game.score + (game.mode === 'campaign' && game.level >= LAST_CAMPAIGN_LEVEL ? ' — кампания пройдена!' : '')); }
  else if (beforeState === 'play' && game.state === 'over') showOverlay('ПОРАЖЕНИЕ', 'Счёт: ' + game.score + '. Коснитесь экрана, чтобы вернуться в меню');
  if (game.state === 'win' && winHold > 0) winHold -= dt;
  draw(ctx, game);
  requestAnimationFrame(frame);
}

function started(g) { return g.state === 'play' || g.state === 'win'; }

window.addEventListener('error', (e) => {
  try {
    overlayTitle.textContent = 'ОШИБКА';
    overlayText.textContent = String(e.message || e.error);
    menuEl.classList.add('hidden');
    overlay.classList.remove('hidden');
  } catch (err) {}
});

showMenu();
requestAnimationFrame(frame);
