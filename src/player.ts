import { Entity, InputState, Platform, Rectangle } from './types';

export class Player implements Entity {
  x: number;
  y: number;
  width: number = 32;
  height: number = 40;
  velocityX: number = 0;
  velocityY: number = 0;
  
  // Physics constants
  private readonly GRAVITY = 1100;
  private readonly JUMP_FORCE = 520;
  private readonly BOUNCE_FORCE = 650; // For bouncy platforms
  private readonly MOVE_SPEED = 340;
  private readonly MAX_FALL_SPEED = 800;
  private readonly ACCELERATION = 2200;
  private readonly FRICTION = 1500;
  private readonly AIR_CONTROL = 0.75; // Reduced control in air
  
  // State
  isOnGround: boolean = false;
  canJump: boolean = true;
  facingRight: boolean = true;
  isAlive: boolean = true;
  
  // Platform the player is standing on (for moving platform support)
  currentPlatform: Platform | null = null;
  
  // Visual
  color: string = '#3498db';
  
  constructor(x: number, y: number) {
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
  }
  
  update(deltaTime: number, input: InputState, platforms: Platform[]): void {
    if (!this.isAlive) return;
    
    const dt = deltaTime;
    const control = this.isOnGround ? 1 : this.AIR_CONTROL;
    
    // Apply moving platform velocity if standing on one
    if (this.currentPlatform && this.currentPlatform.type === 'moving' && this.currentPlatform.currentVelocityX) {
      this.x += this.currentPlatform.currentVelocityX * dt;
    }
    
    // Horizontal movement
    if (input.left) {
      this.velocityX -= this.ACCELERATION * control * dt;
      this.facingRight = false;
    } else if (input.right) {
      this.velocityX += this.ACCELERATION * control * dt;
      this.facingRight = true;
    } else {
      // Apply friction
      if (this.velocityX > 0) {
        this.velocityX = Math.max(0, this.velocityX - this.FRICTION * dt);
      } else if (this.velocityX < 0) {
        this.velocityX = Math.min(0, this.velocityX + this.FRICTION * dt);
      }
    }
    
    // Clamp horizontal velocity
    this.velocityX = Math.max(-this.MOVE_SPEED, Math.min(this.MOVE_SPEED, this.velocityX));
    
    // Jumping
    if (input.jump && input.jumpPressed && this.canJump && this.isOnGround) {
      this.velocityY = this.JUMP_FORCE;
      this.isOnGround = false;
      this.canJump = false;
      this.currentPlatform = null;
    }
    
    // Reset jump ability when button released
    if (!input.jump) {
      this.canJump = true;
    }
    
    // Apply gravity
    this.velocityY -= this.GRAVITY * dt;
    
    // Clamp fall speed
    this.velocityY = Math.max(-this.MAX_FALL_SPEED, this.velocityY);
    
    // Apply horizontal movement
    this.x += this.velocityX * dt;
    
    // No horizontal collision with platforms (one-way platforms)
    // This allows player to move through platforms horizontally
    
    // Apply vertical movement
    this.y += this.velocityY * dt;
    
    // Check vertical collisions (one-way: only when falling)
    this.isOnGround = false;
    this.currentPlatform = null;
    
    for (const platform of platforms) {
      // Only check collision when player is falling (velocityY < 0)
      // This allows jumping through platforms from below
      if (this.velocityY < 0 && this.intersectsFromAbove(platform)) {
        // Landing on platform from above
        this.y = platform.y + platform.height;
        this.isOnGround = true;
        this.currentPlatform = platform;
        
        // Handle special platform types
        if (platform.type === 'bouncy') {
          this.velocityY = this.BOUNCE_FORCE;
          this.isOnGround = false;
          this.currentPlatform = null;
        } else {
          this.velocityY = 0;
        }
        break; // Only land on one platform
      }
    }
    
    // Check if fell off world
    if (this.y < -100) {
      this.die();
    }
  }
  
  // Check if player is landing on platform from above
  private intersectsFromAbove(platform: Rectangle): boolean {
    const playerBottom = this.y;
    const playerTop = this.y + this.height;
    const platformTop = platform.y + platform.height;
    
    // Check horizontal overlap
    const horizontalOverlap = 
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x;
    
    // Check if player's bottom is near platform top (landing zone)
    // Player must be close to the top of the platform
    const verticalLanding = 
      playerBottom <= platformTop &&
      playerBottom >= platform.y - 10 && // Small tolerance
      playerTop > platformTop;
    
    return horizontalOverlap && verticalLanding;
  }
  
  private intersects(rect: Rectangle): boolean {
    return (
      this.x < rect.x + rect.width &&
      this.x + this.width > rect.x &&
      this.y < rect.y + rect.height &&
      this.y + this.height > rect.y
    );
  }
  
  // Get center position for camera
  getCenterX(): number {
    return this.x + this.width / 2;
  }
  
  getCenterY(): number {
    return this.y + this.height / 2;
  }
  
  // Get bounding box
  getBounds(): Rectangle {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
  
  die(): void {
    this.isAlive = false;
    this.color = '#7f8c8d';
  }
  
  respawn(x: number, y: number): void {
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isAlive = true;
    this.color = '#3498db';
  }
  
  // Render the player
  render(ctx: CanvasRenderingContext2D): void {
    // Body (rectangle)
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Eyes
    const eyeY = this.y + this.height * 0.3;
    const eyeSize = 5;
    ctx.fillStyle = '#ffffff';
    
    if (this.facingRight) {
      ctx.beginPath();
      ctx.arc(this.x + this.width * 0.6, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(this.x + this.width * 0.85, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(this.x + this.width * 0.65, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.arc(this.x + this.width * 0.9, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x + this.width * 0.15, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(this.x + this.width * 0.4, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(this.x + this.width * 0.1, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.arc(this.x + this.width * 0.35, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

