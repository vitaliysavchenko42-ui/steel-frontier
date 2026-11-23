// Точка входа: канвас, цикл 60 Гц, связка ввода/движка/рендера/звука

import { ARENA } from './config.js';
import { createGame, startGame, step } from './engine.js';
import { draw } from './render.js';
import { createInput } from './input.js';
import { unlock, setMuted, playEvent } from './sound.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = {
  level: document.getElementById('hud-level'),
  enemies: document.getElementById('hud-enemies'),
  score: document.getElementById('hud-score'),
  lives: document.getElementById('hud-lives')
};
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');

const game = createGame();
const input = createInput();
let started = false;
let muted = false;

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

function begin() {
  unlock();
  if (!started) {
    started = true;
    startGame(game);
    overlay.classList.add('hidden');
  }
}
overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); begin(); });
window.addEventListener('keydown', () => begin());

// пауза при потере фокуса вкладки, снятие паузы при возврате
let paused = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) paused = true; else { paused = false; prev = performance.now(); }
});

const STEP = 1 / 60;
let acc = 0;
let prev = performance.now();

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove('hidden');
  started = false;
}

function updateHud() {
  hud.level.textContent = 'Ур. ' + game.level;
  hud.enemies.textContent = 'Враги: ' + game.enemiesLeft;
  hud.score.textContent = 'Счёт: ' + game.score;
  hud.lives.textContent = 'Жизни: ' + Math.max(0, game.lives);
}

function frame(now) {
  let dt = (now - prev) / 1000;
  prev = now;
  if (dt > 0.25) dt = 0.25;
  if (started && !paused && game.state === 'play') {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      step(game, input, STEP);
      acc -= STEP;
      steps++;
    }
    for (const ev of game.events) playEvent(ev);
    game.events.length = 0;
    updateHud();
    if (game.state === 'over') showOverlay('ПОРАЖЕНИЕ', 'Штаб пал или кончились жизни. Коснитесь экрана, чтобы начать заново');
    else if (game.state === 'win') showOverlay('УРОВЕНЬ ПРОЙДЕН', 'Счёт: ' + game.score + '. Коснитесь экрана, чтобы пройти снова');
  }
  draw(ctx, game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
