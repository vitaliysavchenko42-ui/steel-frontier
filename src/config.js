// Константы и утилиты — «Стальной Рубеж» (новая версия, M1)

export const GRID = 26;                 // тайлов по стороне
export const CELL = 16;                 // размер тайла, логических px
export const ARENA = GRID * CELL;       // 416
export const TANK = 32;                 // танк 2x2 тайла
export const BULLET = 16;               // пуля 1x1 тайл (по ТЗ)

export const T = {
  EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, FOREST: 4, ICE: 5, BASE: 6, WALL: 7
};

export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export const PLAYER = {
  speed: 68,            // px/сек
  bulletSpeed: 260,
  fireCooldown: 0.4,
  lives: 3,
  respawnTime: 2,
  shieldTime: 2
};

export const ENEMY = {
  speed: 46,
  bulletSpeed: 190,
  fireCooldown: 1.2,
  score: 100,
  spawnInterval: 3,
  total: 5,
  maxOn: 3
};

// Тайл, через который не проезжает танк
export function solidTank(t) {
  return t === T.BRICK || t === T.STEEL || t === T.WATER || t === T.BASE || t === T.WALL;
}

// Тайл, который останавливает пулю
export function blocksBullet(t) {
  return t === T.BRICK || t === T.STEEL || t === T.BASE || t === T.WALL;
}
