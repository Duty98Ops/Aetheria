/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';
import { Entity } from './Entity';
import { Player } from './Player';
import { Particle } from './Particle';
import { TILE_SIZE } from '../constants';
import { HazardType } from '../types';

export class Hazard extends Entity {
  public timer = 0;
  public warningDuration = 1000;
  public activeDuration = 1000;
  public isWarning = true;
  public isFinished = false;

  constructor(
    public type: HazardType,
    x: number,
    y: number,
    public damage: number = 20,
    w: number = TILE_SIZE,
    h: number = TILE_SIZE
  ) {
    super();
    this.pos = new Vector(x, y);
    this.width = w;
    this.height = h;
  }

  update(player: Player, particles: Particle[], level: number[][], engine: any) {
    this.timer += 16;

    if (this.isWarning && this.timer >= this.warningDuration) {
      this.isWarning = false;
      this.timer = 0;
      
      // Spawn "burst" particles when activating
      for (let i = 0; i < 10; i++) {
        particles.push(new Particle(
          new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
          new Vector((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
          this.type === 'VOID_ZONE' ? '#a855f7' : '#f87171',
          4,
          0.05
        ));
      }
    }

    if (!this.isWarning) {
      if (this.type === 'FALLING_DEBRIS') {
        this.vel.y += 0.5; // Gravity for debris
        this.pos.add(this.vel);
        
        // Wall collision for debris
        const gx = Math.floor((this.pos.x + this.width / 2) / TILE_SIZE);
        const gy = Math.floor((this.pos.y + this.height) / TILE_SIZE);
        if (gy < level.length && gx < level[0].length && level[gy][gx] === 1) {
          this.isFinished = true;
          engine.shakeIntensity = Math.max(engine.shakeIntensity, 5);
        }
      } else {
        // Zone based hazards
        if (this.timer >= this.activeDuration) {
          this.isFinished = true;
        }
      }

      // Check collision with player
      if (this.checkCollision(this.rect, player.rect)) {
        player.takeDamage(this.damage, engine, this);
        if (this.type === 'FALLING_DEBRIS') {
            this.isFinished = true;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    const sX = this.pos.x - camera.x;
    const sY = this.pos.y - camera.y;

    if (this.isWarning) {
      ctx.save();
      const alpha = 0.1 + Math.sin(Date.now() / 150) * 0.05;
      const pulse = 1 + Math.sin(Date.now() / 300) * 0.1;
      
      ctx.translate(sX + this.width/2, sY + this.height/2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(sX + this.width/2), -(sY + this.height/2));

      ctx.fillStyle = this.type === 'VOID_ZONE' ? `rgba(168, 85, 247, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.type === 'VOID_ZONE' ? '#a855f7' : '#f43f5e';
      ctx.fillRect(sX, sY, this.width, this.height);
      
      // Warning lines
      ctx.strokeStyle = this.type === 'VOID_ZONE' ? '#a855f7' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(sX, sY, this.width, this.height);
      
      if (this.type === 'VOID_ZONE') {
        // Mystic symbols in warning zone
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.font = '10px serif';
        ctx.fillText('Ω', sX + this.width/2 - 4, sY + this.height/2 + 4);
      }
      ctx.restore();
    } else {
      ctx.save();
      if (this.type === 'FALLING_DEBRIS') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#1e293b';
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        // Jagged rock shape
        ctx.moveTo(sX, sY + 5);
        ctx.lineTo(sX + this.width * 0.3, sY);
        ctx.lineTo(sX + this.width * 0.7, sY + 3);
        ctx.lineTo(sX + this.width, sY + 8);
        ctx.lineTo(sX + this.width * 0.8, sY + this.height);
        ctx.lineTo(sX + this.width * 0.2, sY + this.height - 2);
        ctx.closePath();
        ctx.fill();
        
        // Highlights
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (this.type === 'VOID_ZONE') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#a855f7';
        
        // Dark core
        ctx.fillStyle = '#2e1065';
        ctx.fillRect(sX, sY + this.height - 8, this.width, 8);

        // Rising spikes
        ctx.fillStyle = '#7e22ce';
        for(let i=0; i<this.width; i+=12) {
          const h = 20 + Math.sin(Date.now()/150 + i)*15;
          ctx.beginPath();
          ctx.moveTo(sX + i, sY + this.height);
          ctx.lineTo(sX + i + 6, sY + this.height - h);
          ctx.lineTo(sX + i + 12, sY + this.height);
          ctx.fill();
        }
        
        // Particles
        if (Math.random() < 0.3) {
            const pX = sX + Math.random() * this.width;
            ctx.fillStyle = '#c084fc';
            ctx.fillRect(pX, sY + this.height - Math.random()*40, 2, 2);
        }
      }
      ctx.restore();
    }
  }
}
