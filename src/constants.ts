/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Theme, Skill, TowerNode } from './types';

export const ASSETS = {
  BGM_MENU: '',
  BGM_GAME: '',
  BGM_BOSS: '',
  SFX_SWING: '', 
  SFX_DASH: '',
  SFX_HIT: '',
  SFX_DEATH: '',
  SFX_PORTAL: ''
};

export const TILE_SIZE = 32;
export const GRAVITY = 0.5;
export const FRICTION = 0.8;
export const MAX_SPEED = 6;
export const JUMP_FORCE = -10;
export const WALL_JUMP_X = 8;
export const WALL_JUMP_Y = -8;
export const ATTACK_COOLDOWN = 300;
export const PISTOL_COOLDOWN = 400;
export const DASH_COOLDOWN_TIME = 1000;
export const MAGIC_COOLDOWN_TIME = 1200;
export const DASH_SPEED = 20; 
export const DASH_DURATION = 180; 
export const COYOTE_TIME = 120;
export const JUMP_BUFFER = 200;
export const INVULNERABILITY_TIME = 1200; 
export const RESPAWN_DELAY = 10000;
export const SAVE_KEY = 'aetheria_fallen_ascent_save';
export const CYCLE_DIFFICULTY_STEP = 0.2; 

export const THEMES: Theme[] = [
  { name: 'GRAVEYARD OF HEROES', floor: 'CHAMBER I', primary: '#94a3b8', background: '#020617', secondary: '#1e1b4b', particle: '#475569', runes: 'rgba(148, 163, 184, 0.1)', ambient: 'rgba(10, 15, 30, 0.4)' },
  { name: 'CARNIAN BLOOD SANCTUM', floor: 'CHAMBER II', primary: '#ef4444', background: '#0c0202', secondary: '#450a0a', particle: '#7f1d1d', runes: 'rgba(239, 68, 68, 0.05)', ambient: 'rgba(50, 5, 5, 0.5)' },
  { name: 'SHATTERED ACADEMY', floor: 'CHAMBER III', primary: '#38bdf8', background: '#020617', secondary: '#0c4a6e', particle: '#0ea5e9', runes: 'rgba(56, 189, 248, 0.1)', ambient: 'rgba(5, 20, 40, 0.6)' },
  { name: 'THRONE OF THE ELDERBORN', floor: 'THE APEX', primary: '#fbbf24', background: '#000000', secondary: '#451a03', particle: '#f59e0b', runes: 'rgba(251, 191, 36, 0.1)', ambient: 'rgba(30, 20, 5, 0.7)' }
];

// 0: empty, 1: block, 2: spike, 3: checkpoint, 4: goal
export const MAPS = [
  // Room 1: The Descent (Corridor)
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Room 2: Abyssal Shaft
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1],
    [1,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Room 3: Throne Hall
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Room 4: THRONE ASCENT
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,4,4,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Room 5: BOSS ARENA
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Room 6: LOOT SANCTUM
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,4,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ]
];

export const SKILLS_LIST: Skill[] = [
  { id: 'DOUBLE_JUMP', name: 'Leven Shift', description: 'Perform a second jump in mid-air', icon: 'zap' },
  { id: 'DASH', name: 'Shadow Dash', description: 'Quickly dash forward (Shift)', icon: 'wind' },
  { id: 'MAGIC', name: 'Void Bolt', description: 'Fire a strong arc of energy (Press V)', icon: 'sparkles' }
];

export const TOWER_NODES: TowerNode[] = [
  { id: 0, label: 'FORSAKEN GATE', type: 'BATTLE', connections: [1, 2], room: 0 },
  { id: 1, label: 'CATACOMBS', type: 'BATTLE', connections: [3], room: 1 },
  { id: 2, label: 'SANCTUM', type: 'LOOT', connections: [3], room: 5 },
  { id: 3, label: 'ABYSSAL PEAK', type: 'ELITE', connections: [4], room: 2 },
  { id: 4, label: 'HIGH WALL', type: 'BATTLE', connections: [5], room: 3 },
  { id: 5, label: 'ELDER THRONE', type: 'BOSS', connections: [], room: 4 }
];
