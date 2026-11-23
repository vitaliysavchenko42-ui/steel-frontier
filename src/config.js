// Константы — «Стальной Рубеж» v5.x (Alpha, баланс v4: скорости снижены)

export const GRID = 26;
export const CELL = 16;
export const ARENA = GRID * CELL;
export const TANK = 32;
export const BULLET = 16;

export const T = {
  EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, FOREST: 4, ICE: 5, BASE: 6, WALL: 7
};

export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export const PLAYER = {
  speed: 50,
  respawnTime: 2,
  shieldTime: 2,
  lives: 3,
  fireCooldown: 0.45,
  bulletSpeed: [190, 230, 230, 250],
  maxBullets: [1, 1, 2, 2],
  breaksSteel: [false, false, false, true]
};

export const ENEMY_TYPES = {
  basic: { hp: 1, speed: 34, bulletSpeed: 135, fireRate: 1.5, score: 100, size: 32 },
  fast:  { hp: 1, speed: 56, bulletSpeed: 135, fireRate: 1.9, score: 200, size: 32 },
  fire:  { hp: 1, speed: 36, bulletSpeed: 155, fireRate: 1.0, score: 300, size: 32 },
  armor: { hp: 4, speed: 22, bulletSpeed: 135, fireRate: 2.0, score: 400, size: 32 },
  boss:  { hp: 20, speed: 20, bulletSpeed: 145, fireRate: 1.3, score: 2000, size: 48 }
};

export const BONUS_TTL = 15;
export const BONUS_DROP = 0.2;
export const BONUS_SCORE = 500;
export const LEVEL_SCORE = 1000;

export const BONUS = {
  star:    { name: 'Звезда' },
  helmet:  { name: 'Шлем', time: 10 },
  clock:   { name: 'Часы', time: 8 },
  grenade: { name: 'Граната' },
  shovel:  { name: 'Лопата', time: 15 },
  tank:    { name: 'Танк' }
};

export const BONUS_LIST = ['star', 'helmet', 'clock', 'grenade', 'shovel', 'tank'];

export function solidTank(t) {
  return t === T.BRICK || t === T.STEEL || t === T.WATER || t === T.BASE || t === T.WALL;
}

export function blocksBullet(t) {
  return t === T.BRICK || t === T.STEEL || t === T.BASE || t === T.WALL;
}
