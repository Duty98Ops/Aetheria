/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';

export class Particle {
  public life = 1.0;
  constructor(
    public pos: Vector,
    public vel: Vector,
    public color: string,
    public size: number = 4,
    public decay: number = 0.05
  ) {}

  update() {
    this.pos.add(this.vel);
    this.life -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(Math.floor(this.pos.x - camera.x), Math.floor(this.pos.y - camera.y), this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
