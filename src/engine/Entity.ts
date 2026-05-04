/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';
import { Rect } from '../types';
import { TILE_SIZE } from '../constants';

export class Entity {
  public pos: Vector = new Vector(0, 0);
  public vel: Vector = new Vector(0, 0);
  public width: number = TILE_SIZE;
  public height: number = TILE_SIZE;
  public onGround: boolean = false;
  public hp: number = 100;
  public isDead: boolean = false;
  public stunTimer = 0;

  get rect(): Rect {
    return { x: this.pos.x, y: this.pos.y, width: this.width, height: this.height };
  }

  checkCollision(rect1: Rect, rect2: Rect) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }
}
