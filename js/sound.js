"use strict";
const VOICE_LIMIT = 8;
class SFX {
  constructor(){
    this.ctx = null; this.master = null;
    this.enabled = true;
    this.activeVoices = 0;
    this.engineOsc = null; this.engineGain = null;
  }
  ensure(){
    if (this.ctx) return true;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      return true;
    } catch(e){ return false; }
  }
  setEnabled(v){
    this.enabled = v;
    if (this.master) this.master.gain.value = v ? 0.35 : 0;
    if (!v) this.stopEngine();
  }
  resume(){ if (!this.ctx) this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  voiceOk(){ return this.enabled && this.ctx && this.activeVoices < VOICE_LIMIT; }
  noiseBuffer(dur){
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  playNoise(dur, freqStart, freqEnd, gain){
    if (!this.voiceOk()) return;
    this.activeVoices++;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freqStart, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
    src.onended = () => { this.activeVoices--; };
  }
  playTone(freq, dur, type, gain, freqEnd){
    if (!this.voiceOk()) return;
    this.activeVoices++;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur);
    o.onended = () => { this.activeVoices--; };
  }
  shoot(player){ this.playTone(player ? 560 : 420, 0.14, 'square', 0.28, 90); this.playNoise(0.10, 5000, 500, 0.30); this.playTone(player ? 170 : 130, 0.11, 'triangle', 0.20, 55); }
  ricochet(){ this.playTone(900, 0.05, 'triangle', 0.1, 500); }
  explosion(big){
    // громкий слоёный взрыв: крах + низкий гул + подкат
    this.playNoise(big ? 0.9 : 0.5, big ? 1200 : 2200, 50, big ? 0.85 : 0.6);
    this.playTone(big ? 55 : 95, big ? 0.85 : 0.45, 'sawtooth', big ? 0.5 : 0.4, 22);
    this.playNoise(0.3, 400, 45, 0.45);
  }
  bonus(){ const n = [523, 659, 784, 1047]; n.forEach((f, i) => setTimeout(() => this.playTone(f, 0.12, 'square', 0.18), i * 70)); }
  spawn(){ this.playTone(220, 0.15, 'sawtooth', 0.08, 440); }
  bonusDrop(){ this.playTone(660, 0.2, 'triangle', 0.15, 990); }
  playerDeath(){ this.playNoise(0.7, 1200, 60, 0.5); this.playTone(180, 0.6, 'sawtooth', 0.3, 40); }
  baseDestroyed(){ this.playNoise(1.2, 700, 40, 0.7); this.playTone(90, 1.1, 'sawtooth', 0.4, 25); }
  levelWin(){ const n = [392, 523, 659, 784, 659, 784, 1047]; n.forEach((f, i) => setTimeout(() => this.playTone(f, 0.16, 'square', 0.2), i * 130)); }
  startEngine(){
    if (!this.enabled || !this.ctx || this.engineOsc) return;
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineGain = ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain.gain.value = 0.05;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
  }
  setEngine(on){
    if (!this.ctx) return;
    if (on && !this.engineOsc) this.startEngine();
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.05);
    if (!on && this.engineOsc && this.engineGain){
      const o = this.engineOsc;
      setTimeout(() => { try { o.stop(); } catch(e){} }, 200);
      this.engineOsc = null;
    }
  }
  stopEngine(){ this.setEngine(false); }
  playTheme(){
    if (!this.enabled || !this.ctx) return;
    const notes = [
      [164.8, 1], [164.8, 1], [196, 1], [220, 1],
      [246.9, 1], [220, 1], [196, 1], [164.8, 1],
      [146.8, 1], [164.8, 1], [196, 1], [220, 2],
      [164.8, 1], [196, 1], [220, 1], [246.9, 1],
      [261.6, 1], [246.9, 1], [220, 1], [196, 1],
      [164.8, 2], [196, 1], [220, 1],
      [196, 1], [164.8, 1], [146.8, 2],
      [164.8, 3], [0, 1],
    ];
    let t = this.ctx.currentTime + 0.05;
    const beat = 0.21;
    for (const [f, len] of notes){
      if (f > 0){
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.12, t);
        g.gain.setValueAtTime(0.12, t + len * beat - 0.03);
        g.gain.linearRampToValueAtTime(0.001, t + len * beat);
        const o2 = this.ctx.createOscillator();
        o2.type = 'triangle'; o2.frequency.value = f / 2;
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.07, t);
        g2.gain.linearRampToValueAtTime(0.001, t + len * beat);
        o.connect(g); o2.connect(g2);
        g.connect(this.master); g2.connect(this.master);
        o.start(t); o.stop(t + len * beat);
        o2.start(t); o2.stop(t + len * beat);
      }
      t += len * beat;
    }
  }
}

if (typeof module !== 'undefined') module.exports = { SFX };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { SFX });
