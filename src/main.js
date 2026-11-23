// Точка входа v2: меню, цикл 60 Гц, HUD, переходы уровней, диагностика ошибок

import { ARENA } from './config.js?v=2';
import { createGame, startLevel, startCampaign, step } from './engine.js?v=2';
import { draw } from './render.js?v=3';
import { createInput } from './input.js?v=2';
import { unlock, setMuted, playEvent } from './sound.js?v=2';
import { LAST_CAMPAIGN_LEVEL } from './level.js?v=2';