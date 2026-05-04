/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';
import { Entity } from './Entity';
import { Player } from './Player';
import { Particle } from './Particle';
import { TILE_SIZE, GRAVITY, ASSETS } from '../constants';
import { soundManager } from '../lib/soundManager';

export function gx_out_of_bounds(gx: number, gy: number, level: number[][]) {
    return gy < 0 || gy >= level.length || gx < 0 || gx >= level[0].length;
}

export class Enemy extends Entity {
  public type: 'BASIC' | 'ADVANCED' | 'ELITE' = 'BASIC';
  public patrolRange = 100;
  public startX = 0;
  public direction = 1;
  public speed = 1.5;
  public initialPos: Vector;
  public initialType: 'BASIC' | 'ADVANCED' | 'ELITE';
  public baseHp: number;
  public animFrame = 0;
  public hitFlash = 0;
  public dashCooldown = 0;
  public isDashing = false;

  constructor(x: number, y: number, type: 'BASIC' | 'ADVANCED' | 'ELITE' = 'BASIC', scale: number = 1) {
    super();
    this.pos = new Vector(x, y);
    this.initialPos = new Vector(x, y);
    this.initialType = type;
    this.startX = x;
    this.type = type;
    
    if (type === 'ELITE') {
      this.baseHp = 180;
      this.speed = 2.0 * (1 + (scale - 1) * 0.5);
      this.width = 44;
      this.height = 44;
    } else {
      this.baseHp = type === 'ADVANCED' ? 60 : 30;
      this.speed = (type === 'ADVANCED' ? 2.5 : 1.5) * (1 + (scale - 1) * 0.5);
      this.width = 32;
      this.height = 32;
    }
    
    this.hp = this.baseHp * scale;
  }

  update(player: Player, level: number[][], particles: Particle[], difficultyScale: number, engine: any) {
    this.animFrame += 0.1;
    if (this.hitFlash > 0) this.hitFlash -= 16;
    if (this.dashCooldown > 0) this.dashCooldown -= 16;
    
    if (this.isDead) {
      return;
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= 16;
      this.vel.x *= 0.8;
      return; 
    }

    const distToPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    
    const hasLOS = () => {
      if (distToPlayer > 400) return false;
      const startX = (this.pos.x + this.width / 2) / TILE_SIZE;
      const startY = (this.pos.y + this.height / 2) / TILE_SIZE;
      const endX = (player.pos.x + player.width / 2) / TILE_SIZE;
      const endY = (player.pos.y + player.height / 2) / TILE_SIZE;
      const steps = 10; 
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const checkX = Math.floor(startX + (endX - startX) * t);
        const checkY = Math.floor(startY + (endY - startY) * t);
        if (checkY >= 0 && checkY < level.length && checkX >= 0 && checkX < level[0].length) {
          if (level[checkY][checkX] === 1) return false;
        }
      }
      return true;
    };

    if (this.type === 'ELITE') {
      if (hasLOS()) {
        this.direction = player.pos.x > this.pos.x ? 1 : -1;
        
        if (distToPlayer < 200 && this.dashCooldown <= 0) {
          this.isDashing = true;
          this.dashCooldown = 2000;
          setTimeout(() => { this.isDashing = false; }, 400);
        }

        const moveSpeed = this.isDashing ? this.speed * 4 : this.speed;
        this.vel.x = this.direction * moveSpeed;
        
        if (this.isDashing && Math.random() > 0.5) {
          particles.push(new Particle(new Vector(this.pos.x + this.width/2, this.pos.y + this.height/2), new Vector(0,0), '#f8fafc', 4, 0.1));
        }
      } else {
        if (this.onGround && Math.random() < 0.02) {
          this.vel.y = -8; 
        }
        
        if (Math.abs(this.pos.x - this.startX) > this.patrolRange) {
          this.direction *= -1;
        }
        this.vel.x = this.direction * this.speed;
      }
    } else if (this.type === 'ADVANCED' && distToPlayer < 200) {
      this.direction = player.pos.x > this.pos.x ? 1 : -1;
      this.vel.x = this.direction * this.speed;
    } else {
      if (Math.abs(this.pos.x - this.startX) > this.patrolRange) {
        this.direction *= -1;
      }
      this.vel.x = this.direction * this.speed;
    }

    this.vel.y += GRAVITY;
    this.applyMove(level);

    if (this.checkCollision(this.rect, player.rect)) {
      player.takeDamage(this.type === 'ELITE' ? 12 : 10, engine, this);
      if (this.isDashing) {
        this.isDashing = false; 
      }
    }

    if (player.isAttacking) {
      const attackRect = {
        x: player.facing === 1 ? player.pos.x + player.width : player.pos.x - 50,
        y: player.pos.y,
        width: 50,
        height: player.height
      };
      if (this.checkCollision(attackRect, this.rect)) {
        this.takeDamage(20, particles, player);
      }
    }

    if (Math.random() < 0.15) {
      particles.push(new Particle(
        new Vector(this.pos.x + Math.random() * this.width, this.pos.y + Math.random() * this.height),
        new Vector((Math.random() - 0.5) * 0.5, -Math.random() * 1.5),
        this.type === 'ELITE' ? '#38bdf8' : '#000', 
        2 + Math.random() * 2,
        0.02
      ));
    }
  }

  takeDamage(amount: number, particles: Particle[], player: Player) {
    if (this.hitFlash > 0) return;
    this.hp -= amount;
    this.hitFlash = 100;
    this.pos.x += this.direction * -15; 
    soundManager.playSFX(ASSETS.SFX_HIT);
    
    const particleColor = this.type === 'BASIC' ? '#f87171' : (this.type === 'ADVANCED' ? '#f472b6' : '#94a3b8');
    for (let i = 0; i < (this.type === 'ELITE' ? 10 : 5); i++) {
        particles.push(new Particle(
          new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
          new Vector((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
          particleColor,
          3,
          0.05
        ));
      }

    if (this.hp <= 0) {
      this.isDead = true;
      const scoreGain = this.type === 'ELITE' ? 1000 : 100;
      player.score += Math.round(scoreGain * (1 + (player.score / 10000))); 
      soundManager.playSFX(ASSETS.SFX_DEATH);
      
      const explosionColor = this.type === 'ELITE' ? '#38bdf8' : '#fbbf24';
      for (let i = 0; i < (this.type === 'ELITE' ? 30 : 15); i++) {
        particles.push(new Particle(
          new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
          new Vector((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
          explosionColor,
          this.type === 'ELITE' ? 6 : 4,
          0.02
        ));
      }
    }
  }

  applyMove(level: number[][]) {
    this.pos.x += this.vel.x;
    const gridX = Math.floor((this.direction === 1 ? this.pos.x + this.width : this.pos.x) / TILE_SIZE);
    const gridY = Math.floor((this.pos.y + this.height / 2) / TILE_SIZE);
    if (gx_out_of_bounds(gridX, gridY, level) || level[gridY][gridX] === 1) {
      this.direction *= -1;
      this.vel.x = 0;
    }

    this.pos.y += this.vel.y;
    const gY = Math.floor((this.pos.y + this.height) / TILE_SIZE);
    const gX = Math.floor((this.pos.x + this.width / 2) / TILE_SIZE);
    if (!gx_out_of_bounds(gX, gY, level) && level[gY][gX] === 1) {
      this.pos.y = gY * TILE_SIZE - this.height;
      this.vel.y = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    if (this.isDead) return;
    const screenX = Math.floor(this.pos.x - camera.x);
    const screenY = Math.floor(this.pos.y - camera.y);

    if (this.stunTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#fff';
      if (Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.8;
        ctx.fillRect(screenX - 5, screenY - 5, this.width + 10, this.height + 10);
      }
      ctx.restore();
    }

    ctx.save();
    
    if (this.type === 'BASIC') {
      const bounce = Math.sin(this.animFrame * 1.5) * 4;
      ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,0,0,0.8)';
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(screenX + 4, screenY + 10 + bounce, 24, 20, 4); ctx.fill();
      
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath(); ctx.roundRect(screenX + 10, screenY + bounce, 12, 12, 2); ctx.fill();
      
      ctx.fillStyle = '#ef4444'; ctx.fillRect(screenX + 11, screenY + 4 + bounce, 3, 2); ctx.fillRect(screenX + 18, screenY + 4 + bounce, 3, 2);
      
    } else if (this.type === 'ADVANCED') {
      const hover = Math.sin(this.animFrame) * 12;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(screenX + 16, screenY + 20 + hover, 20, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1.0;
      
      ctx.fillStyle = '#1e1b4b'; 
      ctx.beginPath(); ctx.moveTo(screenX + 16, screenY + hover); ctx.lineTo(screenX, screenY + 44 + hover); ctx.lineTo(screenX + 32, screenY + 44 + hover); ctx.fill();
      
      ctx.fillStyle = '#a855f7'; ctx.shadowBlur = 20; ctx.shadowColor = '#a855f7';
      ctx.beginPath(); ctx.arc(screenX + 16, screenY + 20 + hover, 5, 0, Math.PI*2); ctx.fill();
      
    } else {
      const bounce = Math.sin(this.animFrame * 2) * 5;
      ctx.fillStyle = '#020617'; ctx.strokeStyle = '#38bdf8';
      ctx.beginPath(); ctx.roundRect(screenX, screenY + bounce, this.width, this.height, 12); ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = '#fff';
      const eyeX = this.direction === 1 ? 30 : 4;
      ctx.fillRect(screenX + eyeX, screenY + 12 + bounce, 10, 4);
    }
    ctx.restore();
  }
}
