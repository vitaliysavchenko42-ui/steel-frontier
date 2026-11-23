// Уровень M1: детерминированная карта, спавны, база

import { GRID, T } from './config.js';

// Спавн игрока (в клетках), врагов — 3 точки сверху, база 2x2 внизу по центру
export const PLAYER_CELL = [4, 22];
export const ENEMY_CELLS = [[1, 1], [12, 1], [24, 1]];
export const BASE_CELL = [12, 23]; // занимает cols 12-13, rows 23-24

// Кольцо стен вокруг базы: верх row 22, бока cols 11 и 14.
export function buildDefaultMap() {
  const grid = new Uint8Array(GRID * GRID);
  const set = (x, y, t) => {
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) grid[y * GRID + x] = t;
  };
  const rect = (x0, y0, w, h, t) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, t);
  };

  // Кирпичные перегородки, зеркально по горизонтали
  rect(2, 5, 4, 1, T.BRICK);   rect(20, 5, 4, 1, T.BRICK);
  rect(6, 8, 2, 4, T.BRICK);   rect(18, 8, 2, 4, T.BRICK);
  rect(2, 12, 4, 1, T.BRICK);  rect(20, 12, 4, 1, T.BRICK);
  rect(6, 15, 2, 4, T.BRICK);  rect(18, 15, 2, 4, T.BRICK);
  rect(2, 19, 4, 1, T.BRICK);  rect(20, 19, 4, 1, T.BRICK);

  // Сталь: пара опор
  set(12, 6, T.STEEL); set(13, 6, T.STEEL);
  set(12, 19, T.STEEL); set(13, 19, T.STEEL);

  // Пруды (пули пролетают, танки нет)
  rect(8, 8, 3, 2, T.WATER); rect(15, 8, 3, 2, T.WATER);

  // Лес (укрытие: пули пролетают, танки скрываются)
  rect(3, 9, 3, 3, T.FOREST); rect(20, 9, 3, 3, T.FOREST);

  // База: стены-кольцо + база 2x2
  rect(11, 22, 4, 1, T.WALL);
  set(11, 23, T.WALL); set(14, 23, T.WALL);
  set(11, 24, T.WALL); set(14, 24, T.WALL);
  rect(11, 25, 4, 1, T.WALL);
  rect(12, 23, 2, 2, T.BASE);

  return grid;
}

// Загрузка уровня из JSON-конфига (если карта задана строками), иначе дефолтная.
// Формат строк: '.' пусто, 'B' кирпич, 'S' сталь, 'W' вода, 'F' лес, 'E' база, 'X' стена базы
export function parseLevel(data) {
  const grid = new Uint8Array(GRID * GRID);
  if (!data || !Array.isArray(data.rows)) return buildDefaultMap();
  for (let y = 0; y < GRID && y < data.rows.length; y++) {
    const row = String(data.rows[y]);
    for (let x = 0; x < GRID && x < row.length; x++) {
      const ch = row[x];
      let t = T.EMPTY;
      if (ch === 'B') t = T.BRICK;
      else if (ch === 'S') t = T.STEEL;
      else if (ch === 'W') t = T.WATER;
      else if (ch === 'F') t = T.FOREST;
      else if (ch === 'E') t = T.BASE;
      else if (ch === 'X') t = T.WALL;
      grid[y * GRID + x] = t;
    }
  }
  return grid;
}
