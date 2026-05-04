/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';
import { Entity } from './Entity';
import { Player } from './Player';
import { Particle } from './Particle';
import { Rect } from '../types';
import { TILE_SIZE, GRAVITY, ASSETS } from '../constants';
import { soundManager } from '../lib/soundManager';

export class FallenAscendant extends Entity {
  public maxHp: number;
  public phase: 1 | 2 = 1;
  public state: 'IDLE' | 'DASH' | 'SLAM' | 'PROJECTILE' | 'ROAR' = 'IDLE';
  public stateTimer = 0;
  public animFrame = 0;
  public hitFlash = 0;
  public facing = -1;
  public telegraphRect: Rect | null = null;
  public laserActive = false;
  public roarStarted = false;

  constructor(x: number, y: number, scale: number = 1) {
    super();
    this.pos = new Vector(x, y);
    this.width = 64;
    this.height = 96;
    this.maxHp = 500 * scale;
    this.hp = this.maxHp;
  }

  update(player: Player, level: number[][], particles: Particle[], engine: any) {
    if (this.isDead) return;
    this.animFrame += 0.05;
    if (this.hitFlash > 0) this.hitFlash -= 16;
    if (this.stateTimer > 0) this.stateTimer -= 16;
    if (this.stunTimer > 0) {
      this.stunTimer -= 16;
      this.vel.x *= 0.5;
      return; 
    }

    // Phase Switch
    if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2;
      this.state = 'ROAR';
      this.stateTimer = 2000;
      engine.shakeIntensity = 20;
    }

    if (this.state === 'IDLE' && this.stateTimer <= 0) {
      if (this.phase === 1) {
        this.selectRandomAttack(player);
      } else {
        this.selectAggressiveAttack(player);
      }
    }

    // Execute states
    this.executeState(player, level, particles, engine);

    // Gravity and Movement
    if (this.state !== 'SLAM' || this.stateTimer < 500) {
      this.vel.y += GRAVITY;
    }
    this.applyMove(level);

    // Arena Constraints
    const arenaWidth = level[0].length * TILE_SIZE;
    if (this.pos.x < TILE_SIZE) { this.pos.x = TILE_SIZE; this.vel.x = 0; }
    if (this.pos.x + this.width > arenaWidth - TILE_SIZE) { this.pos.x = arenaWidth - TILE_SIZE - this.width; this.vel.x = 0; }
    if (this.pos.y < 0) { this.pos.y = 0; this.vel.y = 0; }

    // Collision with Player
    if (this.checkCollision(this.rect, player.rect)) {
      player.takeDamage(15, engine, this);
    }
    
    // Melee attack hit check
    if (player.isAttacking && player.weapon === 'SWORD') {
      const attackRect = {
        x: player.facing === 1 ? player.pos.x + player.width : player.pos.x - 30,
        y: player.pos.y,
        width: 30,
        height: player.height
      };
      if (this.checkCollision(attackRect, this.rect)) {
        this.takeDamage(25, particles, player);
      }
    }
  }

  selectRandomAttack(player: Player) {
    const r = Math.random();
    if (r < 0.33) {
      this.state = 'DASH';
      this.stateTimer = 1500; 
    } else if (r < 0.66) {
      this.state = 'SLAM';
      this.stateTimer = 1800;
    } else {
      this.state = 'PROJECTILE';
      this.stateTimer = 1500;
    }
    this.facing = player.pos.x > this.pos.x ? 1 : -1;
  }

  selectAggressiveAttack(player: Player) {
    const r = Math.random();
    if (r < 0.4) {
      this.state = 'DASH';
      this.stateTimer = 1000; 
    } else if (r < 0.7) {
      this.state = 'SLAM';
      this.stateTimer = 1200;
    } else {
      this.state = 'PROJECTILE';
      this.stateTimer = 1000;
    }
    this.facing = player.pos.x > this.pos.x ? 1 : -1;
  }

  executeState(player: Player, _level: number[][], particles: Particle[], engine: any) {
    this.telegraphRect = null;
    
    switch(this.state) {
      case 'DASH':
        if (this.stateTimer > 500) {
          this.telegraphRect = { 
            x: this.facing === 1 ? this.pos.x : this.pos.x - 400,
            y: this.pos.y + this.height/2 - 10,
            width: 400,
            height: 20
          };
        } else if (this.stateTimer > 0) {
          this.vel.x = this.facing * 15;
          if (Math.abs(this.stateTimer - 250) < 20) engine.shakeIntensity = 5;
        } else {
          this.state = 'IDLE';
          this.stateTimer = 1000;
          this.vel.x = 0;
        }
        break;
      case 'SLAM':
        if (this.stateTimer > 1000) {
          this.telegraphRect = { x: player.pos.x - 40, y: player.pos.y + player.height - 5, width: 80, height: 5 };
        } else if (this.stateTimer > 800) {
           this.pos.x = player.pos.x - this.width/2;
           this.pos.y = player.pos.y - 300;
           this.vel.y = 20;
        } else if (this.onGround && this.stateTimer > 0) {
            engine.shakeIntensity = 15;
            for(let i=0; i<10; i++) {
              particles.push(new Particle(new Vector(this.pos.x + this.width/2, this.pos.y + this.height), new Vector((i-5)*2, -2), '#ff0', 5, 0.05));
            }
            this.stateTimer = -1;
        } else if (this.stateTimer <= 0) {
           this.state = 'IDLE';
           this.stateTimer = 800;
        }
        break;
      case 'PROJECTILE':
        const laserWidth = 600;
        const laserHeight = 40;
        const laserY = this.pos.y + this.height/2 - laserHeight/2;
        const laserX = this.facing === 1 ? this.pos.x + this.width : this.pos.x - laserWidth;

        if (this.stateTimer > 400) {
           this.telegraphRect = { x: laserX, y: laserY, width: laserWidth, height: laserHeight };
           this.laserActive = false;
        } else if (this.stateTimer > 0) {
           this.laserActive = true;
           engine.shakeIntensity = Math.max(engine.shakeIntensity, 3);
           
           const laserRect = { x: laserX, y: laserY, width: laserWidth, height: laserHeight };
           if (this.checkCollision(laserRect, player.rect)) {
             player.takeDamage(2, engine, this); 
           }

           for(let i=0; i<3; i++) {
             const px = laserX + Math.random() * laserWidth;
             const py = laserY + Math.random() * laserHeight;
             particles.push(new Particle(new Vector(px, py), new Vector(0, (Math.random()-0.5)*2), this.phase === 2 ? '#f0f' : '#f00', 4, 0.1));
           }
        } else if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.stateTimer = 1200;
          this.laserActive = false;
        }
        break;
      case 'ROAR':
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.stateTimer = 500;
        }
        break;
    }
  }

  applyMove(level: number[][]) {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    
    const padding = 2;
    const gY2 = Math.floor((this.pos.y + this.height) / TILE_SIZE);
    const gX1 = Math.floor((this.pos.x + padding) / TILE_SIZE);
    const gX2 = Math.floor((this.pos.x + this.width - padding) / TILE_SIZE);

    this.onGround = false;
    if (gY2 < level.length && gY2 >= 0) {
      if ((gX1 >= 0 && gX1 < level[0].length && level[gY2][gX1] === 1) || 
          (gX2 >= 0 && gX2 < level[0].length && level[gY2][gX2] === 1)) {
        this.pos.y = gY2 * TILE_SIZE - this.height;
        this.vel.y = 0;
        this.onGround = true;
      }
    }
  }

  takeDamage(amount: number, particles: Particle[], player: Player) {
    if (this.hitFlash > 0 || this.state === 'ROAR') return;
    this.hp -= amount;
    this.hitFlash = 100;
    soundManager.playSFX(ASSETS.SFX_HIT);
    
    for (let i = 0; i < 3; i++) {
      particles.push(new Particle(
        new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
        new Vector((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
        '#fff',
        4,
        0.05
      ));
    }

    if (this.hp <= 0) {
      this.isDead = true;
      player.score += 5000;
      soundManager.playSFX(ASSETS.SFX_DEATH);
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle(
          new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
          new Vector((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20),
          '#fff',
          6,
          0.01
        ));
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    if (this.isDead) return;
    const sX = Math.floor(this.pos.x - camera.x);
    const sY = Math.floor(this.pos.y - camera.y);

    if (this.stunTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#fff';
      if (Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.8;
        ctx.fillRect(sX - 5, sY - 5, this.width + 10, this.height + 10);
      }
      ctx.restore();
    }

    if (this.telegraphRect) {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.1)';
      ctx.fillRect(this.telegraphRect.x - camera.x, this.telegraphRect.y - camera.y, this.telegraphRect.width, this.telegraphRect.height);
    }

    if (this.hitFlash > 0) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(sX, sY, this.width, this.height);
      return;
    }

    ctx.save();
    const bounce = Math.sin(this.animFrame * 0.5) * 10;
    
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(sX + 10, sY + 20 + bounce);
    ctx.lineTo(sX - 40, sY + this.height + bounce);
    ctx.lineTo(sX + this.width + 40, sY + this.height + bounce);
    ctx.lineTo(sX + this.width - 10, sY + 20 + bounce);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sX, sY + bounce, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(this.animFrame * 4) * 0.3;
    ctx.moveTo(sX + 10, sY + 40 + bounce);
    ctx.lineTo(sX + 54, sY + 40 + bounce);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(sX + 12, sY - 20 + bounce, 40, 40, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 20; ctx.shadowColor = '#f59e0b';
    ctx.fillRect(sX + 22, sY - 5 + bounce, 6, 4);
    ctx.fillRect(sX + 36, sY - 5 + bounce, 6, 4);
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(sX + this.width, sY + 40 + bounce);
    ctx.rotate(Math.sin(this.animFrame) * 0.2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-2, -40, 4, 120); 
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(0, -40); ctx.quadraticCurveTo(60, -80, 80, -20); ctx.lineTo(0, -20); ctx.fill();
    ctx.restore();
    
    ctx.restore();
  }
}
