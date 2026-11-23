// Звук v2: WebAudio SFX + короткий мотив победы/поражения

let actx = null;
let muted = false;

export function unlock() {
  if (!actx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function beep(freq, dur, type, gain, slide, delay) {
  if (muted || !actx || actx.state !== 'running') return;
  const t0 = actx.currentTime + (delay || 0);
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
  g.gain.value = gain;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(actx.destination);
  o.start(t0);
  o.stop(t0 + dur);
}

export function playEvent(ev) {
  switch (ev.type) {
    case 'shot': beep(940, 0.07, 'square', 0.04); break;
    case 'clank': beep(300, 0.06, 'square', 0.05); break;
    case 'brick': beep(210, 0.09, 'square', 0.06); break;
    case 'steelbreak': beep(420, 0.14, 'square', 0.09, 120); break;
    case 'hit': beep(260, 0.1, 'square', 0.07, 180); break;
    case 'boom': beep(170, 0.3, 'sawtooth', 0.12, 45); break;
    case 'respawn': beep(520, 0.16, 'triangle', 0.06); break;
    case 'bonus': beep(660, 0.1, 'triangle', 0.08); beep(880, 0.14, 'triangle', 0.08, 0, 0.09); break;
    case 'basehit': beep(120, 0.6, 'sawtooth', 0.16, 50); break;
    case 'over': beep(90, 0.9, 'sawtooth', 0.16, 40); break;
    case 'win': beep(520, 0.14, 'triangle', 0.1); beep(660, 0.14, 'triangle', 0.1, 0, 0.13); beep(780, 0.25, 'triangle', 0.1, 0, 0.26); break;
  }
}
