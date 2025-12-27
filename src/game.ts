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

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private lastTime: number = 0;
  
  // Game objects
  private player: Player;
  private level: LevelData;
  private input: InputHandler;
  
  // Camera
  private cameraY: number = 0;
  private cameraTargetY: number = 0;
  private readonly CAMERA_SMOOTHING = 5;
  private readonly CAMERA_OFFSET_Y = 0.4; // Player positioned at 40% from bottom
  
  // Game state
  private state: GameState = {
    score: 0,
    lives: 3,
    gameOver: false,
    won: false,
    paused: false,
  };
  
  // Visual settings
  private readonly BG_COLOR = '#0a0a12';
  private readonly BG_GRADIENT_TOP = '#1a1a2e';
  private readonly BG_GRADIENT_BOTTOM = '#0f0f1a';
  
  // Track highest point reached
  private highestY: number = 0;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    
    // Initialize
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Parse level
    this.level = parseLevel(DEMO_LEVEL);
    
    // Create player
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    
    // Create input handler
    this.input = new InputHandler();
    
    // Initialize camera
    this.cameraY = this.player.getCenterY() - this.canvas.height * this.CAMERA_OFFSET_Y;
    this.cameraTargetY = this.cameraY;
    this.highestY = this.player.getCenterY();
  }
  
  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  private update(deltaTime: number): void {
    if (this.state.gameOver || this.state.paused) return;
    
    // Get input
    const inputState = this.input.getState();
    
    // Update player
    this.player.update(deltaTime, inputState, this.level.platforms);
    
    // Update entities
    updatePlatforms(this.level.platforms, deltaTime);
    updateEnemies(this.level.enemies, this.level.platforms, deltaTime);
    updateCannons(this.level.cannons, this.level.projectiles, performance.now());
    updateProjectiles(this.level.projectiles, deltaTime, this.level.levelWidth);
    
    // Check enemy collisions
    const enemyHit = checkEnemyCollision(this.player.getBounds(), this.level.enemies);
    if (enemyHit.hit && enemyHit.enemy) {
      if (enemyHit.stomped) {
        // Player stomped on enemy
        enemyHit.enemy.alive = false;
        this.state.score += 100;
        // Bounce player up
        this.player.velocityY = 400;
      } else {
        // Player got hit
        this.playerHit();
      }
    }
    
    // Check projectile collisions
    if (checkProjectileCollision(this.player.getBounds(), this.level.projectiles)) {
      this.playerHit();
    }
    
    // Check collectibles
    const collected = checkCollectiblePickup(this.player.getBounds(), this.level.collectibles);
    if (collected) {
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
    
    // Track highest point (for score bonus)
    if (this.player.getCenterY() > this.highestY) {
      const heightBonus = Math.floor((this.player.getCenterY() - this.highestY) / TILE_SIZE);
      this.state.score += heightBonus;
      this.highestY = this.player.getCenterY();
    }
    
    // Check if player died (fell too far)
    if (!this.player.isAlive) {
      this.playerHit();
    }
    
    // Update camera - follows player upward, but only goes up (not down too much)
    const playerScreenY = this.player.getCenterY();
    const idealCameraY = playerScreenY - this.canvas.height * this.CAMERA_OFFSET_Y;
    
    // Camera moves up freely but is reluctant to go down
    if (idealCameraY > this.cameraTargetY) {
      this.cameraTargetY = idealCameraY;
    } else if (idealCameraY < this.cameraTargetY - this.canvas.height * 0.5) {
      // Allow some downward movement if player falls far
      this.cameraTargetY = idealCameraY + this.canvas.height * 0.3;
    }
    
    // Smooth camera movement
    this.cameraY += (this.cameraTargetY - this.cameraY) * this.CAMERA_SMOOTHING * deltaTime;
  }
  
  private playerHit(): void {
    this.state.lives--;
    
    if (this.state.lives <= 0) {
      this.state.gameOver = true;
    } else {
      // Respawn at a safe position (nearest platform below current position)
      let respawnY = this.level.playerStart.y;
      let respawnX = this.level.playerStart.x;
      
      for (const platform of this.level.platforms) {
        if (platform.y < this.player.y && platform.y > respawnY - 200) {
          respawnY = platform.y + platform.height + this.player.height;
          respawnX = platform.x + platform.width / 2;
          break;
        }
      }
      
      this.player.respawn(respawnX, respawnY);
      this.cameraTargetY = this.player.getCenterY() - this.canvas.height * this.CAMERA_OFFSET_Y;
    }
  }
  
  private render(time: number): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.BG_GRADIENT_TOP);
    gradient.addColorStop(1, this.BG_GRADIENT_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw parallax background elements (stars)
    this.renderBackground(time);
    
    // Set up camera transform
    ctx.save();
    
    // Center horizontally, scroll vertically
    const cameraX = Math.max(0, this.player.getCenterX() - width / 2);
    ctx.translate(-cameraX, this.cameraY + height);
    ctx.scale(1, -1); // Flip Y so positive is up
    
    // Render platforms
    for (const platform of this.level.platforms) {
      if (this.isVisible(platform.y, platform.height)) {
        renderPlatform(ctx, platform);
      }
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
    
    // Render UI (not affected by camera)
    this.renderUI();
    
    // Render game over screen
    if (this.state.gameOver) {
      this.renderGameOver();
    }
  }
  
  private isVisible(y: number, height: number): boolean {
    const viewBottom = this.cameraY - 50;
    const viewTop = this.cameraY + this.canvas.height + 50;
    return y + height > viewBottom && y < viewTop;
  }
  
  private renderBackground(time: number): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Draw some parallax stars
    ctx.fillStyle = '#ffffff';
    const starCount = 50;
    const parallaxFactor = 0.1;
    
    for (let i = 0; i < starCount; i++) {
      // Use deterministic positions based on index
      const baseX = ((i * 137) % width);
      const baseY = ((i * 251) % height);
      
      // Apply slight parallax based on camera
      const x = (baseX - this.cameraY * parallaxFactor * (i % 3)) % width;
      const y = (baseY + this.cameraY * parallaxFactor * 0.5) % height;
      
      const size = (i % 3) + 1;
      const alpha = 0.3 + (i % 5) * 0.15;
      
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }
  
  private renderUI(): void {
    const ctx = this.ctx;
    const padding = 20;
    
    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.state.score}`, padding, padding + 24);
    
    // Lives
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`♥ ${this.state.lives}`, padding, padding + 54);
    
    // Height indicator
    ctx.fillStyle = '#ffffff88';
    ctx.font = '16px monospace';
    ctx.fillText(`Height: ${Math.floor(this.highestY / TILE_SIZE)}m`, padding, padding + 80);
  }
  
  private renderGameOver(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Game over text
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 40);
    
    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.fillText(`Final Score: ${this.state.score}`, width / 2, height / 2 + 20);
    
    // Restart instruction
    ctx.fillStyle = '#888888';
    ctx.font = '18px monospace';
    ctx.fillText('Tap or press SPACE to restart', width / 2, height / 2 + 60);
    
    // Listen for restart
    if (!this.restartListenerAdded) {
      this.addRestartListener();
    }
  }
  
  private restartListenerAdded = false;
  
  private addRestartListener(): void {
    this.restartListenerAdded = true;
    
    const restart = () => {
      this.restart();
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouch);
      this.restartListenerAdded = false;
    };
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        restart();
      }
    };
    
    const handleTouch = () => {
      restart();
    };
    
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouch, { once: true });
  }
  
  private restart(): void {
    // Reset game state
    this.state = {
      score: 0,
      lives: 3,
      gameOver: false,
      won: false,
      paused: false,
    };
    
    // Reset level
    this.level = parseLevel(DEMO_LEVEL);
    
    // Reset player
    this.player.respawn(this.level.playerStart.x, this.level.playerStart.y);
    
    // Reset camera
    this.cameraY = this.player.getCenterY() - this.canvas.height * this.CAMERA_OFFSET_Y;
    this.cameraTargetY = this.cameraY;
    this.highestY = this.player.getCenterY();
  }
  
  public start(): void {
    const gameLoop = (time: number) => {
      // Calculate delta time in seconds
      const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1); // Cap at 100ms
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

