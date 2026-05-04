/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';
import { Entity } from './Entity';
import { TILE_SIZE } from '../constants';

export class Projectile extends Entity {
  public life = 2000;
  public owner: 'PLAYER' | 'ENEMY';
  public canPassWalls = false;
  constructor(
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    owner: 'PLAYER' | 'ENEMY', 
    public color: string = '#fff',
    public damage: number = 15,
    w: number = 10,
    h: number = 4
  ) {
    super();
    this.pos = new Vector(x, y);
    this.vel = new Vector(vx, vy);
    this.width = w;
    this.height = h;
    this.owner = owner;
  }

  update(level: number[][], _scrollX: number, _scrollY: number) {
    this.pos.add(this.vel);
    this.life -= 16;
    if (this.life <= 0) this.isDead = true;
    
    // Wall collision
    if (!this.canPassWalls) {
      const gx = Math.floor(this.pos.x / TILE_SIZE);
      const gy = Math.floor(this.pos.y / TILE_SIZE);
      if (gy >= 0 && gy < level.length && gx >= 0 && gx < level[0].length) {
        if (level[gy][gx] === 1) this.isDead = true;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    // Glow effect
    const glow = Math.sin(Date.now() / 50) * 2;
    ctx.beginPath();
    ctx.roundRect(this.pos.x - camera.x, this.pos.y - camera.y, this.width + glow, this.height, 2);
    ctx.fill();
    ctx.restore();
  }
}
