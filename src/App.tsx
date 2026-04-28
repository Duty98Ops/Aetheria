/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Heart, Coins, Sword, Shield, Zap, Wind, Sparkles, ArrowLeft, ArrowRight, Pause, Settings, Volume2, VolumeX, X, Music } from 'lucide-react';
import { soundManager } from './lib/soundManager';

// --- CONSTANTS ---
const ASSETS = {
  BGM_MENU: 'https://cdn.pixabay.com/audio/2022/10/14/audio_9939fecf39.mp3', // Creepy Ambient
  BGM_GAME: 'https://cdn.pixabay.com/audio/2023/10/16/audio_f5f67b5b7f.mp3', // Dark Fantasy Cave
  BGM_BOSS: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c3c3a30a7d.mp3', // Epic Combat
  SFX_SWING: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7322a30b35.mp3', 
  SFX_DASH: 'https://cdn.pixabay.com/audio/2021/08/04/audio_32c0299f2b.mp3',
  SFX_HIT: 'https://cdn.pixabay.com/audio/2022/03/10/audio_f139fd1639.mp3',
  SFX_DEATH: 'https://cdn.pixabay.com/audio/2022/03/10/audio_510a703d98.mp3',
  SFX_PORTAL: 'https://cdn.pixabay.com/audio/2024/02/22/audio_78453f65e2.mp3'
};
const TILE_SIZE = 32;
const GRAVITY = 0.5;
const FRICTION = 0.8;
const MAX_SPEED = 6;
const JUMP_FORCE = -10;
const WALL_JUMP_X = 8;
const WALL_JUMP_Y = -8;
const ATTACK_COOLDOWN = 300;
const PISTOL_COOLDOWN = 400;
const DASH_COOLDOWN_TIME = 1000;
const MAGIC_COOLDOWN_TIME = 1200; // Increased for balance
const DASH_SPEED = 20; // Slightly faster dash
const DASH_DURATION = 180; // Crisper dash
const COYOTE_TIME = 120;
const JUMP_BUFFER = 200;
const INVULNERABILITY_TIME = 1200; // More forgiving
const RESPAWN_DELAY = 10000;
const SAVE_KEY = 'aetheria_fallen_ascent_save';
const CYCLE_DIFFICULTY_STEP = 0.2; // Slightly gentler scaling

const THEMES = [
  { name: 'ENTRANCE OF CORRUPTION', floor: 'FLOOR 1', primary: '#10b981', background: '#020617', secondary: '#064e3b', particle: '#059669', runes: 'rgba(16, 185, 129, 0.2)', ambient: 'rgba(16, 185, 129, 0.05)' },
  { name: 'BLOOD CAVERNS', floor: 'FLOOR 2', primary: '#ef4444', background: '#090000', secondary: '#450a0a', particle: '#7f1d1d', runes: 'rgba(239, 68, 68, 0.2)', ambient: 'rgba(239, 68, 68, 0.05)' },
  { name: 'ABYSSAL HALL', floor: 'FLOOR 3', primary: '#a855f7', background: '#020617', secondary: '#1e1b4b', particle: '#6366f1', runes: 'rgba(168, 85, 247, 0.2)', ambient: 'rgba(168, 85, 247, 0.05)' },
  { name: 'THRONE OF THE FALLEN', floor: 'FINAL FLOOR', primary: '#ffffff', background: '#000000', secondary: '#111827', particle: '#ffffff', runes: 'rgba(255, 255, 255, 0.1)', ambient: 'rgba(255, 255, 255, 0.05)' }
];

// --- TYPES ---
type EntityType = 'PLAYER' | 'ENEMY_BASIC' | 'ENEMY_ADVANCED' | 'COLLECTIBLE' | 'PARTICLE';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- UTILS ---
class Vector {
  constructor(public x: number, public y: number) {}
  add(v: Vector) { this.x += v.x; this.y += v.y; return this; }
  multiply(s: number) { this.x *= s; this.y *= s; return this; }
  clone() { return new Vector(this.x, this.y); }
}

// --- LEVEL ASSETS & MAPS ---
// 0: empty, 1: block, 2: spike, 3: checkpoint, 4: goal
const MAPS = [
  // Room 1: The Descent (Corridor) - Luas dan Terbuka
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
    [1,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
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
  // Room 4: THRONE ASCENT (Corridor)
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,4,4,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Room 5: BOSS ARENA - The Fallen's Sanctum
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
  ]
];


// --- GAME LOGIC ---

class Particle {
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
    // Circle particles look premium
    ctx.arc(Math.floor(this.pos.x - camera.x), Math.floor(this.pos.y - camera.y), this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Entity {
  public pos: Vector = new Vector(0, 0);
  public vel: Vector = new Vector(0, 0);
  public width: number = TILE_SIZE;
  public height: number = TILE_SIZE;
  public onGround: boolean = false;
  public hp: number = 100;
  public isDead: boolean = false;

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

class Projectile extends Entity {
  public life = 2000;
  public owner: 'PLAYER' | 'ENEMY';
  constructor(x: number, y: number, vx: number, vy: number, owner: 'PLAYER' | 'ENEMY', public color: string = '#fff') {
    super();
    this.pos = new Vector(x, y);
    this.vel = new Vector(vx, vy);
    this.width = 10;
    this.height = 4;
    this.owner = owner;
  }

  update(level: number[][], scrollX: number, scrollY: number) {
    this.pos.add(this.vel);
    this.life -= 16;
    if (this.life <= 0) this.isDead = true;
    
    // Wall collision
    const gx = Math.floor(this.pos.x / TILE_SIZE);
    const gy = Math.floor(this.pos.y / TILE_SIZE);
    if (gy >= 0 && gy < level.length && gx >= 0 && gx < level[0].length) {
      if (level[gy][gx] === 1) this.isDead = true;
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

class Player extends Entity {
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
  public skills = new Set<string>();
  public hitFlash = 0;
  public lungeTimer = 0;

  update(input: { [key: string]: boolean }, level: number[][], particles: Particle[]) {
    // Timers
    if (this.coyoteTimer > 0) this.coyoteTimer -= 16;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= 16;
    if (this.dashTimer > 0) this.dashTimer -= 16;
    if (this.dashCooldown > 0) this.dashCooldown -= 16;
    if (this.magicCooldown > 0) this.magicCooldown -= 16;
    if (this.lungeTimer > 0) this.lungeTimer -= 16;
    if (this.hitFlash > 0) this.hitFlash -= 16;

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
        soundManager.playSFX(ASSETS.SFX_DASH); // Using dash sound for jump too for now
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
      const padding = 2; // Increased padding for stability
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

  takeDamage(amount: number) {
    if (this.invulnerabilityTime > 0) return;
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

  isMagicAttacking = false;

  draw(ctx: CanvasRenderingContext2D, camera: Vector) {
    const screenX = Math.floor(this.pos.x - camera.x);
    const screenY = Math.floor(this.pos.y - camera.y);

    if (this.invulnerabilityTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
    
    // Hit flash
    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(screenX, screenY, this.width, this.height);
      return;
    }

    // High-Quality Dark Fantasy Player Silhouette
    const bounce = Math.sin(this.animFrame) * 2;
    const lungeX = this.lungeTimer > 0 ? this.facing * 8 : 0;
    
    ctx.save();
    ctx.translate(screenX + Math.floor(this.width/2) + lungeX, screenY + this.height);
    
    if (this.dashTimer > 0) {
      ctx.scale(1.4, 0.7);
    }
    
    // Cape - Dynamic flowing physics simulation
    ctx.fillStyle = '#450a0a'; // Deep Blood Red
    ctx.beginPath();
    const capeW = 16 + Math.abs(this.vel.x) * 2;
    const capeH = this.isCrouching ? 15 : 32;
    const currentWind = Math.sin(this.animFrame * 2.5) * 6;
    ctx.moveTo(-8, this.isCrouching ? -12 : -30);
    ctx.bezierCurveTo(
      -12 - this.vel.x * 2, -20, 
      -capeW - this.vel.x * 3 + currentWind, -10, 
      -10 - this.vel.x * 2, 0
    );
    ctx.fill();

    // Body / Plate Armor
    ctx.fillStyle = '#1e293b'; // Slate Dark Metal
    ctx.strokeStyle = '#4ade80'; // Neon accent
    ctx.lineWidth = 1;
    const bodyH = this.isCrouching ? 16 : 26;
    const bodyY = this.isCrouching ? -16 : -34;
    ctx.beginPath();
    ctx.roundRect(-11, bodyY + bounce, 22, bodyH, 4);
    ctx.fill();
    ctx.stroke();

    // Helmet
    ctx.fillStyle = '#334155';
    const headY = this.isCrouching ? -28 : -46;
    ctx.beginPath();
    ctx.roundRect(-9, headY + bounce, 18, 14, 6);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = '#000';
    ctx.fillRect(-7, headY + 4 + bounce, 14, 3);

    // Glowing Eyes
    ctx.fillStyle = '#4ade80';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4ade80';
    const eyeX = this.facing === 1 ? 2 : -6;
    const eyeY_pos = this.isCrouching ? -22 : -40;
    ctx.fillRect(eyeX, eyeY_pos + bounce, 4, 3);
    ctx.shadowBlur = 0;

    // Current Weapon Visual
    ctx.save();
    const weaponX = this.facing === 1 ? 10 : -14;
    ctx.translate(weaponX, -22 + bounce);
    if (this.weapon === 'SWORD') {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(4, -20); ctx.lineTo(8, 0); ctx.fill(); // Greatsword shape
    } else {
      ctx.fillStyle = '#334155';
      ctx.roundRect(0, 0, 10, 6, 2); ctx.fill(); // Pistol
    }
    ctx.restore();
    
    // Combat Effects
    if (this.isAttacking) {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.weapon === 'SWORD' ? 'rgba(255,255,255,0.5)' : '#38bdf8';
      
      if (this.weapon === 'SWORD') {
        const slashGrad = ctx.createRadialGradient(0, -20, 10, 0, -20, 50);
        slashGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
        slashGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = slashGrad;
        ctx.beginPath();
        if (this.facing === 1) ctx.arc(0, -20, 45, -Math.PI/3, Math.PI/3);
        else ctx.arc(0, -20, 45, 2*Math.PI/3, 4*Math.PI/3);
        ctx.fill();
      } else {
        // Muzzle Flash
        const flashX = this.facing === 1 ? 25 : -35;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(flashX, -18, 10, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

class FallenAscendant extends Entity {
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

    // Arena Constraints (Position Fixing)
    const arenaWidth = level[0].length * TILE_SIZE;
    const arenaHeight = level.length * TILE_SIZE;
    if (this.pos.x < TILE_SIZE) { this.pos.x = TILE_SIZE; this.vel.x = 0; }
    if (this.pos.x + this.width > arenaWidth - TILE_SIZE) { this.pos.x = arenaWidth - TILE_SIZE - this.width; this.vel.x = 0; }
    if (this.pos.y < 0) { this.pos.y = 0; this.vel.y = 0; }

    // Collision with Player
    if (this.checkCollision(this.rect, player.rect)) {
      player.takeDamage(15);
    }
    
    // Check if hit by player melee attack
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
      this.stateTimer = 1500; // 1s telegraph + 0.5s action
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
      this.stateTimer = 1000; // Faster in phase 2
    } else if (r < 0.7) {
      this.state = 'SLAM';
      this.stateTimer = 1200;
    } else {
      this.state = 'PROJECTILE';
      this.stateTimer = 1000;
    }
    this.facing = player.pos.x > this.pos.x ? 1 : -1;
  }

  executeState(player: Player, level: number[][], particles: Particle[], engine: any) {
    this.telegraphRect = null;
    
    switch(this.state) {
      case 'DASH':
        if (this.stateTimer > 500) {
          // Telegraph: a line showing dash path
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
          // Jump preparation
          this.telegraphRect = { x: player.pos.x - 40, y: player.pos.y + player.height - 5, width: 80, height: 5 };
        } else if (this.stateTimer > 800) {
           this.pos.x = player.pos.x - this.width/2;
           this.pos.y = player.pos.y - 300;
           this.vel.y = 20;
        } else if (this.onGround && this.stateTimer > 0) {
            engine.shakeIntensity = 15;
            // Spawn shockwave particles
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
           // Charging - Telegraph
           this.telegraphRect = { x: laserX, y: laserY, width: laserWidth, height: laserHeight };
           this.laserActive = false;
        } else if (this.stateTimer > 0) {
           // Laser Active
           this.laserActive = true;
           engine.shakeIntensity = Math.max(engine.shakeIntensity, 3);
           
           // Damage Player
           const laserRect = { x: laserX, y: laserY, width: laserWidth, height: laserHeight };
           if (this.checkCollision(laserRect, player.rect)) {
             player.takeDamage(2); // Tick damage
           }

           // Spawn particles along laser
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
    
    // Simple ground/wall collision for boss (big rect)
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

    // Telegraph
    if (this.telegraphRect) {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
      ctx.fillRect(this.telegraphRect.x - camera.x, this.telegraphRect.y - camera.y, this.telegraphRect.width, this.telegraphRect.height);
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.4)';
      ctx.strokeRect(this.telegraphRect.x - camera.x, this.telegraphRect.y - camera.y, this.telegraphRect.width, this.telegraphRect.height);
    }

    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sX, sY, this.width, this.height);
      return;
    }

    // Demon King - Dark Fantasy Titan with Armor
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = this.phase === 2 ? '#f43f5e' : '#991b1b';
    
    // Armor base
    ctx.fillStyle = '#0f172a';
    ctx.roundRect(sX, sY, this.width, this.height, 10);
    ctx.fill();
    
    // Glowing Core / Armor Runes
    ctx.fillStyle = this.phase === 2 ? '#f43f5e' : '#ef4444';
    ctx.globalAlpha = 0.5 + Math.sin(this.animFrame * 5) * 0.3;
    ctx.fillRect(sX + 15, sY + 45, 34, 4);
    ctx.fillRect(sX + 20, sY + 55, 24, 4);
    ctx.globalAlpha = 1.0;

    // Horns - Large and Menacing
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    // Left Horn
    ctx.moveTo(sX + 10, sY + 10);
    ctx.quadraticCurveTo(sX - 30, sY - 40, sX + 5, sY - 50);
    ctx.lineTo(sX + 20, sY);
    // Right Horn
    ctx.moveTo(sX + 54, sY + 10);
    ctx.quadraticCurveTo(sX + 94, sY - 40, sX + 59, sY - 50);
    ctx.lineTo(sX + 44, sY);
    ctx.fill();

    // Eyes - Void Piercing
    ctx.fillStyle = this.phase === 2 ? '#fff' : '#ef4444';
    const eyeSize = this.state === 'ROAR' ? 18 : 12;
    ctx.shadowBlur = 15;
    ctx.fillRect(sX + 10, sY + 20, eyeSize, eyeSize);
    ctx.fillRect(sX + 42, sY + 20, eyeSize, eyeSize);
    
    // Laser Beam Visual
    if (this.laserActive) {
      const lW = 800;
      const lH = 50;
      const lY = sY + this.height/2 - lH/2;
      const lX = this.facing === 1 ? sX + this.width : sX - lW;
      const bColor = this.phase === 2 ? 'rgba(244, 63, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
      
      ctx.fillStyle = bColor;
      ctx.shadowBlur = 20;
      ctx.fillRect(lX, lY, lW, lH);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(lX, lY + 20, lW, 10);
      ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
  }
}

class Enemy extends Entity {
  public type: 'BASIC' | 'ADVANCED' = 'BASIC';
  public patrolRange = 100;
  public startX = 0;
  public direction = 1;
  public speed = 1.5;
  public initialPos: Vector;
  public initialType: 'BASIC' | 'ADVANCED';
  public baseHp: number;
  public animFrame = 0;
  public hitFlash = 0;

  constructor(x: number, y: number, type: 'BASIC' | 'ADVANCED' = 'BASIC', scale: number = 1) {
    super();
    this.pos = new Vector(x, y);
    this.initialPos = new Vector(x, y);
    this.initialType = type;
    this.startX = x;
    this.type = type;
    this.baseHp = type === 'ADVANCED' ? 60 : 30;
    this.hp = this.baseHp * scale;
    this.speed = (type === 'ADVANCED' ? 2.5 : 1.5) * (1 + (scale - 1) * 0.5);
    this.width = 32;
    this.height = 32;
  }

  update(player: Player, level: number[][], particles: Particle[], difficultyScale: number) {
    this.animFrame += 0.1;
    if (this.hitFlash > 0) this.hitFlash -= 16;
    if (this.isDead) {
      return;
    }

    const distToPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    
    if (this.type === 'ADVANCED' && distToPlayer < 200) {
      // Chase
      this.direction = player.pos.x > this.pos.x ? 1 : -1;
      this.vel.x = this.direction * this.speed;
    } else {
      // Patrol
      if (Math.abs(this.pos.x - this.startX) > this.patrolRange) {
        this.direction *= -1;
      }
      this.vel.x = this.direction * this.speed;
    }

    this.vel.y += GRAVITY;
    this.applyMove(level);

    // Check collision with player
    if (this.checkCollision(this.rect, player.rect)) {
      player.takeDamage(10);
    }

    // Check if hit by player attack
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
  }

  takeDamage(amount: number, particles: Particle[], player: Player) {
    if (this.hitFlash > 0) return;
    this.hp -= amount;
    this.hitFlash = 100;
    this.pos.x += this.direction * -15; // Knockback
    soundManager.playSFX(ASSETS.SFX_HIT);
    
    // Hit particles
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(
          new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
          new Vector((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
          this.type === 'BASIC' ? '#f87171' : '#f472b6',
          3,
          0.05
        ));
      }

    if (this.hp <= 0) {
      this.isDead = true;
      player.score += Math.round(100 * (1 + (player.score / 10000))); // Dynamic score based on progression
      soundManager.playSFX(ASSETS.SFX_DEATH);
      
      // Death explosion
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(
          new Vector(this.pos.x + this.width / 2, this.pos.y + this.height / 2),
          new Vector((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
          '#fbbf24',
          4,
          0.02
        ));
      }
    }
  }

  applyMove(level: number[][]) {
    this.pos.x += this.vel.x;
    // Basic obstacle detection for patrol
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

    ctx.save();
    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(screenX, screenY, this.width, this.height);
      ctx.restore();
      return;
    }

    if (this.type === 'BASIC') {
      // Dark Slime monster
      const squash = Math.sin(this.animFrame * 2) * 5;
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(screenX + 16, screenY + 20 + squash/2, 18 + squash, 12 - squash, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes (Glowing)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(screenX + 10, screenY + 16, 4, 4);
      ctx.fillRect(screenX + 18, screenY + 16, 4, 4);
    } else {
      // Wraith Style
      const hover = Math.sin(this.animFrame) * 8;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)'; // Ghostly Purple
      ctx.beginPath();
      ctx.moveTo(screenX + 16, screenY + hover);
      ctx.lineTo(screenX - 4, screenY + 36 + hover);
      ctx.lineTo(screenX + 16, screenY + 28 + hover);
      ctx.lineTo(screenX + 36, screenY + 36 + hover);
      ctx.fill();
      
      // Ghost Body Part
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.roundRect(screenX + 4, screenY + 4 + hover, 24, 20, 10);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#fff';
      ctx.fillRect(screenX + 12, screenY + 10 + hover, 8, 4);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
}
}

function gx_out_of_bounds(gx: number, gy: number, level: number[][]) {
    return gy < 0 || gy >= level.length || gx < 0 || gx >= level[0].length;
}

const SKILLS_LIST = [
  { id: 'DOUBLE_JUMP', name: 'Leven Shift', description: 'Perform a second jump in mid-air', icon: 'zap' },
  { id: 'DASH', name: 'Shadow Dash', description: 'Quickly dash forward (Shift)', icon: 'wind' },
  { id: 'MAGIC', name: 'Void Bolt', description: 'Fire a strong arc of energy (Press V)', icon: 'sparkles' }
];

const TOWER_NODES = [
  { id: 0, label: 'GATEWAY', type: 'BATTLE', connections: [1, 2], room: 0 },
  { id: 1, label: 'BONE PIT', type: 'BATTLE', connections: [3], room: 1 },
  { id: 2, label: 'LOOT CHAMBER', type: 'LOOT', connections: [3], room: 1 },
  { id: 3, label: 'VOID REACH', type: 'ELITE', connections: [4], room: 2 },
  { id: 4, label: 'THRONE ASCENT', type: 'BATTLE', connections: [5], room: 3 },
  { id: 5, label: 'THE FALLEN', type: 'BOSS', connections: [], room: 4 }
];

// --- MAIN COMPONENT ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'UPGRADE' | 'MAP' | 'ENDING' | 'ESCAPE' | 'PAUSED'>('START');
  const [hasSave, setHasSave] = useState(false);
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [totalEnemies, setTotalEnemies] = useState(0);
  const [score, setScore] = useState(0);
  const [room, setRoom] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [portalOpen, setPortalOpen] = useState(false);
  const [flicker, setFlicker] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Volume state for synced UI
  const [audioSettings, setAudioSettings] = useState(soundManager.getSettings());

  // --- AUDIO TRIGGERS ---
  const playSFX = (type: keyof typeof ASSETS) => {
    // Basic mapping or just use strings
    switch(type) {
      case 'SFX_SWING': soundManager.playSFX(ASSETS.SFX_SWING); break;
      case 'SFX_DASH': soundManager.playSFX(ASSETS.SFX_DASH); break;
      case 'SFX_HIT': soundManager.playSFX(ASSETS.SFX_HIT); break;
      case 'SFX_DEATH': soundManager.playSFX(ASSETS.SFX_DEATH); break;
      case 'SFX_PORTAL': soundManager.playSFX(ASSETS.SFX_PORTAL); break;
    }
  };
  const [bossActive, setBossActive] = useState(false);
  const [bossHP, setBossHP] = useState(0);
  const [bossMaxHP, setBossMaxHP] = useState(0);
  const [bossMessage, setBossMessage] = useState<string | null>(null);
  const [weapon, setWeapon] = useState<'SWORD' | 'PISTOL'>('SWORD');
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);
  const [clearedNodes, setClearedNodes] = useState<number[]>([]);
  const [escapeTimer, setEscapeTimer] = useState(60);
  const [currentMapNode, setCurrentMapNode] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [touchControlsActive, setTouchControlsActive] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobile);
      if (mobile) setTouchControlsActive(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (btn: string) => {
    const key = btn.toLowerCase();
    engineRef.current.input[key] = true;
    if (key === 'left') engineRef.current.input['arrowleft'] = true;
    if (key === 'right') engineRef.current.input['arrowright'] = true;
    if (key === 'up') engineRef.current.input['arrowup'] = true;
    if (key === 'jump') engineRef.current.input[' '] = true;
    if (key === 'attack') engineRef.current.input['z'] = true;
    if (key === 'dash') engineRef.current.input['shift'] = true;
  };

  const handleTouchEnd = (btn: string) => {
    const key = btn.toLowerCase();
    engineRef.current.input[key] = false;
    if (key === 'left') engineRef.current.input['arrowleft'] = false;
    if (key === 'right') engineRef.current.input['arrowright'] = false;
    if (key === 'up') engineRef.current.input['arrowup'] = false;
    if (key === 'jump') engineRef.current.input[' '] = false;
    if (key === 'attack') engineRef.current.input['z'] = false;
    if (key === 'dash') engineRef.current.input['shift'] = false;
  };

  const theme = THEMES[room % THEMES.length];

  // Save System
  const saveGame = (overrides = {}) => {
    const data = {
      health: engineRef.current.player.hp,
      maxHealth,
      score: engineRef.current.player.score,
      room,
      cycle,
      unlockedSkills,
      clearedNodes,
      currentMapNode,
      ...overrides
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    setHasSave(true);
  };

  const loadGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setHealth(data.health);
      setMaxHealth(data.maxHealth);
      setScore(data.score);
      setRoom(data.room);
      setCycle(data.cycle);
      setUnlockedSkills(data.unlockedSkills);
      setClearedNodes(data.clearedNodes);
      setCurrentMapNode(data.currentMapNode);
      
      engineRef.current.player.hp = data.health;
      engineRef.current.player.score = data.score;
      engineRef.current.player.skills = new Set(data.unlockedSkills);
      
      setGameState('MAP');
    }
  };

  const resetGame = () => {
    localStorage.removeItem(SAVE_KEY);
    setHasSave(false);
    setHealth(100);
    setMaxHealth(100);
    setScore(0);
    setRoom(0);
    setCycle(0);
    setUnlockedSkills([]);
    setClearedNodes([]);
    setCurrentMapNode(0);
    engineRef.current.player = new Player();
    setGameState('MAP');
  };

  // Game Engine Refs (to avoid re-renders)
  const engineRef = useRef({
    player: new Player(),
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    projectiles: [] as Projectile[],
    input: {} as { [key: string]: boolean },
    camera: new Vector(0, 0),
    level: MAPS[0],
    lastHP: 100,
    lastTime: 0,
    difficultyScale: 1,
    stars: [] as {x: number, y: number, s: number, layer: number}[],
    decorations: [] as {x: number, y: number, type: 'CHAIN' | 'PILLAR' | 'CRACK', seed: number}[],
    shakeIntensity: 0,
    portalOpen: false,
    boss: null as FallenAscendant | null,
    cinematicTimer: 0,
    escapeActive: false,
    escapeDuration: 60000,
  });


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      soundManager.resume();
      engineRef.current.input[e.key.toLowerCase()] = true;
      engineRef.current.input[e.key] = true; // Support both for safety
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.input[e.key.toLowerCase()] = false;
      engineRef.current.input[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial check for save
    if (localStorage.getItem(SAVE_KEY)) {
      setHasSave(true);
    }

    // Initial Parallax Elements
    engineRef.current.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 3000,
      y: Math.random() * 2000,
      s: Math.random() * 15 + 2,
      layer: Math.floor(Math.random() * 4) + 1
    }));

    engineRef.current.decorations = Array.from({ length: 30 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 1000,
      type: (['CHAIN', 'PILLAR', 'CRACK'] as const)[Math.floor(Math.random() * 3)],
      seed: Math.random()
    }));

    let animationId: number;
    const loop = (time: number) => {
      if (gameState === 'PLAYING' || gameState === 'ESCAPE') {
        update(time);
      }

      // Check for pause trigger
      if (engineRef.current.input['escape'] || engineRef.current.input['p']) {
        if (!showSettings) {
          if (gameState === 'PLAYING' || gameState === 'ESCAPE') {
            setGameState('PAUSED');
          } else if (gameState === 'PAUSED') {
            setGameState('PLAYING');
          }
        } else {
          setShowSettings(false);
        }
        delete engineRef.current.input['escape'];
        delete engineRef.current.input['p'];
      }
      
      if (gameState === 'PLAYING' || gameState === 'ESCAPE' || gameState === 'PAUSED') {
        draw(time);
      }
      
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, [gameState, room, cycle]);

  // --- BGM MANAGEMENT ---
  useEffect(() => {
    if (gameState === 'START' || gameState === 'MAP' || gameState === 'UPGRADE' || gameState === 'ENDING') {
      soundManager.playBGM(ASSETS.BGM_MENU);
    } else if (gameState === 'PLAYING' || gameState === 'ESCAPE') {
      if (bossActive) {
        soundManager.playBGM(ASSETS.BGM_BOSS);
      } else {
        soundManager.playBGM(ASSETS.BGM_GAME);
      }
    }
  }, [gameState, bossActive]);

  const initGame = (selectedRoom: number, type: string = 'BATTLE', nextCycle?: number) => {
    const engine = engineRef.current;
    const currentCycle = nextCycle ?? cycle;
    const scale = 1 + (currentCycle * CYCLE_DIFFICULTY_STEP) + (selectedRoom * 0.15);
    engine.difficultyScale = scale;
    engine.level = JSON.parse(JSON.stringify(MAPS[selectedRoom]));
    engine.portalOpen = false;
    engine.boss = null;
    engine.projectiles = [];
    engine.escapeActive = false;
    engine.escapeDuration = 60000;
    setRoom(selectedRoom);
    setPortalOpen(false);
    setBossActive(false);
    setBossMessage(null);
    setWeapon('SWORD');
    
    // Preserve and synchronize player state
    const currentScore = engine.player.score;
    const currentHp = engine.player.hp;
    const currentSkills = engine.player.skills;
    const currentWeapon = weapon;
    
    engine.player = new Player();
    engine.player.score = currentScore;
    engine.player.hp = currentHp;
    engine.player.skills = currentSkills;
    engine.player.pos = new Vector(64, 64);
    
    setHealth(currentHp);
    setWeapon(currentWeapon);
    engine.particles = [];
    
    // Create enemies based on room type and scale
    if (type === 'BOSS') {
      // Boss Arena
      engine.enemies = [];
      engine.boss = new FallenAscendant(2000, 100, scale);
      engine.boss.pos = new Vector(TILE_SIZE * 20, TILE_SIZE * 4);
      setBossActive(true);
      setBossMaxHP(engine.boss.maxHp);
      setBossHP(engine.boss.hp);
      setBossMessage("YOU HAVE REACHED THE THRONE");
      engine.cinematicTimer = 2000;
      setTimeout(() => setBossMessage(null), 3000);
    } else if (type === 'LOOT') {
      engine.enemies = []; 
      setBossMessage("A MOMENT OF PEACE...");
      setTimeout(() => setBossMessage(null), 2000);
    } else {
      // Dynamic Spawning: Find floor tiles
      const floorPositions: Vector[] = [];
      for (let y = 0; y < engine.level.length; y++) {
        for (let x = 0; x < engine.level[y].length; x++) {
          if (engine.level[y][x] === 1 && y > 0 && engine.level[y-1][x] === 0) {
            // Found a floor tile with air above it
            floorPositions.push(new Vector(x * TILE_SIZE, (y-1) * TILE_SIZE));
          }
        }
      }

      // Filter positions that are too close to the player start (64, 64)
      const safePositions = floorPositions.filter(p => Vector.dist(p, new Vector(64,64)) > 200);
      
      const basicCount = 2 + selectedRoom;
      const advancedCount = selectedRoom > 0 ? 1 + Math.floor(selectedRoom / 2) : 0;
      
      engine.enemies = [];
      
      // Shuffle positions for variety
      const shuffled = [...(safePositions.length > 0 ? safePositions : floorPositions)].sort(() => Math.random() - 0.5);
      
      for(let i=0; i<basicCount && i < shuffled.length; i++) {
        const p = shuffled[i];
        engine.enemies.push(new Enemy(p.x, p.y, 'BASIC', scale));
      }
      for(let i=0; i<advancedCount && (i + basicCount) < shuffled.length; i++) {
        const p = shuffled[i + basicCount];
        engine.enemies.push(new Enemy(p.x, p.y, 'ADVANCED', scale));
      }
    }
    
    setTotalEnemies(engine.enemies.length + (engine.boss ? 1 : 0));
    setEnemiesDefeated(0);
    setGameState('PLAYING');
    
    if (currentHp <= 0) {
      setHealth(100);
      engine.player.hp = 100;
    } else {
      engine.player.hp = currentHp;
    }
    
    setScore(engine.player.score);
  };

  const update = (time: number) => {
    const engine = engineRef.current;
    const { player, enemies, particles, level, difficultyScale, boss } = engine;

    if (engine.cinematicTimer > 0) {
      engine.cinematicTimer -= 16;
      particles.forEach(p => p.update());
      return;
    }

    player.update(engine.input, level, particles);
    
    // Skill Sync
    player.skills = new Set(unlockedSkills);

    if (gameState === 'ESCAPE') {
      const remainingTime = engine.escapeDuration / 1000;
      setEscapeTimer(Math.max(0, remainingTime));
      engine.escapeDuration -= 16;
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 1.5);
      if (engine.escapeDuration <= 0) {
        setGameState('GAMEOVER');
      }
    }

    // Handle Pistol Shooting
    if (player.isAttacking && player.weapon === 'PISTOL') {
       const bulletVel = player.facing * 10;
       engine.projectiles.push(new Projectile(
         player.pos.x + (player.facing === 1 ? player.width : -10),
         player.pos.y + 15,
         bulletVel,
         0,
         'PLAYER',
         '#38bdf8'
       ));
       player.isAttacking = false; // Reset so it only fires once per trigger
    }

    if (player.isMagicAttacking) {
       // Magic energy wave
       for(let i=0; i<3; i++) {
         const v = new Vector(player.facing * 12, (i-1)*2);
         engine.projectiles.push(new Projectile(
           player.pos.x + (player.facing === 1 ? player.width : -10),
           player.pos.y + 10,
           v.x,
           v.y,
           'PLAYER',
           '#a855f7'
         ));
       }
       player.isMagicAttacking = false;
    }

    // 2. Boss Logic Update
    if (boss) {
      boss.update(player, level, particles, engine);
      setBossHP(boss.hp);
      if (boss.isDead) {
        const isLastRoom = room === MAPS.length - 1;
        if (isLastRoom && !engine.escapeActive) {
          engine.escapeActive = true;
          saveGame({ clearedNodes: [...clearedNodes, currentMapNode] });
          setBossMessage("THE FALLEN HAS BEEN DEFEATED");
          engine.cinematicTimer = 4000;
          setTimeout(() => {
            setBossMessage("ESCAPE THE TOWER!");
            setGameState('ESCAPE');
            engine.escapeDuration = 60000; 
          }, 4000);
          engine.portalOpen = true;
          setPortalOpen(true);
        } else if (!engine.portalOpen) {
          engine.portalOpen = true;
          setPortalOpen(true);
        }
      }
    }

    // 3. Enemy Logic Update
    enemies.forEach(enemy => {
      enemy.update(player, level, particles, difficultyScale);
      
      // Auto-kill zone safeguard for stuck enemies
      if (enemy.pos.y > level.length * TILE_SIZE + 200) {
        enemy.isDead = true;
      }
    });

    // 4. Projectile Logic & Hits
    engine.projectiles.forEach(p => {
      p.update(level, engine.camera.x, engine.camera.y);
      if (p.owner === 'PLAYER') {
        enemies.forEach(enemy => {
          if (!enemy.isDead && enemy.checkCollision(p.rect, enemy.rect)) {
            enemy.takeDamage(15, particles, player);
            p.isDead = true;
          }
        });
        if (boss && !boss.isDead && boss.checkCollision(p.rect, boss.rect)) {
          boss.takeDamage(15, particles, player);
          p.isDead = true;
        }
      }
    });

    // 5. Cleanup & State Sync
    const activeEnemies = enemies.filter(e => !e.isDead);
    engine.enemies = activeEnemies;
    engine.projectiles = engine.projectiles.filter(p => !p.isDead);

    // 6. Progress & Completion Checks
    const remainingCount = activeEnemies.length + (boss && !boss.isDead ? 1 : 0);
    const accurateDefeated = Math.max(0, totalEnemies - remainingCount);
    if (accurateDefeated !== enemiesDefeated) {
      setEnemiesDefeated(accurateDefeated);
    }

    if (remainingCount === 0 && !engine.portalOpen) {
      engine.portalOpen = true;
      setPortalOpen(true);
      player.score += 500 * (cycle + 1);
      soundManager.playSFX(ASSETS.SFX_PORTAL);
    }

    // Ambient Flicker
    if (Math.random() > 0.95) setFlicker(0.8 + Math.random() * 0.4);
    else setFlicker(f => f + (1 - f) * 0.1);

    // 7. Portal Interaction
    let touchingPortal = false;
    if (engine.portalOpen) {
      const pRect = { x: player.pos.x, y: player.pos.y, width: player.width, height: player.height };
      for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
          if (level[y][x] === 4) {
             const tx = x * TILE_SIZE;
             const ty = y * TILE_SIZE;
             const portalRect = { x: tx - 10, y: ty - 10, width: TILE_SIZE + 20, height: TILE_SIZE + 20 };
             
             if (pRect.x < portalRect.x + portalRect.width &&
                 pRect.x + pRect.width > portalRect.x &&
                 pRect.y < portalRect.y + portalRect.height &&
                 pRect.y + pRect.height > portalRect.y) {
               touchingPortal = true;
               break;
             }
             const dx = (player.pos.x + player.width/2) - (tx + TILE_SIZE/2);
             const dy = (player.pos.y + player.height/2) - (ty + TILE_SIZE/2);
             if (Math.abs(dx) < 64 && Math.abs(dy) < 64) {
               touchingPortal = true;
               break;
             }
          }
        }
        if (touchingPortal) break;
      }
    }
    
    if (touchingPortal && !isTransitioning) {
        setIsTransitioning(true);
        const newClearedNodes = [...clearedNodes, currentMapNode];
        setClearedNodes(newClearedNodes);
        saveGame({ clearedNodes: newClearedNodes });
        setTimeout(() => {
          if (gameState === 'ESCAPE') {
            setGameState('ENDING');
          } else {
             setGameState('UPGRADE'); 
          }
          setIsTransitioning(false);
        }, 800);
        return;
    }

    // Edge of Screen / Room Boundary fallback for long corridors
    if (player.pos.x > (level[0].length * TILE_SIZE) - player.width - 20 && engine.portalOpen && !isTransitioning) {
       setIsTransitioning(true);
       setTimeout(() => {
         if (room < MAPS.length - 1) {
            setGameState('UPGRADE');
         } else {
            const nextCycle = cycle + 1;
            setCycle(nextCycle);
            setRoom(0);
            setGameState('UPGRADE');
         }
         setIsTransitioning(false);
       }, 800);
       return;
    }


    particles.forEach(p => p.update());
    engine.particles = particles.filter(p => p.life > 0);

    // Smooth Camera Follow with Look-Ahead
    const lookAhead = player.facing * 100;
    const targetX = player.pos.x - 400 + lookAhead;
    const targetY = player.pos.y - 300;
    
    // Smooth Lerp with Clamping
    engine.camera.x += (targetX - engine.camera.x) * 0.08;
    engine.camera.y += (targetY - engine.camera.y) * 0.08;

    // Constrain camera to level bounds
    const levelW = level[0].length * TILE_SIZE;
    const levelH = level.length * TILE_SIZE;
    
    // Only clamp if level is larger than view, otherwise center it
    if (levelW > 800) {
      engine.camera.x = Math.max(0, Math.min(levelW - 800, engine.camera.x));
    } else {
      engine.camera.x = (levelW - 800) / 2;
    }
    
    if (levelH > 600) {
      engine.camera.y = Math.max(0, Math.min(levelH - 600, engine.camera.y));
    } else {
      engine.camera.y = (levelH - 600) / 2;
    }

    // Shake Decay (In Ref)
    if (engine.shakeIntensity > 0) {
      engine.shakeIntensity *= 0.9;
      if (engine.shakeIntensity < 0.1) engine.shakeIntensity = 0;
    }

    // Detect Damage for Shake
    if (player.hp < engine.lastHP) {
      engine.shakeIntensity = 10;
      engine.lastHP = player.hp;
    }

    // Sync UI sparingly or at the end
    if (player.hp !== health) setHealth(player.hp);
    if (Math.abs(player.score - score) > 0) setScore(player.score);
    if (player.weapon !== weapon) setWeapon(player.weapon);
    if (player.isDead) setGameState('GAMEOVER');
  };

  const draw = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { player, enemies, particles, level, camera, stars, decorations, shakeIntensity, boss } = engineRef.current;
    const theme = THEMES[room % THEMES.length];

    // Shake Logic
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;

    // Atmospheric Render Loop
    const viewX = Math.floor(camera.x - shakeX);
    const viewY = Math.floor(camera.y - shakeY);
    const currentCamera = new Vector(viewX, viewY);

    // 1. Background Fill with Atmospheric Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 600);

    // 1.5 Scanline / Grid Overlay for Cyberpunk feel
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)';
    ctx.beginPath();
    for(let x = (-(viewX * 0.1) % 40); x < 800; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, 600); }
    for(let y = (-(viewY * 0.1) % 40); y < 600; y += 40) { ctx.moveTo(0, y); ctx.lineTo(800, y); }
    ctx.stroke();

    // 2. Parallax Pillars & Background Details
    decorations.forEach(d => {
      const pX = (d.x - viewX * 0.3) % 1200;
      const pY = d.y - viewY * 0.3;
      
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = theme.secondary;
      if (d.type === 'PILLAR') {
        ctx.fillRect(pX, -100, 50, 800);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(pX, -100, 50, 800);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(pX, -100); ctx.lineTo(pX, 800); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    });

    // 3. Level Tiles (Stone Texture)
    level.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          const tX = Math.floor(x * TILE_SIZE - viewX);
          const tY = Math.floor(y * TILE_SIZE - viewY);
          if (tX < -TILE_SIZE || tX > 800 || tY < -TILE_SIZE || tY > 600) return;
          
          // Base Tile
          ctx.fillStyle = '#1e293b'; 
          ctx.fillRect(tX, tY, TILE_SIZE, TILE_SIZE);
          
          // Metallic Detail
          ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
          ctx.fillRect(tX + 2, tY + 2, TILE_SIZE - 4, 1);
          ctx.fillRect(tX + 2, tY + TILE_SIZE - 3, TILE_SIZE - 4, 1);
          
          // Variation Detail
          if ((x + y) % 7 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(tX + 4, tY + 4, 2, 2);
          }
          
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 1;
          ctx.strokeRect(tX, tY, TILE_SIZE, TILE_SIZE);
        } else if (cell === 4) {
           // HIGH-VISIBILITY BLUE PORTAL VISUAL
           const tX = x * TILE_SIZE - viewX;
           const tY = y * TILE_SIZE - viewY;
           const centerX = tX + 16;
           const centerY = tY + 16;
           
           const primaryColor = '#06b6d4'; 
           const secondaryColor = '#1d4ed8'; 

           ctx.save();
           
           if (portalOpen) {
             // 1. ACTIVE PORTAL - Radiant Energy
             ctx.shadowBlur = 60 + Math.sin(time / 200) * 20;
             ctx.shadowColor = primaryColor;
             
             for (let i = 0; i < 4; i++) {
               const rot = (time / (500 + i * 150)) + (i * Math.PI / 2);
               const scaleX = 1 + Math.sin(time / 300 + i) * 0.1;
               const scaleY = 1 + Math.cos(time / 300 + i) * 0.1;
               
               ctx.save();
               ctx.translate(centerX, centerY);
               ctx.rotate(rot);
               ctx.scale(scaleX, scaleY);
               
               const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
               grad.addColorStop(0, '#fff');
               grad.addColorStop(0.3, primaryColor);
               grad.addColorStop(0.7, secondaryColor);
               grad.addColorStop(1, 'transparent');
               
               ctx.fillStyle = grad;
               ctx.globalAlpha = 0.8 - (i * 0.15);
               ctx.beginPath();
               ctx.ellipse(0, 0, 32 - i * 3, 58 - i * 3, 0, 0, Math.PI * 2);
               ctx.fill();
               ctx.restore();
             }

             // Electric Cyan Energy Rings
             for (let i = 0; i < 3; i++) {
               ctx.strokeStyle = i === 0 ? '#fff' : '#67e8f9';
               ctx.lineWidth = i === 0 ? 1 : 3;
               ctx.globalAlpha = (0.5 - i * 0.1) * (0.6 + Math.sin(time / 150 + i) * 0.4);
               ctx.beginPath();
               ctx.ellipse(centerX, centerY, 35 + i * 6, 65 + i * 6, Math.sin(time/600 + i) * 0.4, 0, Math.PI * 2);
               ctx.stroke();
             }

             // Ethereal Motes
             ctx.globalAlpha = 1.0;
             for (let i = 0; i < 10; i++) {
               const seed = (x * 7 + y * 13 + i);
               const speed = 0.0008 + (i * 0.0003);
               const mX = centerX + Math.cos(time * speed + seed) * (38 + Math.sin(time/400 + seed) * 15);
               const mY = centerY + Math.sin(time * speed + seed) * (68 + Math.cos(time/300 + seed) * 15);
               ctx.fillStyle = i % 2 === 0 ? '#fff' : '#67e8f9';
               ctx.beginPath(); ctx.arc(mX, mY, 1.5, 0, Math.PI * 2); ctx.fill();
             }
           } else {
             // 2. DORMANT PORTAL - Substantial Blue Silhouette
             ctx.shadowBlur = 40;
             ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
             ctx.fillStyle = '#083344';
             ctx.beginPath();
             ctx.ellipse(centerX, centerY, 28, 48, 0, 0, Math.PI * 2);
             ctx.fill();
             
             ctx.strokeStyle = '#67e8f9';
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.ellipse(centerX, centerY, 28, 48, Math.sin(time/1500) * 0.05, 0, Math.PI * 2);
             ctx.stroke();
           }
           ctx.restore();
        }
      });
    });

    // 4. Entities
    if (boss) {
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#f43f5e';
      boss.draw(ctx, currentCamera);
      ctx.restore();
    }
    
    enemies.forEach(enemy => {
      ctx.save();
      if (!enemy.isDead) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.type === 'ADVANCED' ? '#f43f5e' : '#0ea5e9';
        ctx.strokeStyle = enemy.type === 'ADVANCED' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(14, 165, 233, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(enemy.pos.x - viewX - 1, enemy.pos.y - viewY - 1, enemy.width + 2, enemy.height + 2);
      }
      enemy.draw(ctx, currentCamera);
      ctx.restore();
    });

    engineRef.current.projectiles.forEach(p => p.draw(ctx, currentCamera));
    
    // 6. Player
    ctx.save();
    if (player.invulnerability > 0) ctx.globalAlpha = Math.sin(time / 50) > 0 ? 0.5 : 1;
    
    // Neon Outline for Player
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(player.pos.x - viewX - 1, player.pos.y - viewY - 1, player.width + 2, player.height + 2);
    
    player.draw(ctx, currentCamera);
    ctx.restore();
    
    particles.forEach(p => p.draw(ctx, currentCamera));

    // 5. HUD & Overlays
    const vignette = ctx.createRadialGradient(400, 300, 200, 400, 300, 600);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 800, 600);
  };

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden flex items-center justify-center font-sans selection:bg-sky-500/30">
      {/* Responsive Canvas Container */}
      <div className="relative w-full h-full max-w-[800px] max-h-[600px] aspect-[4/3] sm:aspect-[4/3] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5"
        />

        {/* HUD - Atmospheric Theme */}
        {(gameState === 'PLAYING' || gameState === 'ESCAPE') && (
          <div className="absolute inset-0 pointer-events-none p-2 sm:p-6 flex flex-col z-40 overflow-hidden">
            {/* Top Bar - Compact Integrated Modules */}
            <div className="flex justify-between items-start w-full gap-2 sm:gap-4 flex-nowrap">
              {/* Left Side: Stats & Weapon */}
              <div className="flex flex-col gap-3 sm:gap-4 shrink-0">
                {/* Stats Module */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 sm:p-3 sm:px-4 rounded-xl sm:rounded-2xl flex items-center gap-4 sm:gap-6 shadow-2xl">
                  {/* Health */}
                  <div className="flex flex-col gap-1 min-w-[90px] xs:min-w-[100px] sm:min-w-[120px]">
                    <div className="flex items-center justify-between text-[7px] sm:text-[7px] font-black tracking-widest uppercase text-rose-500/80">
                      <div className="flex items-center gap-1">
                        <Heart className="w-2 h-2 sm:w-2 sm:h-2 fill-rose-500" />
                        <span className="hidden xs:inline">Vitality</span>
                        <span className="xs:hidden">HP</span>
                      </div>
                      <span className="text-white/60">{Math.ceil(health)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                        animate={{ width: `${(health / maxHealth) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div className="h-5 sm:h-6 w-[1px] bg-white/10" />

                  {/* Score */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] sm:text-[7px] font-black tracking-widest uppercase text-sky-400/80">Cognition</span>
                    <span className="text-sm sm:text-xl font-mono text-white leading-none tracking-widest font-bold tabular-nums">
                      {score.toString().padStart(6, '0')}
                    </span>
                  </div>
                </div>

                {/* Arsenal (Compact) */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-1.5 sm:p-1.5 sm:px-3 rounded-full flex items-center gap-2 sm:gap-3 shadow-lg self-start">
                   <Sword className="w-3 h-3 text-white/40" />
                   <span className="text-[8px] sm:text-[8px] font-black text-white/80 uppercase tracking-tighter italic">{weapon}</span>
                   <span className="hidden sm:inline text-[7px] text-white/20 font-bold uppercase tracking-widest bg-white/5 px-1.5 rounded">[Q/E]</span>
                </div>
              </div>

              {/* Center: Major Alerts & Announcements */}
              <div className="hidden lg:flex flex-1 flex-col items-center pt-2">
                <AnimatePresence>
                  {bossMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                      className="bg-sky-500/10 backdrop-blur-xl border border-sky-400/30 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(14,165,233,0.2)]"
                    >
                      <h2 className="text-sm sm:text-lg font-black text-white italic uppercase tracking-widest">{bossMessage}</h2>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Side: Navigation & Objectives */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 sm:p-3 sm:px-5 rounded-lg sm:rounded-2xl flex flex-col items-end shadow-lg min-w-[100px] xs:min-w-[120px] sm:min-w-[140px] max-w-[45vw] sm:max-w-none">
                  <span className="text-[7px] sm:text-[7px] text-sky-400 font-bold tracking-[0.4em] uppercase opacity-60 truncate w-full text-right">{theme.floor}</span>
                  <p className="text-white text-[11px] xs:text-[12px] sm:text-base font-black italic tracking-tighter uppercase mb-1 sm:mb-2 leading-none truncate w-full text-right">{theme.name}</p>
                  
                  {/* Cleanup Progress */}
                  {!portalOpen ? (
                    <div className="w-full flex items-center gap-2">
                       <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                           className="h-full bg-sky-500"
                           initial={{ width: 0 }}
                           animate={{ width: `${(enemiesDefeated / totalEnemies) * 100}%` }}
                          />
                       </div>
                       <span className="text-[7px] sm:text-[7px] text-slate-500 font-black shrink-0">{enemiesDefeated}/{totalEnemies}</span>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-1 sm:gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 sm:w-1.5 sm:h-1.5 rounded-full bg-sky-400 animate-pulse" />
                      <span className="text-[7px] sm:text-[7px] text-sky-300 font-black uppercase tracking-widest">Portal Active</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom HUD - Mobile / Contextual Info */}
            <div className="mt-auto flex justify-center pb-4">
              {gameState === 'ESCAPE' && (
                <motion.div 
                  animate={{ scale: [0.98, 1, 0.98] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="bg-black/90 border border-rose-500/40 p-4 px-10 rounded-2xl backdrop-blur-2xl shadow-2xl flex flex-col items-center"
                >
                  <p className="text-rose-500 text-[8px] font-black tracking-[0.8em] uppercase mb-1 opacity-70">Extraction Window</p>
                  <p className="text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_#f43f5e]">{escapeTimer.toFixed(1)}</p>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Input Overlay */}
        {touchControlsActive && (gameState === 'PLAYING' || gameState === 'ESCAPE') && (
          <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-end p-6 pb-12 sm:hidden">
            <div className="flex justify-between items-end w-full pointer-events-auto">
              {/* Movement (Left/Right) */}
              <div className="flex gap-4">
                <button 
                  onPointerDown={() => handleTouchStart('left')}
                  onPointerUp={() => handleTouchEnd('left')}
                  className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ArrowLeft className="w-8 h-8 text-white" />
                </button>
                <button 
                  onPointerDown={() => handleTouchStart('right')}
                  onPointerUp={() => handleTouchEnd('right')}
                  className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ArrowRight className="w-8 h-8 text-white" />
                </button>
              </div>

              {/* Actions (Jump, Attack, Dash) */}
              <div className="flex flex-col gap-4 items-end">
                <button 
                  onPointerDown={() => handleTouchStart('jump')}
                  onPointerUp={() => handleTouchEnd('jump')}
                  className="w-20 h-20 bg-sky-500/20 backdrop-blur-md rounded-full border-2 border-sky-500/40 flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                >
                  <div className="w-6 h-6 border-2 border-sky-400 rounded-sm rotate-45" />
                </button>
                <div className="flex gap-4">
                  <button 
                    onPointerDown={() => handleTouchStart('dash')}
                    onPointerUp={() => handleTouchEnd('dash')}
                    className="w-16 h-16 bg-amber-500/20 backdrop-blur-md rounded-2xl border border-amber-500/40 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Wind className="w-6 h-6 text-amber-400" />
                  </button>
                  <button 
                    onPointerDown={() => handleTouchStart('attack')}
                    onPointerUp={() => handleTouchEnd('attack')}
                    className="w-20 h-20 bg-rose-600/40 backdrop-blur-md rounded-3xl border border-rose-500/60 flex items-center justify-center active:scale-95 transition-transform shadow-[0_0_30px_rgba(225,29,72,0.3)]"
                  >
                    {weapon === 'SWORD' ? <Sword className="w-8 h-8 text-white" /> : <div className="w-6 h-1 bg-white rounded-full" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Pause Hook for Mobile */}
            <button 
              onClick={() => setGameState('PAUSED')}
              className="absolute top-4 left-1/2 -translate-x-1/2 p-3 bg-white/5 border border-white/10 rounded-full pointer-events-auto backdrop-blur-sm"
            >
              <Pause className="w-4 h-4 text-white/40" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen UI Overlays (Outside aspect ratio box for better mobile menu fit) */}
      <div className="absolute inset-0 pointer-events-none px-4 sm:px-10 flex flex-col justify-between">
        {/* Boss HP Bar */}
        <AnimatePresence>
          {(bossActive && bossHP > 0) && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 w-[500px] flex flex-col items-center gap-2 z-50"
            >
              <div className="flex justify-between w-full px-1">
                <span className="text-[14px] font-black tracking-[0.4em] text-white uppercase italic drop-shadow-lg">THE FALLEN</span>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-slate-900/80 px-2 rounded">
                  {bossHP < bossMaxHP * 0.5 ? 'PHASE 2: ENRAGED' : 'PHASE 1'}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 border border-white/10 rounded-sm p-[2px] shadow-2xl overflow-hidden backdrop-blur-sm">
                <motion.div 
                  className={`h-full ${bossHP < bossMaxHP * 0.5 ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.5)]' : 'bg-gradient-to-r from-slate-200 to-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'}`}
                  animate={{ width: `${Math.max(0, (bossHP / bossMaxHP) * 100)}%` }}
                  transition={{ type: 'spring', damping: 15 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cinematic Messages -> Handled by Central Banner inside main HUD block */}

        {/* Transition Overlay */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black flex items-center justify-center pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <p className="text-rose-500 text-[10px] uppercase font-black tracking-[1em] mb-4">Ascending Tower</p>
                <div className="w-48 h-[1px] bg-white/20 mx-auto" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pause Menu & Settings */}
        <AnimatePresence mode="wait">
          {gameState === 'PAUSED' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center space-y-6 sm:space-y-8 pointer-events-auto p-6"
            >
              {!showSettings ? (
                <motion.div 
                  key="pause-main"
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                  className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-[280px]"
                >
                  <div className="text-center space-y-1 sm:space-y-2">
                    <h2 className="text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter">Suspended</h2>
                    <p className="text-rose-500 text-[8px] sm:text-[10px] uppercase font-black tracking-[0.6em] sm:tracking-[1em]">Game Paused</p>
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:gap-4 w-full">
                    <button 
                      onClick={() => setGameState('PLAYING')}
                      className="w-full py-4 sm:py-5 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 shadow-xl transition-all text-xs sm:text-sm"
                    >
                      Resume
                    </button>
                    <button 
                      onClick={() => setShowSettings(true)}
                      className="w-full py-4 sm:py-5 bg-sky-600/20 text-sky-400 font-black uppercase tracking-widest rounded-xl border border-sky-400/30 hover:bg-sky-600/40 text-xs sm:text-sm flex items-center justify-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button 
                      onClick={() => initGame(room, TOWER_NODES[currentMapNode].type)}
                      className="w-full py-4 sm:py-5 bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-slate-700 text-xs sm:text-sm"
                    >
                      Restart Room
                    </button>
                    <button 
                      onClick={() => setGameState('START')}
                      className="w-full py-4 sm:py-5 bg-rose-900/40 text-rose-500 font-black uppercase tracking-widest rounded-xl border border-rose-500/30 hover:bg-rose-900/60 text-xs sm:text-sm"
                    >
                      Exit to Menu
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="settings-main"
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-[320px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">System Config</h3>
                      <span className="text-[8px] font-black text-sky-500 uppercase tracking-widest">Audio Optimization</span>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Master Volume */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Master Volume</span>
                        </div>
                        <span className="font-mono">{Math.round(audioSettings.masterVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" value={audioSettings.masterVolume} 
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          soundManager.setMasterVolume(v);
                          setAudioSettings(soundManager.getSettings());
                        }}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>

                    {/* Music Volume */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-purple-400" />
                          <span>Music Intensity</span>
                        </div>
                        <span className="font-mono">{Math.round(audioSettings.musicVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" value={audioSettings.musicVolume} 
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          soundManager.setMusicVolume(v);
                          setAudioSettings(soundManager.getSettings());
                        }}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    {/* SFX Volume */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Combat Feedback</span>
                        </div>
                        <span className="font-mono">{Math.round(audioSettings.sfxVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" value={audioSettings.sfxVolume} 
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          soundManager.setSfxVolume(v);
                          setAudioSettings(soundManager.getSettings());
                        }}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          soundManager.setMuted(!audioSettings.isMuted);
                          setAudioSettings(soundManager.getSettings());
                        }}
                        className={`w-full py-4 rounded-xl border flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] ${audioSettings.isMuted ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' : 'bg-sky-500/10 border-sky-400/30 text-sky-400 hover:bg-sky-500/20'}`}
                      >
                        {audioSettings.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        {audioSettings.isMuted ? 'Silence Protocol Active' : 'Audio Transmitting'}
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="mt-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] hover:text-white/60 transition-colors"
                  >
                    Back to Pause
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start / Upgrade / Game Over Screens */}
        <AnimatePresence>
          {(gameState === 'START' || gameState === 'MAP' || gameState === 'UPGRADE' || gameState === 'GAMEOVER' || gameState === 'ENDING') && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] pointer-events-auto flex flex-col items-center justify-center h-full text-center space-y-8 bg-black/40 p-12"
            >
              {gameState === 'START' && (
                <div className="space-y-6 sm:space-y-10 w-full max-w-2xl">
                  <div className="space-y-2 sm:space-y-4">
                    <motion.h1 
                      initial={{ y: 20 }} animate={{ y: 0 }}
                      className="text-4xl sm:text-7xl font-black text-white tracking-tighter italic uppercase leading-tight sm:leading-none"
                    >
                      Aetheria: The Fallen Ascent
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="text-rose-500 text-[10px] sm:text-sm tracking-[0.4em] sm:tracking-[0.6em] uppercase font-light"
                    >
                      Enter the Abyss
                    </motion.p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 sm:gap-6">
                    <button 
                      onClick={() => {
                        soundManager.resume();
                        resetGame();
                      }}
                      className="group relative w-full sm:w-auto px-12 sm:px-16 py-4 sm:py-5 bg-rose-600 hover:scale-105 transition-all duration-300 rounded-full flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(225,29,72,0.2)]"
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white mr-3 sm:mr-4 fill-white" />
                      <span className="text-white font-black uppercase tracking-[0.2em] text-xs sm:text-sm">Initiate Cycle</span>
                    </button>
                    
                    <div className="flex flex-wrap justify-center gap-4">
                      {hasSave && (
                        <button 
                          onClick={() => {
                            soundManager.resume();
                            loadGame();
                          }}
                          className="group relative px-10 sm:px-12 py-3 sm:py-4 bg-slate-800 hover:scale-105 transition-all duration-300 rounded-full flex items-center justify-center overflow-hidden border border-white/10"
                        >
                          <span className="text-white font-black uppercase tracking-[0.2em] text-xs sm:text-xs">Continue Journey</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          soundManager.resume();
                          setGameState('PAUSED');
                          setShowSettings(true);
                        }}
                        className="group relative px-10 sm:px-12 py-3 sm:py-4 bg-white/5 hover:bg-white/10 hover:scale-105 transition-all duration-300 rounded-full flex items-center justify-center overflow-hidden border border-white/10"
                      >
                         <Settings className="w-4 h-4 text-white/60 mr-2" />
                         <span className="text-white/80 font-black uppercase tracking-[0.2em] text-xs sm:text-xs">Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gameState === 'MAP' && (
                <div className="space-y-6 sm:space-y-8 w-full max-w-xl">
                   <p className="text-rose-500 text-[10px] uppercase font-black tracking-[0.6em] sm:tracking-[1em]">Tower Floor Map</p>
                   <div className="flex flex-col items-center gap-3 sm:gap-6 relative">
                      {TOWER_NODES.map((node, i) => {
                        const isCleared = clearedNodes.includes(node.id);
                        const isAvailable = node.id === 0 || clearedNodes.some(id => TOWER_NODES[id].connections.includes(node.id));
                        const isNext = isAvailable && !isCleared;
                        const isCurrent = node.id === currentMapNode && !isCleared;

                        return (
                          <motion.button
                            key={node.id}
                            disabled={!isNext}
                            onClick={() => {
                              setCurrentMapNode(node.id);
                              setRoom(node.room);
                              initGame(node.room, node.type);
                            }}
                            className={`p-4 sm:p-5 border-2 transition-all w-full flex justify-between items-center rounded-xl sm:rounded-2xl ${isCurrent ? 'border-sky-500 bg-sky-950/40' : isNext ? 'border-white/20 hover:border-white bg-white/5 cursor-pointer hover:scale-[1.02]' : isCleared ? 'border-green-500/30 bg-green-500/5 opacity-60' : 'border-white/5 opacity-30 grayscale'}`}
                          >
                             <div className="text-left flex-1 mr-4">
                               <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">{node.type}</p>
                               <p className="text-base sm:text-xl font-black text-white italic uppercase tracking-tighter leading-tight">{node.label}</p>
                             </div>
                             <div className="flex-shrink-0">
                               {isCleared ? (
                                 <span className="text-green-500 font-black text-xs">CLEARED</span>
                               ) : isNext && (
                                 <span className="text-white text-[10px] font-black animate-pulse bg-white/10 px-4 py-2 rounded-full">ENTER</span>
                               )}
                             </div>
                          </motion.button>
                        );
                      })}
                   </div>
                </div>
              )}

              {gameState === 'UPGRADE' && (
                <div className="space-y-6 sm:space-y-10 w-full max-w-2xl px-4 overflow-y-auto max-h-full py-10">
                   <div>
                     <p className="text-sky-500 text-[10px] uppercase font-black tracking-[0.6em] sm:tracking-[1em] mb-2">Neural Link Synchronized</p>
                     <h2 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter">Acquire Skill</h2>
                   </div>
                   <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {SKILLS_LIST.map(skill => {
                        const Icon = skill.id === 'DOUBLE_JUMP' ? Zap : skill.id === 'DASH' ? Wind : Sparkles;
                        return (
                          <button
                            key={skill.id}
                            disabled={unlockedSkills.includes(skill.id)}
                            onClick={() => {
                              const newSkills = [...unlockedSkills, skill.id];
                              setUnlockedSkills(newSkills);
                              saveGame({ unlockedSkills: newSkills });
                              setGameState('MAP');
                            }}
                            className={`p-4 sm:p-6 border-2 rounded-xl text-left transition-all group ${unlockedSkills.includes(skill.id) ? 'border-green-500 bg-green-500/10 opacity-50' : 'border-white/10 hover:border-sky-500 bg-white/5'}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-sky-400" />
                                <h3 className="text-lg sm:text-xl font-black text-white uppercase italic">{skill.name}</h3>
                              </div>
                              {unlockedSkills.includes(skill.id) && <span className="text-green-500 font-bold text-[10px]">UNLOCKED</span>}
                            </div>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium">{skill.description}</p>
                          </button>
                        );
                      })}
                   </div>
                   <button 
                     onClick={() => setGameState('MAP')}
                     className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em]"
                   >
                     Skip for Now
                   </button>
                </div>
              )}

              {gameState === 'ENDING' && (
                <div className="space-y-6 sm:space-y-10 w-full max-w-xl px-4">
                   <motion.div
                     initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                     className="space-y-2 sm:space-y-4"
                   >
                     <p className="text-sky-400 text-[10px] uppercase font-black tracking-[1em]">The Curse is Broken</p>
                     <h1 className="text-5xl sm:text-8xl font-black text-white italic uppercase tracking-tighter leading-none">Victory</h1>
                   </motion.div>
                   <div className="bg-white/5 p-6 sm:p-8 rounded-2xl border border-white/10 text-left space-y-4">
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Final Cognition</span>
                        <span className="text-white font-mono font-bold text-lg">{score}</span>
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm">You escaped Aetheria as it crumbled into the void. The world is safe... for now.</p>
                   </div>
                   <button 
                      onClick={() => setGameState('START')}
                      className="px-10 sm:px-12 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all text-xs sm:text-md"
                   >
                     Restart Cycle
                   </button>
                </div>
              )}

              {gameState === 'GAMEOVER' && (
                <div className="space-y-4 sm:space-y-6 w-full max-w-xl px-4">
                  <h1 className="text-5xl sm:text-8xl font-black text-rose-500 tracking-tighter uppercase italic leading-none">Cursed</h1>
                  <p className="text-slate-500 uppercase tracking-[0.4em] sm:tracking-[0.5em] text-[10px] sm:text-xs font-bold">Your Soul Has Faded</p>
                  <div className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/5 backdrop-blur-xl space-y-1 sm:space-y-2">
                     <p className="text-slate-400 text-[8px] sm:text-[10px] uppercase font-bold">Soul Fragments Collected</p>
                     <p className="text-white text-2xl sm:text-3xl font-mono">{score.toString().padStart(6, '0')}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setRoom(0);
                      setCycle(0);
                      setClearedNodes([]);
                      setCurrentMapNode(0);
                      setHealth(100);
                      engineRef.current.player.score = 0;
                      setGameState('START');
                    }}
                    className="flex items-center justify-center mx-auto px-10 sm:px-12 py-4 bg-rose-600 hover:bg-rose-500 transition-all rounded-xl text-white font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl"
                  >
                    <RotateCcw className="w-4 h-4 mr-3" />
                    Resurrect
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lower Hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-20 hover:opacity-40 transition-opacity">
           <span className="text-[9px] text-white uppercase tracking-[0.5em] font-medium">Aetheria Immersive Framework v4.0</span>
           <div className="w-12 h-[1px] bg-sky-500" />
        </div>
      </div>
    </div>
  );
}

