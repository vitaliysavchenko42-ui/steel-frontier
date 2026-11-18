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
