/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, ArrowLeft, Pause } from 'lucide-react';
import { soundManager } from './lib/soundManager';

import { Vector } from './engine/Vector';
import { Player } from './engine/Player';
import { Enemy, gx_out_of_bounds } from './engine/Enemy';
import { FallenAscendant } from './engine/Boss';
import { Particle } from './engine/Particle';
import { Projectile } from './engine/Projectile';
import { Hazard } from './engine/Hazard';
import { HUD, MobileControls } from './components/HUD';
import { 
  TILE_SIZE, 
  SAVE_KEY, 
  CYCLE_DIFFICULTY_STEP, 
  THEMES, 
  MAPS, 
  SKILLS_LIST, 
  TOWER_NODES,
  ASSETS
} from './constants';
import { GameState, Difficulty } from './types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [hasSave, setHasSave] = useState(false);
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [totalEnemies, setTotalEnemies] = useState(0);
  const [score, setScore] = useState(0);
  const [showSaved, setShowSaved] = useState(false);
  const [room, setRoom] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [portalOpen, setPortalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [weaponFlash, setWeaponFlash] = useState(false);
  
  const [bossActive, setBossActive] = useState(false);
  const [bossHP, setBossHP] = useState(0);
  const [bossMaxHP, setBossMaxHP] = useState(0);
  const [bossMessage, setBossMessage] = useState<string | null>(null);
  const [weapon, setWeapon] = useState<'SWORD' | 'PISTOL'>('SWORD');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
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
    if (key === 'down') engineRef.current.input['arrowdown'] = true;
    if (key === 'jump') engineRef.current.input[' '] = true;
    if (key === 'attack') engineRef.current.input['z'] = true;
    if (key === 'dash') engineRef.current.input['shift'] = true;
    if (key === 'magic') engineRef.current.input['v'] = true;
    if (key === 'block') {
      engineRef.current.input['x'] = true;
      engineRef.current.input['x_pressed'] = true;
    }
  };

  const handleTouchEnd = (btn: string) => {
    const key = btn.toLowerCase();
    engineRef.current.input[key] = false;
    if (key === 'left') engineRef.current.input['arrowleft'] = false;
    if (key === 'right') engineRef.current.input['arrowright'] = false;
    if (key === 'up') engineRef.current.input['arrowup'] = false;
    if (key === 'down') engineRef.current.input['arrowdown'] = false;
    if (key === 'jump') engineRef.current.input[' '] = false;
    if (key === 'attack') engineRef.current.input['z'] = false;
    if (key === 'dash') engineRef.current.input['shift'] = false;
    if (key === 'magic') engineRef.current.input['v'] = false;
    if (key === 'block') engineRef.current.input['x'] = false;
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
      weapon,
      unlockedSkills,
      clearedNodes,
      currentMapNode,
      ...overrides
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    setHasSave(true);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
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
      setDifficulty(data.difficulty || 'NORMAL');
      setWeapon(data.weapon || 'SWORD');
      setUnlockedSkills(data.unlockedSkills);
      setClearedNodes(data.clearedNodes);
      setCurrentMapNode(data.currentMapNode);
      
      if (engineRef.current.player) {
        engineRef.current.player.hp = data.health;
        engineRef.current.player.score = data.score;
        engineRef.current.player.skills = new Set(data.unlockedSkills);
        engineRef.current.player.weapon = data.weapon || 'SWORD';
      }
      
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
    setGameState('DIFFICULTY_SELECT');
  };

  const engineRef = useRef({
    player: new Player(),
    enemies: [] as Enemy[],
    hazards: [] as Hazard[],
    particles: [] as Particle[],
    projectiles: [] as Projectile[],
    input: {} as { [key: string]: boolean },
    difficulty: 'NORMAL' as Difficulty,
    camera: new Vector(0, 0),
    level: MAPS[0],
    lastHP: 100,
    lastTime: 0,
    difficultyScale: 1,
    stars: [] as {x: number, y: number, s: number, layer: number}[],
    dustParticles: [] as {x: number, y: number, size: number, speed: number, drift: number, opacity: number}[],
    decorations: [] as {x: number, y: number, type: 'CHAIN' | 'PILLAR' | 'CRACK', seed: number}[],
    shakeIntensity: 0,
    portalOpen: false,
    boss: null as FallenAscendant | null,
    cinematicTimer: 0,
    escapeActive: false,
    escapeDuration: 60000,
    portalLock: false,
    roomTimeout: null as any,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!engineRef.current.input[key]) {
        if (key === 'x' || key === 'k') {
          engineRef.current.input[key + '_pressed'] = true;
        }
      }
      engineRef.current.input[key] = true;
      engineRef.current.input[e.key] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current.input[e.key.toLowerCase()] = false;
      engineRef.current.input[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    engineRef.current.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 3000,
      y: Math.random() * 2000,
      s: Math.random() * 15 + 2,
      layer: Math.floor(Math.random() * 4) + 1
    }));

    engineRef.current.dustParticles = Array.from({ length: 60 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 600,
      size: 0.5 + Math.random() * 1.5,
      speed: 0.1 + Math.random() * 0.2,
      drift: (Math.random() - 0.5) * 0.1,
      opacity: 0.1 + Math.random() * 0.3
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

      if (engineRef.current.input['escape'] || engineRef.current.input['p']) {
        if (gameState === 'PLAYING' || gameState === 'ESCAPE') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
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

  useEffect(() => {
    if (localStorage.getItem(SAVE_KEY)) {
      setHasSave(true);
    }
  }, []);

  const initGame = (selectedRoom: number, type: string = 'BATTLE', nextCycle?: number) => {
    const engine = engineRef.current;
    
    if (engine.roomTimeout) {
      clearTimeout(engine.roomTimeout);
      engine.roomTimeout = null;
    }

    const currentCycle = nextCycle ?? cycle;
    
    // Difficulty Modifiers
    const diffModifier = 
      difficulty === 'EASY' ? 0.75 : 
      difficulty === 'HARD' ? 1.5 : 
      difficulty === 'NIGHTMARE' ? 4.0 : 
      1;
    const scale = (1 + (currentCycle * CYCLE_DIFFICULTY_STEP) + (selectedRoom * 0.15)) * diffModifier;
    
    engine.difficultyScale = scale;
    engine.difficulty = difficulty;
    engine.level = JSON.parse(JSON.stringify(MAPS[selectedRoom]));
    engine.portalOpen = false;
    engine.portalLock = false;
    engine.boss = null;
    engine.hazards = [];
    engine.projectiles = [];
    engine.escapeActive = false;
    engine.escapeDuration = 60000;
    setRoom(selectedRoom);
    setPortalOpen(false);
    setBossActive(false);
    setBossMessage(null);
    setWeapon('SWORD');
    
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
    
    if (type === 'BOSS') {
      engine.enemies = [];
      engine.boss = new FallenAscendant(2000, 100, scale);
      engine.boss.pos = new Vector(TILE_SIZE * 20, TILE_SIZE * 4);
      setBossActive(true);
      setBossMaxHP(engine.boss.maxHp);
      setBossHP(engine.boss.hp);
      setBossMessage("YOU HAVE REACHED THE THRONE");
      engine.cinematicTimer = 2000;
      engine.roomTimeout = setTimeout(() => setBossMessage(null), 3000);
    } else if (type === 'LOOT') {
      engine.enemies = []; 
      setTotalEnemies(0);
      setBossMessage("REPLENISH YOUR STRENGTH");
      engine.portalLock = true;
      engine.roomTimeout = setTimeout(() => {
        engine.portalLock = false;
        engine.portalOpen = true;
        setPortalOpen(true);
        soundManager.playSFX(ASSETS.SFX_PORTAL);
      }, 4000);
      setTimeout(() => setBossMessage(null), 2000);
    } else {
      const floorPositions: Vector[] = [];
      for (let y = 1; y < engine.level.length; y++) {
        for (let x = 0; x < engine.level[y].length; x++) {
          if (engine.level[y][x] === 1 && engine.level[y-1][x] === 0) {
            floorPositions.push(new Vector(x * TILE_SIZE, (y-1) * TILE_SIZE));
          }
        }
      }

      let safePositions = floorPositions.filter(p => Vector.dist(p, new Vector(64,64)) > 150);
      if (safePositions.length === 0 && floorPositions.length > 0) {
        safePositions = floorPositions.filter(p => Vector.dist(p, new Vector(64,64)) > 64);
      }
      
      const basicCount = 2 + selectedRoom;
      const advancedCount = selectedRoom > 0 ? 1 + Math.floor(selectedRoom / 2) : 0;
      const eliteCount = (selectedRoom >= 2 || type === 'ELITE') ? 1 + Math.floor(selectedRoom / 3) : 0;
      
      engine.enemies = [];
      const sources = safePositions.length > 0 ? safePositions : floorPositions;
      const shuffled = [...sources].sort(() => Math.random() - 0.5);
      
      let spawnedCount = 0;
      for(let i=0; i<basicCount && spawnedCount < shuffled.length; i++) {
        const p = shuffled[spawnedCount++];
        engine.enemies.push(new Enemy(p.x, p.y, 'BASIC', scale));
      }
      for(let i=0; i<advancedCount && spawnedCount < shuffled.length; i++) {
        const p = shuffled[spawnedCount++];
        engine.enemies.push(new Enemy(p.x, p.y, 'ADVANCED', scale));
      }
      for(let i=0; i<eliteCount && spawnedCount < shuffled.length; i++) {
        const p = shuffled[spawnedCount++];
        engine.enemies.push(new Enemy(p.x, p.y, 'ELITE', scale));
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
  
  const toggleWeapon = () => {
    const engine = engineRef.current;
    if (!engine || !engine.player) return;
    
    engine.player.weapon = engine.player.weapon === 'SWORD' ? 'PISTOL' : 'SWORD';
    setWeapon(engine.player.weapon);
    setWeaponFlash(true);
    setTimeout(() => setWeaponFlash(false), 150);
    
    // Spawn particles manually if we want to ensure they show up on UI click too
    const particleColor = engine.player.weapon === 'SWORD' ? '#fff' : '#38bdf8';
    for (let i = 0; i < 20; i++) {
      engine.particles.push(new Particle(
        new Vector(engine.player.pos.x + engine.player.width / 2, engine.player.pos.y + engine.player.height / 2),
        new Vector((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
        particleColor,
        Math.random() * 5 + 2,
        0.03
      ));
    }
    
    engine.shakeIntensity = 5;
    soundManager.playSFX(ASSETS.SFX_DASH);
  };

  const update = (_time: number) => {
    const engine = engineRef.current;
    const { player, enemies, particles, level, difficultyScale, boss } = engine;

    if (engine.cinematicTimer > 0) {
      engine.cinematicTimer -= 16;
      particles.forEach(p => p.update());
      return;
    }

    player.update(engine.input, level, particles);
    player.skills = new Set(unlockedSkills);

    if (gameState === 'ESCAPE') {
      const remainingTime = engine.escapeDuration / 1000;
      setEscapeTimer(Math.max(0, remainingTime));
      engine.escapeDuration -= 16;
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 1.5);

      // Random Falling hazards during escape
      if (Math.random() < 0.03) {
        const hX = player.pos.x + (Math.random() - 0.5) * 800;
        const h = new Hazard('FALLING_DEBRIS', hX, player.pos.y - 400, 15, 24, 24);
        h.warningDuration = 500;
        engine.hazards.push(h);
      }

      if (engine.escapeDuration <= 0) {
        setGameState('GAMEOVER');
      }
    }

    // Pistol
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
       player.isAttacking = false;
    }

    if (player.isMagicAttacking) {
       const bolt = new Projectile(
         player.pos.x + (player.facing === 1 ? player.width : -20),
         player.pos.y + 10,
         player.facing * 16,
         0,
         'PLAYER',
         '#a855f7',
         60, 24, 12
       );
       bolt.canPassWalls = true;
       engine.projectiles.push(bolt);
       engine.shakeIntensity = 10;
       soundManager.playSFX(ASSETS.SFX_PORTAL); 
       for(let i=0; i<15; i++) {
         particles.push(new Particle(
           new Vector(player.pos.x + player.width/2, player.pos.y + player.height/2),
           new Vector((Math.random()-0.5)*8, (Math.random()-0.5)*8),
           '#7e22ce', 3 + Math.random()*3, 0.02
         ));
       }
       player.isMagicAttacking = false;
    }

    if (boss) {
      boss.update(player, level, particles, engine);
      setBossHP(boss.hp);

      // Phase 2 hazards
      if (boss.phase === 2 && Math.random() < 0.01) {
        const hX = player.pos.x + (Math.random() - 0.5) * 400;
        engine.hazards.push(new Hazard('VOID_ZONE', hX, player.pos.y, 10, 64, 32));
      }

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
    } else if (enemies.length > 0 && Math.random() < 0.005) {
      const hX = player.pos.x + (Math.random() - 0.5) * 600;
      const h = new Hazard('FALLING_DEBRIS', hX, player.pos.y - 400, 10, 24, 24);
      engine.hazards.push(h);
    }

    enemies.forEach(enemy => {
      enemy.update(player, level, particles, difficultyScale, engine);
      if (enemy.pos.y > level.length * TILE_SIZE + 200) enemy.isDead = true;
    });

    engine.projectiles.forEach(p => {
      p.update(level, engine.camera.x, engine.camera.y);
      if (p.owner === 'PLAYER') {
        enemies.forEach(enemy => {
          if (!enemy.isDead && enemy.checkCollision(p.rect, enemy.rect)) {
            enemy.takeDamage(p.damage, particles, player);
            p.isDead = true;
          }
        });
        if (boss && !boss.isDead && boss.checkCollision(p.rect, boss.rect)) {
          boss.takeDamage(p.damage, particles, player);
          p.isDead = true;
        }
      }
    });

    const activeEnemies = enemies.filter(e => !e.isDead);
    engine.enemies = activeEnemies;
    engine.projectiles = engine.projectiles.filter(p => !p.isDead);

    // Update Hazards
    engine.hazards.forEach(h => h.update(player, particles, level, engine));
    engine.hazards = engine.hazards.filter(h => !h.isFinished);

    const remainingCount = activeEnemies.length + (boss && !boss.isDead ? 1 : 0);
    const accurateDefeated = Math.max(0, totalEnemies - remainingCount);
    if (accurateDefeated !== enemiesDefeated) {
      setEnemiesDefeated(accurateDefeated);
    }

    if (remainingCount === 0 && !engine.portalOpen && !engine.portalLock) {
      engine.portalOpen = true;
      setPortalOpen(true);
      player.score += 500 * (cycle + 1);
      soundManager.playSFX(ASSETS.SFX_PORTAL);
    }

    engine.dustParticles.forEach(p => {
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > 600) p.y = 0;
      if (p.x > 800) p.x = 0;
      if (p.x < 0) p.x = 800;
    });

    let touchingPortal = false;
    if (engine.portalOpen) {
      const pRect = player.rect;
      for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[y].length; x++) {
          if (level[y][x] === 4) {
             const tx = x * TILE_SIZE;
             const ty = y * TILE_SIZE;
             const portalRect = { x: tx - 10, y: ty - 10, width: TILE_SIZE + 20, height: TILE_SIZE + 20 };
             if (player.checkCollision(pRect, portalRect)) {
               touchingPortal = true; break;
             }
          }
        }
        if (touchingPortal) break;
      }
    }
    
    if (touchingPortal && !isTransitioning) {
        setIsTransitioning(true);
        const newHp = Math.min(100, engine.player.hp + 30);
        engine.player.hp = newHp;
        setHealth(newHp);

        const newClearedNodes = [...clearedNodes, currentMapNode];
        setClearedNodes(newClearedNodes);
        saveGame({ clearedNodes: newClearedNodes });
        setTimeout(() => {
          setGameState(gameState === 'ESCAPE' ? 'ENDING' : 'UPGRADE');
          setIsTransitioning(false);
        }, 800);
        return;
    }

    if (player.pos.x > (level[0].length * TILE_SIZE) - player.width - 20 && engine.portalOpen && !isTransitioning) {
       setIsTransitioning(true);
       setTimeout(() => {
         setGameState('UPGRADE');
         setIsTransitioning(false);
       }, 800);
       return;
    }

    particles.forEach(p => p.update());
    engine.particles = particles.filter(p => p.life > 0);

    const lookAhead = player.facing * 100;
    const targetX = player.pos.x - 400 + lookAhead;
    const targetY = player.pos.y - 300;
    engine.camera.x += (targetX - engine.camera.x) * 0.08;
    engine.camera.y += (targetY - engine.camera.y) * 0.08;

    const levelW = level[0].length * TILE_SIZE;
    const levelH = level.length * TILE_SIZE;
    if (levelW > 800) engine.camera.x = Math.max(0, Math.min(levelW - 800, engine.camera.x));
    else engine.camera.x = (levelW - 800) / 2;
    if (levelH > 600) engine.camera.y = Math.max(0, Math.min(levelH - 600, engine.camera.y));
    else engine.camera.y = (levelH - 600) / 2;

    if (engine.shakeIntensity > 0) {
      engine.shakeIntensity *= 0.9;
      if (engine.shakeIntensity < 0.1) engine.shakeIntensity = 0;
    }

    if (player.hp < engine.lastHP) {
      engine.shakeIntensity = 10;
      engine.lastHP = player.hp;
    }

    if (player.hp !== health) setHealth(player.hp);
    if (player.score !== score) setScore(player.score);
    if (player.weapon !== weapon) {
      setWeapon(player.weapon);
      setWeaponFlash(true);
      setTimeout(() => setWeaponFlash(false), 150);
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 3);
    }
    if (player.isDead) setGameState('GAMEOVER');
  };

  const draw = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { player, enemies, particles, level, camera, shakeIntensity, boss } = engineRef.current;
    const theme = THEMES[room % THEMES.length];

    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    const viewX = Math.floor(camera.x - shakeX);
    const viewY = Math.floor(camera.y - shakeY);
    const currentCamera = new Vector(viewX, viewY);

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 4; i++) {
        const px = (i * 450 - viewX * 0.1) % (canvas.width + 450);
        ctx.beginPath(); ctx.moveTo(px - 300, canvas.height); ctx.lineTo(px, canvas.height - 400); ctx.lineTo(px + 300, canvas.height); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    engineRef.current.dustParticles.forEach(p => {
      const px = (p.x - viewX * 0.2) % 800;
      const py = (p.y - viewY * 0.2) % 600;
      const dx = px < 0 ? px + 800 : px;
      const dy = py < 0 ? py + 600 : py;
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.beginPath(); ctx.arc(dx, dy, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.font = '280px serif'; ctx.fillStyle = theme.runes;
    ctx.fillText("VOID", (400 - viewX * 0.05) % 3000, 450);
    ctx.restore();

    ctx.save();
    for (let y = 0; y < level.length; y++) {
      for (let x = 0; x < level[y].length; x++) {
        const tile = level[y][x];
        if (tile === 0) continue;
        const tx = x * TILE_SIZE - viewX;
        const ty = y * TILE_SIZE - viewY;
        if (tx < -TILE_SIZE || tx > 800 || ty < -TILE_SIZE || ty > 600) continue;
        if (tile === 1) {
          ctx.fillStyle = '#1a202c'; ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          if ((x + y) % 5 === 0) { ctx.fillStyle = '#064e3b'; ctx.fillRect(tx, ty, TILE_SIZE, 3); }
        } else if (tile === 2) {
          ctx.fillStyle = '#450a0a'; ctx.beginPath(); ctx.moveTo(tx, ty + TILE_SIZE); ctx.lineTo(tx + TILE_SIZE / 2, ty); ctx.lineTo(tx + TILE_SIZE, ty + TILE_SIZE); ctx.fill();
        } else if (tile === 4) {
          const isOpen = engineRef.current.portalOpen;
          ctx.save();
          
          // Gate Structure
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          
          // Pillars
          ctx.beginPath();
          ctx.moveTo(tx, ty + TILE_SIZE);
          ctx.lineTo(tx, ty - 10);
          ctx.moveTo(tx + TILE_SIZE, ty + TILE_SIZE);
          ctx.lineTo(tx + TILE_SIZE, ty - 10);
          ctx.stroke();
          
          // Arch
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty - 5, TILE_SIZE / 2, Math.PI, 0);
          ctx.stroke();

          if (isOpen) {
            const pulse = Math.sin(time / 200) * 0.2 + 0.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#38bdf8';
            
            // Energy Field
            const grad = ctx.createLinearGradient(tx, ty, tx, ty + TILE_SIZE);
            grad.addColorStop(0, `rgba(56, 189, 248, ${pulse})`);
            grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(tx + 2, ty - 5, TILE_SIZE - 4, TILE_SIZE + 5);
            
            // Particles inside gate
            for (let i = 0; i < 3; i++) {
              const py = ty + ((time * 0.1 + i * 10) % TILE_SIZE);
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(tx + Math.random() * TILE_SIZE, py, 1, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Locked / Closed
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(tx + 2, ty - 5, TILE_SIZE - 4, TILE_SIZE + 5);
          }
          
          ctx.restore();
        }
      }
    }

    if (boss) boss.draw(ctx, currentCamera);
    enemies.forEach(enemy => enemy.draw(ctx, currentCamera));
    engineRef.current.hazards.forEach(h => h.draw(ctx, currentCamera));
    engineRef.current.projectiles.forEach(p => p.draw(ctx, currentCamera));
    player.draw(ctx, currentCamera);
    particles.forEach(p => p.draw(ctx, currentCamera));

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const plX = player.pos.x + player.width/2 - viewX;
    const plY = player.pos.y + player.height/2 - viewY;
    const grad = ctx.createRadialGradient(plX, plY, 0, plX, plY, 200);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.15)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'hard-light'; ctx.fillStyle = theme.ambient; ctx.fillRect(0, 0, 800, 600);
    ctx.globalCompositeOperation = 'multiply';
    const vig = ctx.createRadialGradient(400, 300, 300, 400, 300, 600);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, 800, 600); ctx.restore();
    ctx.restore();
  };

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-sky-500/30">
      <div className="relative w-full max-w-[1000px] aspect-[4/3] md:aspect-auto md:h-[600px] flex items-center justify-center bg-slate-950/40 sm:rounded-2xl border-white/5 shadow-2xl backdrop-blur-sm overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600} 
          className="w-full h-full object-contain pointer-events-none" 
        />

        {(gameState === 'PLAYING' || gameState === 'ESCAPE') && (
          <HUD 
            health={health} maxHealth={maxHealth} score={score} weapon={weapon} 
            theme={theme} enemiesDefeated={enemiesDefeated} totalEnemies={totalEnemies} 
            portalOpen={portalOpen} bossMessage={bossMessage} escapeActive={gameState === 'ESCAPE'} 
            escapeTimer={escapeTimer} onPause={() => setGameState('PAUSED')} isMobile={isMobile}
            difficulty={difficulty}
            onWeaponToggle={toggleWeapon}
          />
        )}

        {touchControlsActive && (gameState === 'PLAYING' || gameState === 'ESCAPE') && (
          <MobileControls 
            onStart={handleTouchStart} onEnd={handleTouchEnd} weapon={weapon} 
            onWeaponToggle={toggleWeapon} 
          />
        )}

        {/* Global Weapon Switch Flash */}
        <AnimatePresence>
          {weaponFlash && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 z-40 pointer-events-none ${weapon === 'SWORD' ? 'bg-white' : 'bg-sky-400'}`}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 pointer-events-none px-4 sm:px-10 flex flex-col justify-between">
        <AnimatePresence>
          {(bossActive && bossHP > 0) && (
            <motion.div key="boss-hp-bar" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute top-6 left-1/2 -translate-x-1/2 w-[500px] flex flex-col items-center gap-2 z-50">
              <div className="flex justify-between w-full px-1"><span className="text-[14px] font-black tracking-[0.4em] text-white uppercase italic drop-shadow-lg">THE ELDERBORN LORD</span><span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-slate-900/80 px-2 rounded">{bossHP < bossMaxHP * 0.5 ? 'PHASE 2: ELDER RAGE' : 'PHASE 1'}</span></div>
              <div className="w-full h-3 bg-slate-950 border border-white/10 rounded-sm p-[2px] shadow-2xl overflow-hidden backdrop-blur-sm"><motion.div className={`h-full ${bossHP < bossMaxHP * 0.5 ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.5)]' : 'bg-gradient-to-r from-slate-200 to-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'}`} animate={{ width: `${Math.max(0, (bossHP / bossMaxHP) * 100)}%` }} transition={{ type: 'spring', damping: 15 }} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{isTransitioning && (<motion.div key="scene-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black flex items-center justify-center pointer-events-none"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center"><p className="text-rose-500 text-[10px] uppercase font-black tracking-[1em] mb-4">Descending Into Abyss</p><div className="w-48 h-[1px] bg-white/20 mx-auto" /></motion.div></motion.div>)}</AnimatePresence>
        
        <AnimatePresence mode="wait">
          {gameState === 'PAUSED' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center space-y-6 pointer-events-auto p-6">
              <motion.div key="pause-main" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex flex-col items-center gap-6 w-full max-w-[280px]">
                <div className="text-center space-y-1 sm:space-y-2"><h2 className="text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter">At Resting Grace</h2><p className="text-rose-500 text-[8px] uppercase font-black tracking-[0.6em]">Game Suspended</p></div>
                <div className="flex flex-col gap-3 w-full">
                  <button onClick={() => setGameState('PLAYING')} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 shadow-xl transition-all">Resume</button>
                  <button onClick={() => initGame(room, TOWER_NODES[currentMapNode].type)} className="w-full py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-slate-700">Restart Room</button>
                  <button onClick={() => saveGame()} className="w-full py-4 bg-sky-900/40 text-sky-400 font-black uppercase tracking-widest rounded-xl border border-sky-500/30 hover:bg-sky-900/60 transition-all">Record Progress</button>
                  <button onClick={() => setGameState('START')} className="w-full py-4 bg-rose-900/40 text-rose-500 font-black uppercase tracking-widest rounded-xl border border-rose-500/30 hover:bg-rose-900/60">Exit to Menu</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSaved && (
            <motion.div key="save-status" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-10 right-10 z-[200] bg-sky-500/20 backdrop-blur-xl border border-sky-400/30 px-4 py-2 rounded-lg pointer-events-none flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Progress Saved</span></motion.div>
          )}
          {(gameState === 'START' || gameState === 'MAP' || gameState === 'UPGRADE' || gameState === 'GAMEOVER' || gameState === 'ENDING' || gameState === 'DIFFICULTY_SELECT') && (
            <motion.div key={`game-state-overlay-${gameState}`} initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(8px)" }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] pointer-events-auto flex flex-col items-center justify-center bg-black/60 p-4 sm:p-12 overflow-y-auto scrollbar-hide">
              {(gameState === 'MAP' || gameState === 'UPGRADE' || gameState === 'DIFFICULTY_SELECT') && (
                <button onClick={() => setGameState('START')} className="absolute top-6 left-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors group z-[110]"><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Main Menu</span></button>
              )}
              {gameState === 'DIFFICULTY_SELECT' && (
                <div className="space-y-12 w-full max-w-2xl px-4 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <p className="text-rose-500 text-[10px] uppercase font-black tracking-[0.8em]">Level of Difficulty</p>
                    <h2 className="text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter">Choose Your Path</h2>
                  </motion.div>

                  <div className="grid grid-cols-1 gap-4">
                    {(['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'] as const).map((diff) => (
                      <motion.button
                        key={diff}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setDifficulty(diff);
                          soundManager.playSFX(ASSETS.SFX_DASH);
                          setGameState('MAP');
                        }}
                        className={`group p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          difficulty === diff 
                            ? (diff === 'NIGHTMARE' ? 'border-purple-600 bg-purple-600/10 shadow-[0_0_40px_rgba(147,51,234,0.3)]' : 'border-rose-500 bg-rose-500/10 shadow-[0_0_40px_rgba(225,29,72,0.2)]')
                            : 'border-white/10 bg-white/5 hover:border-white/30'
                        }`}
                      >
                        <span className={`text-xl font-black uppercase italic tracking-widest ${
                          difficulty === diff ? 'text-white' : 'text-white/40'
                        } ${diff === 'NIGHTMARE' ? 'text-purple-400' : ''}`}>
                          {diff}
                        </span>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium italic">
                          {diff === 'EASY' && "Enemies have lower health and damage."}
                          {diff === 'NORMAL' && "Standard balanced difficulty."}
                          {diff === 'HARD' && "Highly lethal enemies and faster reaction needed."}
                          {diff === 'NIGHTMARE' && "Pure Abyssal Torture. Near impossible to survive."}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              {gameState === 'START' && (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                    
                    {/* Floating Shards */}
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={`shard-${i}`}
                        initial={{ 
                          x: Math.random() * 800, 
                          y: Math.random() * 600, 
                          rotation: Math.random() * 360,
                          opacity: 0 
                        }}
                        animate={{ 
                          x: [null, (Math.random() - 0.5) * 200 + Math.random() * 800],
                          y: [null, (Math.random() - 0.5) * 200 + Math.random() * 600],
                          rotate: [0, 360],
                          opacity: [0, 0.2, 0]
                        }}
                        transition={{ 
                          duration: 10 + Math.random() * 20, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                        className="absolute w-2 h-2 bg-white skew-x-12"
                      />
                    ))}
                  </div>

                  <div className="relative space-y-8 z-10 max-w-4xl">
                    <motion.div
                      initial={{ scale: 1.1, opacity: 0, y: 30 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      <div className="inline-block relative">
                         <motion.div 
                           initial={{ width: 0 }} 
                           animate={{ width: '100%' }} 
                           transition={{ delay: 0.8, duration: 1.5 }}
                           className="absolute -bottom-2 left-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" 
                         />
                         <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-9xl font-black text-white tracking-tighter italic uppercase leading-[0.8] font-display skew-x-[-10deg] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                          Aetheria: <br/>
                          <span className="text-white/90">The Fallen</span> <br/>
                          <span className="text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.4)]">Ascent</span>
                        </h1>
                      </div>
                      
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: 1.2 }}
                        className="flex items-center justify-center gap-6"
                      >
                        <div className="h-[1px] w-12 bg-white/10" />
                        <p className="text-white/40 text-[8px] sm:text-[10px] tracking-[0.8em] uppercase font-bold">
                          A Cursed RPG Adventure
                        </p>
                        <div className="h-[1px] w-12 bg-white/10" />
                      </motion.div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 }}
                      className="flex flex-col items-center gap-4 pt-8"
                    >
                      <button 
                        onClick={() => { soundManager.resume(); resetGame(); }} 
                        className="group relative w-full sm:w-80 px-12 py-5 bg-rose-600 hover:bg-rose-500 hover:scale-[1.02] active:scale-95 transition-all duration-300 rounded-lg flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(225,29,72,0.3)] border border-rose-400/20"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        <Play className="w-4 h-4 text-white mr-3 fill-white" />
                        <span className="text-white font-black uppercase tracking-[0.2em] text-[11px] sm:text-xs">Initiate New Cycle</span>
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/10 skew-x-[-20deg] translate-x-12 group-hover:translate-x-[-200px] transition-transform duration-700" />
                      </button>

                      {hasSave && (
                        <button 
                          onClick={() => { soundManager.resume(); loadGame(); }} 
                          className="group w-full sm:w-80 px-10 py-4 bg-slate-900/40 hover:bg-slate-800 backdrop-blur-md transition-all rounded-lg flex items-center justify-center border border-white/10 hover:border-white/20 active:scale-95"
                        >
                          <span className="text-white/60 group-hover:text-white font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-colors">Resume Journey</span>
                        </button>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Subtle Scanlines */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="h-[1px] w-full bg-white mb-2" />
                    ))}
                  </div>
                </div>
              )}
              {gameState === 'MAP' && (
                <div className="space-y-6 w-full max-w-xl">
                   <p className="text-rose-500 text-[10px] uppercase font-black tracking-[0.6em] sm:tracking-[1em]">Tower Floor Map</p>
                   <div className="flex flex-col items-center gap-3 relative w-full">
                      {TOWER_NODES.map((node) => {
                        const isCleared = clearedNodes.includes(node.id);
                        const isAvailable = node.id === 0 || clearedNodes.some(id => TOWER_NODES[id].connections.includes(node.id));
                        const isNext = isAvailable && !isCleared;
                        const isCurrent = node.id === currentMapNode && !isCleared;
                        return (
                          <motion.button key={node.id} disabled={!isNext} onClick={() => { setCurrentMapNode(node.id); setRoom(node.room); initGame(node.room, node.type); }} className={`p-4 border-2 transition-all w-full flex justify-between items-center rounded-xl ${isCurrent ? 'border-sky-500 bg-sky-950/40' : isNext ? 'border-white/20 hover:border-white bg-white/5 cursor-pointer hover:scale-[1.02]' : isCleared ? 'border-green-500/30 bg-green-500/5 opacity-60' : 'border-white/5 opacity-30 grayscale'}`}>
                             <div className="text-left flex-1 mr-4"><p className="text-[8px] text-slate-400 font-bold uppercase mb-1">{node.type}</p><p className="text-base font-black text-white italic uppercase tracking-tighter">{node.label}</p></div>
                             <div>{isCleared ? (<span className="text-green-500 font-black text-xs">CLEARED</span>) : isNext && (<span className="text-white text-[10px] font-black animate-pulse bg-white/10 px-4 py-2 rounded-full">ENTER</span>)}</div>
                          </motion.button>
                        );
                      })}
                   </div>
                </div>
              )}
              {gameState === 'UPGRADE' && (
                <div className="space-y-6 w-full max-w-2xl px-4 overflow-y-auto max-h-full py-10">
                   <div><p className="text-sky-500 text-[10px] uppercase font-black tracking-[0.6em] mb-2">Neural Link Synchronized</p><h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Acquire Skill</h2></div>
                   <div className="grid grid-cols-1 gap-3">
                      {SKILLS_LIST.map(skill => (
                        <button key={skill.id} disabled={unlockedSkills.includes(skill.id)} onClick={() => { const newSkills = [...unlockedSkills, skill.id]; setUnlockedSkills(newSkills); saveGame({ unlockedSkills: newSkills }); setGameState('MAP'); }} className={`p-4 border-2 rounded-xl text-left transition-all group ${unlockedSkills.includes(skill.id) ? 'border-green-500 bg-green-500/10 opacity-50' : 'border-white/10 hover:border-sky-500 bg-white/5'}`}>
                          <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-3"><h3 className="text-lg font-black text-white uppercase italic">{skill.name}</h3></div>{unlockedSkills.includes(skill.id) && <span className="text-green-500 font-bold text-[10px]">UNLOCKED</span>}</div>
                          <p className="text-slate-400 text-xs font-medium">{skill.description}</p>
                        </button>
                      ))}
                   </div>
                   <button onClick={() => setGameState('MAP')} className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em]">Skip for Now</button>
                </div>
              )}
              {gameState === 'ENDING' && (
                <div className="space-y-8 w-full max-w-xl px-4 text-center">
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }} 
                     animate={{ scale: 1, opacity: 1 }} 
                     className="space-y-4"
                   >
                     <p className="text-sky-400 text-[10px] uppercase font-black tracking-[1em] mb-4">The Curse is Broken</p>
                     <h1 className="text-6xl sm:text-9xl font-black text-white italic uppercase tracking-tighter leading-none font-display skew-x-[-10deg]">Victory</h1>
                   </motion.div>
                   
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.5 }}
                     className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 text-left space-y-6 shadow-2xl"
                   >
                     <div className="flex justify-between items-end border-b border-white/10 pb-4">
                       <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Final Cognition</span>
                       <span className="text-white font-display font-black text-4xl">{score}</span>
                     </div>
                     <p className="text-slate-300 text-sm leading-relaxed font-light">
                       You escaped <span className="text-white font-bold italic">Aetheria</span> as it crumbled into the void. The world is safe... for now. Your name is etched into the annals of the ascended.
                     </p>
                   </motion.div>

                   <button onClick={() => setGameState('START')} className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-[11px] shadow-[0_0_30px_rgba(255,255,255,0.2)]">Restart Cycle</button>
                </div>
              )}
              {gameState === 'GAMEOVER' && (
                <div className="space-y-8 w-full max-w-xl px-4 text-center">
                  <motion.div
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-2"
                  >
                    <h1 className="text-6xl sm:text-9xl font-black text-rose-500 tracking-tighter uppercase italic leading-none font-display skew-x-[-10deg] drop-shadow-[0_0_30px_rgba(244,63,94,0.4)]">Cursed</h1>
                    <p className="text-rose-500/60 uppercase tracking-[0.8em] text-[10px] font-black">Your Soul Has Faded</p>
                  </motion.div>

                  <div className="bg-rose-950/20 backdrop-blur-xl p-6 rounded-2xl border border-rose-500/10 space-y-2">
                    <p className="text-rose-400 text-[9px] uppercase font-black tracking-widest">Soul Fragments Collected</p>
                    <p className="text-white text-4xl font-display font-black tracking-widest">{score.toString().padStart(6, '0')}</p>
                  </div>

                  <button 
                    onClick={() => { setRoom(0); setCycle(0); setClearedNodes([]); setCurrentMapNode(0); setHealth(100); engineRef.current.player.score = 0; setGameState('START'); }} 
                    className="flex items-center justify-center mx-auto px-12 py-5 bg-rose-600 hover:bg-rose-500 hover:scale-105 transition-all rounded-lg text-white font-black uppercase tracking-widest text-[11px] shadow-2xl border border-rose-400/20"
                  >
                    <RotateCcw className="w-4 h-4 mr-3" />
                    Resurrect
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1 opacity-20"><span className="text-[9px] text-white uppercase tracking-[0.5em] font-medium">Aetheria Immersive Framework v4.0</span><div className="w-12 h-[1px] bg-sky-500" /></div>
      </div>
    </div>
  );
}
