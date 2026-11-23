// Минимальный звук на WebAudio: разблокировка после первого действия, короткие SFX

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

function beep(freq, dur, type, gain, slide) {
  if (muted || !actx || actx.state !== 'running') return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), actx.currentTime + dur);
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
  o.connect(g);
  g.connect(actx.destination);
  o.start();
  o.stop(actx.currentTime + dur);
}

export function playEvent(ev) {
  switch (ev.type) {
    case 'shot': beep(940, 0.07, 'square', 0.04); break;
    case 'clank': beep(300, 0.06, 'square', 0.05); break;
    case 'brick': beep(210, 0.09, 'square', 0.06); break;
    case 'boom': beep(170, 0.3, 'sawtooth', 0.12, 45); break;
    case 'respawn': beep(520, 0.16, 'triangle', 0.06); break;
    case 'basehit': beep(120, 0.6, 'sawtooth', 0.16, 50); break;
    case 'over': beep(90, 0.9, 'sawtooth', 0.16, 40); break;
    case 'win': beep(660, 0.4, 'triangle', 0.1); break;
  }
}
