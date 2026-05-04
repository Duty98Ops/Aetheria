/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntityType = 'PLAYER' | 'ENEMY_BASIC' | 'ENEMY_ADVANCED' | 'ENEMY_ELITE' | 'COLLECTIBLE' | 'PARTICLE';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'UPGRADE' | 'MAP' | 'ENDING' | 'ESCAPE' | 'PAUSED';

export interface Theme {
  name: string;
  floor: string;
  primary: string;
  background: string;
  secondary: string;
  particle: string;
  runes: string;
  ambient: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface TowerNode {
  id: number;
  label: string;
  type: string;
  connections: number[];
  room: number;
}
