// Ввод: клавиатура + сенсор. Выдаёт intent {dir, wantMove, fire}

import { DIR } from './config.js?v=2';

export function createInput() {
  const held = [false, false, false, false]; // UP RIGHT DOWN LEFT
  const state = { dir: DIR.UP, wantMove: false, fire: false };

  const keyMap = {
    ArrowUp: DIR.UP, KeyW: DIR.UP,
    ArrowRight: DIR.RIGHT, KeyD: DIR.RIGHT,
    ArrowDown: DIR.DOWN, KeyS: DIR.DOWN,
    ArrowLeft: DIR.LEFT, KeyA: DIR.LEFT
  };

  function recompute() {
    let last = -1;
    for (let i = 0; i < 4; i++) if (held[i]) last = i;
    if (last >= 0) { state.dir = last; state.wantMove = true; }
    else state.wantMove = false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') { state.fire = true; e.preventDefault(); }
    if (e.code === 'KeyM') { window.dispatchEvent(new CustomEvent('sf-mute')); }
    const d = keyMap[e.code];
    if (d !== undefined) { held[d] = true; recompute(); e.preventDefault(); }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') state.fire = false;
    const d = keyMap[e.code];
    if (d !== undefined) { held[d] = false; recompute(); e.preventDefault(); }
  });

  // Сенсорные кнопки (pointer events, поддержка мультитача)
  const pads = document.querySelectorAll('.pad, #fire');
  pads.forEach((el) => {
    const isDir = el.dataset.dir !== undefined;
    const d = isDir ? Number(el.dataset.dir) : -1;
    const down = (e) => { e.preventDefault(); if (el.setPointerCapture) el.setPointerCapture(e.pointerId); if (isDir) { held[d] = true; recompute(); } else state.fire = true; };
    const up = (e) => { e.preventDefault(); if (isDir) { held[d] = false; recompute(); } else state.fire = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  });

  return state;
}
