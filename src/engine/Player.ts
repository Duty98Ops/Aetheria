/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector } from './Vector';
import { Entity } from './Entity';
import { Cape } from './Cape';
import { Particle } from './Particle';
import { 
  TILE_SIZE, 
  GRAVITY, 
  FRICTION, 
  MAX_SPEED, 
  JUMP_FORCE, 
  WALL_JUMP_X, 
  WALL_JUMP_Y, 
  ATTACK_COOLDOWN, 
  PISTOL_COOLDOWN, 
  DASH_COOLDOWN_TIME, 
  MAGIC_COOLDOWN_TIME, 
  DASH_SPEED, 
  DASH_DURATION, 
  COYOTE_TIME, 
  JUMP_BUFFER, 
  INVULNERABILITY_TIME,
  ASSETS
} from '../constants';
import { soundManager } from '../lib/soundManager';

export class Player extends Entity {
  public width = 24;
  public height = 40;
  public isAttacking = false;
  public lastAttackTime = 0;
  public lastSwitchTime = 0;
  public weapon: 'SWORD' | 'PISTOL' = 'SWORD';
  public facing = 1; // 1 for right, -1 for left
  public wallSliding = false;
  public invulnerabilityTime = 0;
  public isCrouching = false;
  public normalHeight = 40;
  public crouchHeight = 22;
  public score = 0;
  public doubleJumpAvailable = true;
  public animFrame = 0;
  public walkTimer = 0;
  public wasOnGround = false;
  
  // New Mechanics
  public coyoteTimer = 0;
  public jumpBufferTimer = 0;
  public dashTimer = 0;
  public dashCooldown = 0;
  public magicCooldown = 0;
  public lungeTimer = 0;
  public hitFlash = 0;
  public parryTimer = 0;
  public isBlocking = false;
  public skills = new Set<string>();
  public cape: Cape;
  
  constructor() {
    super();
    this.cape = new Cape(0, 0);
  }

  update(input: { [key: string]: boolean }, level: number[][], particles: Particle[]) {
    // Cape update
    this.cape.update(
        this.pos.x + (this.facing === 1 ? 4 : this.width - 4), 
        this.pos.y + 12, 
        this.facing, 
        this.vel.x
    );
    // Timers
    if (this.coyoteTimer > 0) this.coyoteTimer -= 16;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= 16;
    if (this.dashTimer > 0) this.dashTimer -= 16;
    if (this.dashCooldown > 0) this.dashCooldown -= 16;
    if (this.magicCooldown > 0) this.magicCooldown -= 16;
    if (this.lungeTimer > 0) this.lungeTimer -= 16;
    if (this.hitFlash > 0) this.hitFlash -= 16;
    if (this.parryTimer > 0) this.parryTimer -= 16;

    // Block Logic
    this.isBlocking = input['x'] || input['k'] || input['ctrl'];
    if (input['x_pressed']) {
      this.parryTimer = 200; // 200ms perfect parry window
      delete input['x_pressed'];
    }

    // Crouch Logic
    const wantsToCrouch = (input['arrowdown'] || input['s']) && this.dashTimer <= 0;
    if (wantsToCrouch && this.onGround) {
      if (!this.isCrouching) {
        this.isCrouching = true;
        this.height = this.crouchHeight;
        this.pos.y += (this.normalHeight - this.crouchHeight);
      }
    } else if (this.isCrouching) {
      // Stand up if no ceiling or if they released crouch and there is space
      const padding = 2;
      const standY = this.pos.y - (this.normalHeight - this.crouchHeight);
      const standG1 = Math.floor((this.pos.x + padding) / TILE_SIZE);
      const standG2 = Math.floor((this.pos.x + this.width - padding) / TILE_SIZE);
      const standGY = Math.floor(standY / TILE_SIZE);
      
      const spaceAbove = !this.isCollidingWithTile(level, standG1, standGY) && !this.isCollidingWithTile(level, standG2, standGY);
      
      if (!wantsToCrouch && spaceAbove) {
        this.isCrouching = false;
        this.pos.y = standY;
        this.height = this.normalHeight;
      } else if (!this.onGround && spaceAbove) {
        // Stand up if knocked off ledge or jumping (if possible)
        this.isCrouching = false;
        this.pos.y = standY;
        this.height = this.normalHeight;
      }
    }

    // Animation
    this.animFrame += 0.1;
    if (Math.abs(this.vel.x) > 0.1) {
      this.walkTimer += 0.2;
    } else {
      this.walkTimer = 0;
      this.vel.x = 0; // Snap to zero if very small
    }
    
    // Horizontal Movement
    const speedLimit = this.isCrouching ? MAX_SPEED * 0.4 : MAX_SPEED;
    const accelRate = this.isCrouching ? 0.4 : 0.8;

    if (this.dashTimer > 0) {
      this.vel.x = this.facing * DASH_SPEED;
      this.vel.y = 0;
      // Dash particles
      if (Math.random() > 0.5) {
        particles.push(new Particle(new Vector(this.pos.x + this.width/2, this.pos.y + this.height/2), new Vector(0,0), this.isCrouching ? '#38bdf8' : '#fff', 4, 0.1));
      }
    } else {
      if (input['arrowleft'] || input['a']) {
        this.vel.x -= accelRate;
        this.facing = -1;
      } else if (input['arrowright'] || input['d']) {
        this.vel.x += accelRate;
        this.facing = 1;
      } else {
        this.vel.x *= FRICTION;
      }
    }

    if (Math.abs(this.vel.x) < 0.1) this.vel.x = 0;
    if (this.dashTimer <= 0) {
      this.vel.x = Math.max(-speedLimit, Math.min(speedLimit, this.vel.x));
    }

    // Jump Logic
    if (this.onGround) this.coyoteTimer = COYOTE_TIME;

    if (input['arrowup'] || input['w'] || input[' ']) {
      this.jumpBufferTimer = JUMP_BUFFER;
      delete input['arrowup'];
      delete input['w'];
      delete input[' '];
    }

    if (this.jumpBufferTimer > 0 && !this.isCrouching && this.dashTimer <= 0) {
      if (this.onGround || this.coyoteTimer > 0) {
        this.vel.y = JUMP_FORCE;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.spawnJumpParticles(particles, '#fff', 5);
        soundManager.playSFX(ASSETS.SFX_DASH); 
      } else if (this.wallSliding) {
        this.vel.y = WALL_JUMP_Y;
        this.vel.x = -this.facing * WALL_JUMP_X;
        this.onGround = false;
        this.wallSliding = false;
        this.jumpBufferTimer = 0;
        this.spawnJumpParticles(particles, '#fff', 5);
        soundManager.playSFX(ASSETS.SFX_DASH);
      } else if (this.doubleJumpAvailable && this.skills.has('DOUBLE_JUMP')) {
         this.vel.y = JUMP_FORCE;
         this.doubleJumpAvailable = false;
         this.jumpBufferTimer = 0;
         this.spawnJumpParticles(particles, '#fff', 5);
         soundManager.playSFX(ASSETS.SFX_DASH);
      }
    }

    // Dash Action
    if (input['shift'] && this.dashCooldown <= 0 && this.skills.has('DASH')) {
      this.dashTimer = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN_TIME;
      this.invulnerabilityTime = 300;
      soundManager.playSFX(ASSETS.SFX_DASH);
      delete input['shift'];
    }

    // Magic Attack
    if (input['v'] && this.magicCooldown <= 0 && this.skills.has('MAGIC')) {
       this.magicCooldown = MAGIC_COOLDOWN_TIME;
       // Signal magic attack
       this.isMagicAttacking = true; 
       setTimeout(() => this.isMagicAttacking = false, 200);
       delete input['v'];
    }

    // Gravity
    if (this.dashTimer <= 0) {
      this.vel.y += GRAVITY;
    }

    this.wasOnGround = this.onGround;
    // Apply Movement & Collisions
    this.applyMove(level);

    if (this.onGround && !this.wasOnGround) {
      this.spawnJumpParticles(particles, '#fff', 3);
    }

    // Wall Slide Logic
    this.checkWallSlide(level);

    if (this.onGround) {
      this.doubleJumpAvailable = true;
      if (Math.abs(this.vel.y) < 0.1) this.vel.y = 0;
    }

    // Invulnerability
    if (this.invulnerabilityTime > 0) {
      this.invulnerabilityTime -= 16;
    }

    // Weapon Switch
    if (input['q'] || input['e']) {
      const now = Date.now();
      if (now - this.lastSwitchTime > 300) {
        this.weapon = this.weapon === 'SWORD' ? 'PISTOL' : 'SWORD';
        this.lastSwitchTime = now;
        
        // Weapon switch particles
        const particleColor = this.weapon === 'SWORD' ? '#fff' : '#38bdf8';
        for (let i = 0; i < 15; i++) {
          particles.push(new Particle(
            new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
            new Vector((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
            particleColor,
            Math.random() * 4 + 2,
            0.04
          ));
        }
        soundManager.playSFX(ASSETS.SFX_DASH);
      }
      delete input['q'];
      delete input['e'];
    }

    // Attack
    if (input['z'] || input['k'] || input['f']) {
      const now = Date.now();
      const cooldown = this.weapon === 'SWORD' ? ATTACK_COOLDOWN : PISTOL_COOLDOWN;
      if (now - this.lastAttackTime > cooldown) {
        this.isAttacking = true;
        this.lastAttackTime = now;
        soundManager.playSFX(ASSETS.SFX_SWING);
        
        if (this.weapon === 'SWORD') {
            this.lungeTimer = 150;
        }
        
        setTimeout(() => this.isAttacking = false, 150);
      }
    }
  }

  applyMove(level: number[][]) {
    const substeps = Math.ceil(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.y)) / (TILE_SIZE * 0.5));
    const stepX = this.vel.x / substeps;
    const stepY = this.vel.y / substeps;

    for (let s = 0; s < substeps; s++) {
      // X-Collision 
      this.pos.x += stepX;
      const padding = 2; 
      const gridX1 = Math.floor((this.pos.x) / TILE_SIZE);
      const gridX2 = Math.floor((this.pos.x + this.width) / TILE_SIZE);
      const gridY1 = Math.floor((this.pos.y + padding) / TILE_SIZE);
      const gridY2 = Math.floor((this.pos.y + this.height - padding) / TILE_SIZE);

      if (this.isCollidingWithTile(level, gridX1, gridY1) || this.isCollidingWithTile(level, gridX1, gridY2)) {
        this.pos.x = (gridX1 + 1) * TILE_SIZE;
        this.vel.x = 0;
      } else if (this.isCollidingWithTile(level, gridX2, gridY1) || this.isCollidingWithTile(level, gridX2, gridY2)) {
        this.pos.x = gridX2 * TILE_SIZE - this.width;
        this.vel.x = 0;
      }

      // Y-Collision
      this.onGround = false;
      this.pos.y += stepY;
      const gX1 = Math.floor((this.pos.x + padding) / TILE_SIZE);
      const gX2 = Math.floor((this.pos.x + this.width - padding) / TILE_SIZE);
      const gY1 = Math.floor((this.pos.y) / TILE_SIZE);
      const gY2 = Math.floor((this.pos.y + this.height) / TILE_SIZE);

      if (this.isCollidingWithTile(level, gX1, gY2) || this.isCollidingWithTile(level, gX2, gY2)) {
        this.pos.y = gY2 * TILE_SIZE - this.height;
        this.vel.y = 0;
        this.onGround = true;
      } else if (this.isCollidingWithTile(level, gX1, gY1) || this.isCollidingWithTile(level, gX2, gY1)) {
        this.pos.y = (gY1 + 1) * TILE_SIZE;
        if (this.vel.y < 0) this.vel.y = 0;
      }
    }

    // Hard Boundary Check (Safety)
    const maxX = level[0].length * TILE_SIZE;
    const maxY = level.length * TILE_SIZE;
    if (this.pos.x < 0) this.pos.x = 0;
    if (this.pos.x > maxX - this.width) this.pos.x = maxX - this.width;
    if (this.pos.y < -100) this.pos.y = -100; // Allow some high jumping
    if (this.pos.y > maxY + 200) {
       this.hp = 0;
       this.isDead = true;
    }
  }

  isCollidingWithTile(level: number[][], gx: number, gy: number) {
    if (gy < 0 || gy >= level.length || gx < 0 || gx >= level[0].length) return true;
    const tile = level[gy][gx];
    return tile === 1 || tile === 4;
  }

  checkWallSlide(level: number[][]) {
    this.wallSliding = false;
    if (!this.onGround && this.vel.y > 0) {
      const gx = Math.floor((this.facing === 1 ? this.pos.x + this.width + 1 : this.pos.x - 1) / TILE_SIZE);
      const gy1 = Math.floor(this.pos.y / TILE_SIZE);
      const gy2 = Math.floor((this.pos.y + this.height - 1) / TILE_SIZE);
      
      if (this.isCollidingWithTile(level, gx, gy1) || this.isCollidingWithTile(level, gx, gy2)) {
        this.wallSliding = true;
        this.vel.y = Math.min(this.vel.y, 2); // Slide down slowly
      }
    }
  }

  spawnJumpParticles(particles: Particle[], color: string = '#ffffff', count: number = 8) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(
        new Vector(this.pos.x + this.width / 2, this.pos.y + this.height),
        new Vector((Math.random() - 0.5) * 4, -Math.random() * 2),
        color,
        2,
        0.05
      ));
    }
  }

  takeDamage(amount: number, engine?: any, attacker?: Entity) {
    if (this.invulnerabilityTime > 0) return;

    // Check for Parry/Block
    if (this.isBlocking) {
      if (this.parryTimer > 0 && attacker) {
        // PERFECT PARRY
        attacker.stunTimer = 1500; // 1.5s stun
        this.parryTimer = 0;
        this.invulnerabilityTime = 500; // Brief grace period
        if (engine) {
          engine.shakeIntensity = 15;
          // Parry Particles
          for (let i = 0; i < 20; i++) {
            engine.particles.push(new Particle(
              new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
              new Vector((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15),
              '#fff',
              3 + Math.random() * 4,
              0.02
            ));
          }
        }
        soundManager.playSFX(ASSETS.SFX_DASH); 
        
        return; 
      } else {
        // CHIP DAMAGE BLOCK
        this.hp -= amount * 0.2; // 80% damage reduction
        this.invulnerabilityTime = 300; // Small grace period
        this.hitFlash = 50; // Quicker hit flash for block
        if (engine) engine.shakeIntensity = 3;
        soundManager.playSFX(ASSETS.SFX_HIT);
        return;
      }
    }

    this.hp -= amount;
    this.invulnerabilityTime = INVULNERABILITY_TIME;
    this.hitFlash = 150;
    this.vel.y = -5;
    this.vel.x = -this.facing * 8;
    soundManager.playSFX(ASSETS.SFX_HIT);
    if (this.hp <= 0) {
        this.isDead = true;
        soundManager.playSFX(ASSETS.SFX_DEATH);
    }
  }

  public isMagicAttacking = false;

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    const screenX = Math.floor(this.pos.x - camera.x);
    const screenY = Math.floor(this.pos.y - camera.y);

    if (this.invulnerabilityTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
    
    // Atmospheric Glow around player
    ctx.save();
    const aura = ctx.createRadialGradient(screenX + this.width/2, screenY + this.height/2, 0, screenX + this.width/2, screenY + this.height/2, 100);
    aura.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(screenX - 50, screenY - 50, this.width + 100, this.height + 100);
    ctx.restore();

    // Cape Draw
    this.cape.draw(ctx, camera, '#450606');

    // Block Aura
    if (this.isBlocking) {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#0ea5e9';
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, screenY + this.height / 2, 30, 0, Math.PI * 2);
      ctx.stroke();
      
      // Pulse effect
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.2;
      ctx.fillStyle = '#0ea5e9';
      ctx.fill();
      ctx.restore();
    }

    // Fallen Knight Silhouette
    const bounce = Math.sin(this.animFrame) * 2;
    const lungeX = this.lungeTimer > 0 ? this.facing * 8 : 0;
    
    ctx.save();
    ctx.translate(screenX + Math.floor(this.width/2) + lungeX, screenY + this.height);
    
    // Armor Frame
    ctx.fillStyle = '#0f172a'; // Deep Obsidian
    ctx.strokeStyle = '#334155'; // Worn Iron
    ctx.lineWidth = 1.5;
    
    // Body Armor (Plates)
    const bodyH = this.isCrouching ? 16 : 28;
    const bodyY = this.isCrouching ? -16 : -36;
    
    // Chest Plate
    ctx.beginPath();
    ctx.roundRect(-12, bodyY + bounce, 24, bodyH, 4);
    ctx.fill();
    ctx.stroke();
    
    // Rust details
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#7c2d12'; // Rust
    ctx.fillRect(-10, bodyY + 5 + bounce, 8, 4);
    ctx.fillRect(2, bodyY + 15 + bounce, 6, 3);
    ctx.globalAlpha = 1.0;

    // Great Helmet
    const headY = this.isCrouching ? -28 : -48;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-10, headY + bounce, 20, 16, 4);
    ctx.fill();
    ctx.stroke();
    
    // Visor Slit
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, headY + 6 + bounce, 16, 4);

    // Soul Glow (Eyes)
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#d97706';
    const eyeOffsetX = this.facing === 1 ? 2 : -6;
    ctx.fillRect(eyeOffsetX, headY + 6 + bounce, 4, 3);
    ctx.shadowBlur = 0;

    // Rusted Greatsword / Staff
    ctx.save();
    const weaponX = this.facing === 1 ? 12 : -18;
    const weaponRot = Math.sin(this.animFrame * 0.5) * 0.1;
    ctx.translate(weaponX, -20 + bounce);
    ctx.rotate(weaponRot);
    
    if (this.weapon === 'SWORD') {
      // Greatsword
      ctx.fillStyle = '#475569'; // Steel
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-2, -40); ctx.lineTo(6, -40); ctx.lineTo(4, 0); ctx.fill();
      // Edge wear
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else {
      // Iron Arbalest
      ctx.fillStyle = '#2d1a0a';
      ctx.fillRect(0, 0, 14, 8);
      ctx.fillStyle = '#475569';
      ctx.fillRect(2, -4, 10, 4);
    }
    ctx.restore();
    
    // Combat Feedback Effects
    if (this.isAttacking) {
      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      if (this.weapon === 'SWORD') {
        const slash = ctx.createLinearGradient(0, -40, this.facing * 60, 0);
        slash.addColorStop(0, 'rgba(255,255,255,0.9)');
        slash.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = slash;
        ctx.beginPath();
        if (this.facing === 1) ctx.arc(0, -25, 60, -Math.PI/2, Math.PI/2);
        else ctx.arc(0, -25, 60, Math.PI/2, 3*Math.PI/2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.facing * 30, -18, 12, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
