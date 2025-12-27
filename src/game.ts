import { GameState, LevelData } from './types';
import { Player } from './player';
import { InputHandler } from './input';
import { parseLevel, DEMO_LEVEL, TILE_SIZE } from './level-parser';
import {
  updatePlatforms,
  updateEnemies,
  updateCannons,
  updateProjectiles,
  checkEnemyCollision,
  checkCollectiblePickup,
  checkProjectileCollision,
  renderPlatform,
  renderEnemy,
  renderCollectible,
  renderCannon,
  renderProjectile,
} from './entities';
import { TEXT, interpolate } from './config/text';
import { SoundManager } from './assets/loader';

// Font constants
const FONT_TITLE = "'Pilowlava', 'Comic Sans MS', cursive";
const FONT_BODY = "'Space Mono', monospace";

type ScreenState = 'intro' | 'playing' | 'gameover' | 'won';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private lastTime: number = 0;
  
  // Screen state
  private screenState: ScreenState = 'intro';
  
  // Game objects
  private player!: Player;
  private level!: LevelData;
  private input: InputHandler;
  
  // Sound manager
  private sound: SoundManager;
  
  // Camera
  private cameraY: number = 0;
  private cameraTargetY: number = 0;
  private readonly CAMERA_SMOOTHING = 5;
  private readonly CAMERA_OFFSET_Y = 0.4;
  
  // Game state
  private state: GameState = {
    score: 0,
    lives: 3,
    gameOver: false,
    won: false,
    paused: false,
  };
  
  // Visual settings
  private readonly BG_GRADIENT_TOP = '#1a1a2e';
  private readonly BG_GRADIENT_BOTTOM = '#0f0f1a';
  
  // Track highest point reached
  private highestY: number = 0;
  
  // Screen shake
  private screenShakeTimer: number = 0;
  private readonly SCREEN_SHAKE_INTENSITY = 8;
  
  // Display dimensions (CSS pixels, not device pixels)
  private displayWidth: number = 0;
  private displayHeight: number = 0;
  private pixelRatio: number = 1;
  
  constructor(canvas: HTMLCanvasElement, soundManager: SoundManager) {
    this.canvas = canvas;
    this.sound = soundManager;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    
    // Initialize
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Create input handler
    this.input = new InputHandler();
    
    // Setup intro screen listener
    this.setupIntroListener();
  }
  
  private setupIntroListener(): void {
    const startGame = (e: Event) => {
      e.preventDefault();
      if (this.screenState === 'intro') {
        this.startGame();
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('click', handleClick);
      }
    };
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        startGame(e);
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
      startGame(e);
    };
    
    const handleClick = (e: MouseEvent) => {
      startGame(e);
    };
    
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('click', handleClick);
  }
  
  private startGame(): void {
    // Parse level
    this.level = parseLevel(DEMO_LEVEL);
    
    // Create player
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    
    // Initialize camera
    this.cameraY = this.player.getCenterY() - this.displayHeight * this.CAMERA_OFFSET_Y;
    this.cameraTargetY = this.cameraY;
    this.highestY = this.player.getCenterY();
    
    // Reset state
    this.state = {
      score: 0,
      lives: 3,
      gameOver: false,
      won: false,
      paused: false,
    };
    
    this.screenState = 'playing';
    
    // Hide touch controls visibility during intro
    const touchControls = document.getElementById('touch-controls');
    if (touchControls) {
      touchControls.style.display = 'flex';
    }
  }
  
  private resizeCanvas(): void {
    // Get the device pixel ratio for high-DPI displays
    this.pixelRatio = window.devicePixelRatio || 1;
    
    // Get the display size in CSS pixels
    this.displayWidth = window.innerWidth;
    this.displayHeight = window.innerHeight;
    
    // Set the canvas buffer size (actual pixels)
    this.canvas.width = this.displayWidth * this.pixelRatio;
    this.canvas.height = this.displayHeight * this.pixelRatio;
    
    // Set the display size via CSS
    this.canvas.style.width = `${this.displayWidth}px`;
    this.canvas.style.height = `${this.displayHeight}px`;
    
    // Scale the context to account for the pixel ratio
    // This allows us to use CSS pixel coordinates in our drawing code
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }
  
  private update(deltaTime: number): void {
    if (this.screenState !== 'playing') return;
    if (this.state.gameOver || this.state.won || this.state.paused) return;
    
    // Get input
    const inputState = this.input.getState();
    
    // Track player state before update
    const wasOnGroundBefore = this.player.isOnGround;
    const velocityYBefore = this.player.velocityY;
    
    // Create combined platforms list (including cannons as platforms)
    const allPlatforms = [
      ...this.level.platforms,
      ...this.level.cannons.map(cannon => ({
        x: cannon.x,
        y: cannon.y,
        width: cannon.width,
        height: cannon.height,
        type: 'normal' as const,
        color: cannon.color,
      }))
    ];
    
    // Update player
    this.player.update(deltaTime, inputState, allPlatforms, this.level.levelWidth);
    
    // Sound: Jump
    if (!wasOnGroundBefore && this.player.isOnGround && velocityYBefore < -50) {
      // Just landed
      this.sound.play('land');
    }
    if (wasOnGroundBefore && !this.player.isOnGround && this.player.velocityY > 0) {
      // Just jumped
      this.sound.play('jump');
    }
    // Sound: Bounce (from bouncy platform)
    if (this.player.velocityY > 500 && velocityYBefore < 200) {
      this.sound.play('bounce');
    }
    
    // Update entities
    updatePlatforms(this.level.platforms, deltaTime);
    updateEnemies(this.level.enemies, this.level.platforms, deltaTime);
    
    // Track cannon fire for sound
    const prevProjectileCount = this.level.projectiles.length;
    updateCannons(this.level.cannons, this.level.projectiles, performance.now());
    if (this.level.projectiles.length > prevProjectileCount) {
      this.sound.play('cannon');
    }
    
    updateProjectiles(this.level.projectiles, deltaTime, this.level.levelWidth);
    
    // Check portal collision (win condition)
    if (this.level.portal && this.checkPortalCollision()) {
      this.state.won = true;
      this.screenState = 'won';
      this.sound.play('win');
      this.setupEndScreenListener();
    }
    
    // Check enemy collisions (only if not invincible)
    if (!this.player.isInvincible) {
      const enemyHit = checkEnemyCollision(this.player.getBounds(), this.level.enemies, this.player.velocityY);
      if (enemyHit.hit && enemyHit.enemy) {
        if (enemyHit.stomped) {
          enemyHit.enemy.alive = false;
          this.state.score += 100;
          this.player.velocityY = 400;
          this.sound.play('stomp');
        } else {
          this.playerHit();
        }
      }
      
      if (checkProjectileCollision(this.player.getBounds(), this.level.projectiles)) {
        this.playerHit();
      }
    }
    
    // Check collectibles
    const collected = checkCollectiblePickup(this.player.getBounds(), this.level.collectibles);
    if (collected) {
      this.sound.play('coin');
      switch (collected.type) {
        case 'coin':
          this.state.score += 10;
          break;
        case 'star':
          this.state.score += 50;
          break;
        case 'powerup':
          this.state.score += 100;
          break;
      }
    }
    
    // Track highest point
    if (this.player.getCenterY() > this.highestY) {
      const heightBonus = Math.floor((this.player.getCenterY() - this.highestY) / TILE_SIZE);
      this.state.score += heightBonus;
      this.highestY = this.player.getCenterY();
    }
    
    // Check if player died
    if (!this.player.isAlive) {
      this.playerHit();
    }
    
    // Update camera
    const playerScreenY = this.player.getCenterY();
    const idealCameraY = playerScreenY - this.displayHeight * this.CAMERA_OFFSET_Y;
    
    if (idealCameraY > this.cameraTargetY) {
      this.cameraTargetY = idealCameraY;
    } else if (idealCameraY < this.cameraTargetY - this.displayHeight * 0.5) {
      this.cameraTargetY = idealCameraY + this.displayHeight * 0.3;
    }
    
    this.cameraY += (this.cameraTargetY - this.cameraY) * this.CAMERA_SMOOTHING * deltaTime;
    
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= deltaTime;
    }
  }
  
  private checkPortalCollision(): boolean {
    if (!this.level.portal) return false;
    const playerBounds = this.player.getBounds();
    const portal = this.level.portal;
    return (
      playerBounds.x < portal.x + portal.width &&
      playerBounds.x + playerBounds.width > portal.x &&
      playerBounds.y < portal.y + portal.height &&
      playerBounds.y + playerBounds.height > portal.y
    );
  }
  
  private playerHit(): void {
    if (this.player.isInvincible) return;
    
    this.state.lives--;
    this.sound.play('hit');
    
    if (this.state.lives <= 0) {
      this.state.gameOver = true;
      this.screenState = 'gameover';
      this.sound.play('gameover');
      this.setupEndScreenListener();
    } else {
      this.player.hit();
      this.screenShakeTimer = 0.2;
    }
  }
  
  private setupEndScreenListener(): void {
    const restart = (e: Event) => {
      e.preventDefault();
      this.restart();
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouch);
    };
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        restart(e);
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
      // Small delay to prevent accidental restart
      setTimeout(() => restart(e), 100);
    };
    
    setTimeout(() => {
      window.addEventListener('keydown', handleKey);
      window.addEventListener('touchstart', handleTouch, { once: true });
    }, 500);
  }
  
  private render(time: number): void {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;
    
    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.BG_GRADIENT_TOP);
    gradient.addColorStop(1, this.BG_GRADIENT_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw parallax background
    this.renderBackground(time);
    
    // Render based on screen state
    if (this.screenState === 'intro') {
      this.renderIntroScreen(time);
    } else {
      // Game world rendering
      ctx.save();
      
      let shakeX = 0;
      let shakeY = 0;
      if (this.screenShakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * this.SCREEN_SHAKE_INTENSITY * 2;
        shakeY = (Math.random() - 0.5) * this.SCREEN_SHAKE_INTENSITY * 2;
      }
      
      const cameraX = Math.max(0, this.player.getCenterX() - width / 2);
      ctx.translate(-cameraX + shakeX, this.cameraY + height + shakeY);
      ctx.scale(1, -1);
      
      // Render walls (left and right boundaries)
      this.renderWalls(ctx);
      
      // Render platforms
      for (const platform of this.level.platforms) {
        if (this.isVisible(platform.y, platform.height)) {
          renderPlatform(ctx, platform);
        }
      }
      
      // Render portal
      if (this.level.portal && this.isVisible(this.level.portal.y, this.level.portal.height)) {
        this.renderPortal(ctx, time);
      }
      
      // Render collectibles
      for (const collectible of this.level.collectibles) {
        if (this.isVisible(collectible.y, collectible.height)) {
          renderCollectible(ctx, collectible, time);
        }
      }
      
      // Render enemies
      for (const enemy of this.level.enemies) {
        if (this.isVisible(enemy.y, enemy.height)) {
          renderEnemy(ctx, enemy);
        }
      }
      
      // Render cannons
      for (const cannon of this.level.cannons) {
        if (this.isVisible(cannon.y, cannon.height)) {
          renderCannon(ctx, cannon);
        }
      }
      
      // Render projectiles
      for (const projectile of this.level.projectiles) {
        if (projectile.active && this.isVisible(projectile.y, projectile.height)) {
          renderProjectile(ctx, projectile);
        }
      }
      
      // Render player
      this.player.render(ctx);
      
      ctx.restore();
      
      // Hit flash overlay
      if (this.player.hitFlashTimer > 0) {
        const flashAlpha = this.player.hitFlashTimer / 0.15 * 0.4;
        ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Render UI
      this.renderUI();
      
      // Render end screens
      if (this.screenState === 'gameover') {
        this.renderGameOver();
      } else if (this.screenState === 'won') {
        this.renderWinScreen();
      }
    }
  }
  
  private renderIntroScreen(time: number): void {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Title - using Pilowlava font
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e74c3c';
    ctx.font = `72px ${FONT_TITLE}`;
    ctx.fillText(TEXT.title.line1, width / 2, height * 0.18);
    ctx.fillText(TEXT.title.line2, width / 2, height * 0.28);
    
    // Subtitle - using Space Mono
    ctx.fillStyle = '#d4c4a8';
    ctx.font = `28px ${FONT_BODY}`;
    ctx.fillText(TEXT.intro.subtitle1, width / 2, height * 0.38);
    ctx.fillText(TEXT.intro.subtitle2, width / 2, height * 0.44);
    
    // Start button
    const btnWidth = 280;
    const btnHeight = 70;
    const btnX = width / 2 - btnWidth / 2;
    const btnY = height * 0.52;
    
    // Button glow
    const pulse = Math.sin(time / 500) * 0.1 + 0.9;
    ctx.fillStyle = `rgba(106, 137, 128, ${0.8 * pulse})`;
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    
    // Button border
    ctx.strokeStyle = '#5a7a70';
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
    
    // Button text - using Space Mono
    ctx.fillStyle = '#1a1a2e';
    ctx.font = `bold 32px ${FONT_BODY}`;
    ctx.fillText(TEXT.intro.startButton, width / 2, btnY + btnHeight / 2 + 10);
    
    // Additional text - using Space Mono
    ctx.fillStyle = '#c9a87c';
    ctx.font = `20px ${FONT_BODY}`;
    ctx.fillText(TEXT.intro.message1, width / 2, height * 0.70);
    ctx.fillText(TEXT.intro.message2, width / 2, height * 0.75);
    ctx.fillText(TEXT.intro.message3, width / 2, height * 0.80);
    
    ctx.fillText(TEXT.intro.hint1, width / 2, height * 0.88);
    ctx.fillText(TEXT.intro.hint2, width / 2, height * 0.93);
    
    // Hide touch controls on intro
    const touchControls = document.getElementById('touch-controls');
    if (touchControls) {
      touchControls.style.display = 'none';
    }
  }
  
  private renderPortal(ctx: CanvasRenderingContext2D, time: number): void {
    const portal = this.level.portal;
    if (!portal) return;
    
    const cx = portal.x + portal.width / 2;
    const cy = portal.y + portal.height / 2;
    const radius = portal.width / 2;
    const rotation = time / 500;
    
    // Outer glow
    const glowSize = radius * 1.5 + Math.sin(time / 300) * 10;
    const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
    glowGradient.addColorStop(0, 'rgba(155, 89, 182, 0.6)');
    glowGradient.addColorStop(0.5, 'rgba(142, 68, 173, 0.3)');
    glowGradient.addColorStop(1, 'rgba(142, 68, 173, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Swirling rings
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(155, 89, 182, ${0.8 - i * 0.2})`;
      ctx.lineWidth = 4 - i;
      ctx.beginPath();
      const ringRadius = radius * (0.5 + i * 0.2);
      ctx.arc(cx, cy, ringRadius, rotation + i, rotation + i + Math.PI * 1.5);
      ctx.stroke();
    }
    
    // Inner portal
    const innerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.6);
    innerGradient.addColorStop(0, '#ffffff');
    innerGradient.addColorStop(0.3, '#bb8fce');
    innerGradient.addColorStop(0.7, '#8e44ad');
    innerGradient.addColorStop(1, '#5b2c6f');
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Sparkles
    for (let i = 0; i < 6; i++) {
      const angle = rotation * 2 + (i / 6) * Math.PI * 2;
      const sparkleR = radius * 0.8 + Math.sin(time / 200 + i) * 5;
      const sx = cx + Math.cos(angle) * sparkleR;
      const sy = cy + Math.sin(angle) * sparkleR;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  private renderWinScreen(): void {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;
    
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Congratulations - using Pilowlava
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1c40f';
    ctx.font = `56px ${FONT_TITLE}`;
    ctx.fillText(TEXT.win.title, width / 2, height * 0.25);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `32px ${FONT_BODY}`;
    ctx.fillText(TEXT.win.congratulations, width / 2, height * 0.38);
    
    ctx.fillStyle = '#d4c4a8';
    ctx.font = `24px ${FONT_BODY}`;
    ctx.fillText(TEXT.win.portalReached, width / 2, height * 0.48);
    
    // Score
    ctx.fillStyle = '#3498db';
    ctx.font = `bold 28px ${FONT_BODY}`;
    ctx.fillText(interpolate(TEXT.win.finalScore, { score: this.state.score }), width / 2, height * 0.58);
    
    // Message
    ctx.fillStyle = '#c9a87c';
    ctx.font = `22px ${FONT_BODY}`;
    ctx.fillText(TEXT.win.reminder1, width / 2, height * 0.72);
    ctx.fillText(TEXT.win.reminder2, width / 2, height * 0.78);
    
    // Restart hint
    ctx.fillStyle = '#888888';
    ctx.font = `18px ${FONT_BODY}`;
    ctx.fillText(TEXT.win.restartHint, width / 2, height * 0.90);
  }
  
  private isVisible(y: number, height: number): boolean {
    const viewBottom = this.cameraY - 50;
    const viewTop = this.cameraY + this.displayHeight + 50;
    return y + height > viewBottom && y < viewTop;
  }
  
  private renderBackground(_time: number): void {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;
    
    ctx.fillStyle = '#ffffff';
    const starCount = 50;
    const parallaxFactor = 0.1;
    const cameraOffset = this.screenState === 'intro' ? 0 : this.cameraY;
    
    for (let i = 0; i < starCount; i++) {
      const baseX = ((i * 137) % width);
      const baseY = ((i * 251) % height);
      
      const x = (baseX - cameraOffset * parallaxFactor * (i % 3)) % width;
      const y = (baseY + cameraOffset * parallaxFactor * 0.5) % height;
      
      const size = (i % 3) + 1;
      const alpha = 0.3 + (i % 5) * 0.15;
      
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(Math.abs(x), Math.abs(y), size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }
  
  private renderUI(): void {
    const ctx = this.ctx;
    const padding = 20;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${FONT_BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText(interpolate(TEXT.ui.score, { score: this.state.score }), padding, padding + 24);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(interpolate(TEXT.ui.lives, { lives: this.state.lives }), padding, padding + 54);
    
    ctx.fillStyle = '#ffffff88';
    ctx.font = `16px ${FONT_BODY}`;
    ctx.fillText(interpolate(TEXT.ui.height, { height: Math.floor(this.highestY / TILE_SIZE) }), padding, padding + 80);
  }
  
  private renderGameOver(): void {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Title - using Pilowlava
    ctx.fillStyle = '#e74c3c';
    ctx.font = `48px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.fillText(TEXT.gameOver.title, width / 2, height / 2 - 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `24px ${FONT_BODY}`;
    ctx.fillText(interpolate(TEXT.gameOver.finalScore, { score: this.state.score }), width / 2, height / 2 + 20);
    
    ctx.fillStyle = '#888888';
    ctx.font = `18px ${FONT_BODY}`;
    ctx.fillText(TEXT.gameOver.restartHint, width / 2, height / 2 + 60);
  }
  
  private renderWalls(ctx: CanvasRenderingContext2D): void {
    const wallWidth = 20;
    const levelWidth = this.level.levelWidth;
    const levelHeight = this.level.levelHeight;
    
    // Extend walls beyond visible area
    const wallBottom = -100;
    const wallTop = levelHeight + 500;
    const wallHeight = wallTop - wallBottom;
    
    // Wall gradient colors
    const wallColorDark = '#2c3e50';
    const wallColorLight = '#34495e';
    const wallHighlight = '#4a6278';
    
    // Left wall
    ctx.fillStyle = wallColorDark;
    ctx.fillRect(-wallWidth, wallBottom, wallWidth, wallHeight);
    
    // Left wall inner edge highlight
    ctx.fillStyle = wallHighlight;
    ctx.fillRect(-4, wallBottom, 4, wallHeight);
    
    // Left wall brick pattern
    ctx.fillStyle = wallColorLight;
    const brickHeight = 40;
    const brickOffset = 20;
    for (let y = wallBottom; y < wallTop; y += brickHeight) {
      const offset = Math.floor(y / brickHeight) % 2 === 0 ? 0 : brickOffset;
      ctx.fillRect(-wallWidth + offset, y, wallWidth / 2 - 2, brickHeight - 2);
    }
    
    // Right wall
    ctx.fillStyle = wallColorDark;
    ctx.fillRect(levelWidth, wallBottom, wallWidth, wallHeight);
    
    // Right wall inner edge highlight
    ctx.fillStyle = wallHighlight;
    ctx.fillRect(levelWidth, wallBottom, 4, wallHeight);
    
    // Right wall brick pattern
    ctx.fillStyle = wallColorLight;
    for (let y = wallBottom; y < wallTop; y += brickHeight) {
      const offset = Math.floor(y / brickHeight) % 2 === 0 ? brickOffset : 0;
      ctx.fillRect(levelWidth + offset, y, wallWidth / 2 - 2, brickHeight - 2);
    }
  }
  
  private restart(): void {
    this.state = {
      score: 0,
      lives: 3,
      gameOver: false,
      won: false,
      paused: false,
    };
    
    this.level = parseLevel(DEMO_LEVEL);
    this.player.respawn(this.level.playerStart.x, this.level.playerStart.y);
    
    this.cameraY = this.player.getCenterY() - this.displayHeight * this.CAMERA_OFFSET_Y;
    this.cameraTargetY = this.cameraY;
    this.highestY = this.player.getCenterY();
    
    this.screenState = 'playing';
  }
  
  public start(): void {
    const gameLoop = (time: number) => {
      const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      
      this.update(deltaTime);
      this.render(time);
      
      this.animationId = requestAnimationFrame(gameLoop);
    };
    
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(gameLoop);
  }
  
  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
