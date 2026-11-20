"use strict";
(function boot(){
  const C = window.__TANKS__;
  const canvas = document.getElementById('game');
  const sfx = new C.SFX();
  const ui = new C.UI(canvas, sfx);
  window.__SF = { ui, sfx };
  let last = performance.now();
  const keys = new Set();
  let lastDir = null; // приоритет последнего направления
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
      // приоритет последнего направления: танк не мечется при одновременных клавишах
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
