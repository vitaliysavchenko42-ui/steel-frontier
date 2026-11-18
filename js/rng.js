"use strict";
function hashSeed(n){
  let x = (n | 0) ^ 0x9E3779B9;
  x = Math.imul(x ^ (x >>> 16), 0x21F0AAAD);
  x = Math.imul(x ^ (x >>> 15), 0x735A2D97);
  x = x ^ (x >>> 15);
  return (x >>> 0);
}
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed){
  const f = mulberry32(hashSeed(seed));
  return {
    next: f,
    int(lo, hi){ return lo + Math.floor(f() * (hi - lo + 1)); },
    chance(p){ return f() < p; },
    pick(arr){ return arr[Math.floor(f() * arr.length)]; },
    shuffle(arr){
      for (let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(f() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  };
}
if (typeof module !== 'undefined') module.exports = { hashSeed, mulberry32, makeRng };
if (typeof window !== 'undefined') Object.assign(window.__TANKS__ = window.__TANKS__ || {}, { makeRng });
