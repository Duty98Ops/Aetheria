/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';

export class CapePoint {
  constructor(public x: number, public y: number) {
    this.oldX = x;
    this.oldY = y;
  }
  public oldX: number;
  public oldY: number;
  public accX = 0;
  public accY = 0;
}

export class Cape {
  public points: CapePoint[] = [];
  public length = 6;
  public spacing = 5;

  constructor(x: number, y: number) {
    for (let i = 0; i < this.length; i++) {
      this.points.push(new CapePoint(x, y + i * this.spacing));
    }
  }

  update(anchorX: number, anchorY: number, facing: number, velX: number) {
    // Pin first point
    this.points[0].x = anchorX;
    this.points[0].y = anchorY;

    // Wind and movement physics
    const wind = Math.sin(Date.now() / 200) * 2;
    const drag = -velX * 0.5;

    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      const vx = (p.x - p.oldX) * 0.9;
      const vy = (p.y - p.oldY) * 0.9;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += vx + wind + drag;
      p.y += vy + 0.5; // Gravity
    }

    // Constraints
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < this.points.length - 1; j++) {
            const p1 = this.points[j];
            const p2 = this.points[j + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const diff = (this.spacing - dist) / dist;
            const ox = dx * diff * 0.5;
            const oy = dy * diff * 0.5;
            if (j > 0) {
              p1.x -= ox;
              p1.y -= oy;
            }
            p2.x += ox;
            p2.y += oy;
        }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Vector, color: string) {
    ctx.beginPath();
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.moveTo(this.points[0].x - camera.x, this.points[0].y - camera.y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x - camera.x, this.points[i].y - camera.y);
    }
    ctx.stroke();
    
    // Tattered edges
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
