import { Enemy, Platform, Collectible, Cannon, Projectile, Rectangle } from './types';

// Helper for rectangle intersection
function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Update moving platforms
export function updatePlatforms(platforms: Platform[], deltaTime: number): void {
  for (const platform of platforms) {
    if (platform.type === 'moving' && platform.startX !== undefined) {
      const velocity = (platform.moveSpeed || 60);
      platform.currentVelocityX = velocity; // Store current velocity for player drag
      platform.x += velocity * deltaTime;
      
      // Reverse direction at range limits
      const moveRange = platform.moveRange || 100;
      if (platform.x > platform.startX + moveRange) {
        platform.x = platform.startX + moveRange;
        platform.moveSpeed = -Math.abs(platform.moveSpeed || 60);
      } else if (platform.x < platform.startX) {
        platform.x = platform.startX;
        platform.moveSpeed = Math.abs(platform.moveSpeed || 60);
      }
    }
  }
}

// Update enemies
export function updateEnemies(enemies: Enemy[], platforms: Platform[], deltaTime: number): void {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    
    switch (enemy.type) {
      case 'walker':
        updateWalkerEnemy(enemy, platforms, deltaTime);
        break;
      case 'jumper':
        updateJumperEnemy(enemy, deltaTime);
        break;
      case 'static':
        // Static enemies don't move
        break;
    }
  }
}

function updateWalkerEnemy(enemy: Enemy, platforms: Platform[], deltaTime: number): void {
  // Simple patrol behavior
  enemy.x += enemy.velocityX * enemy.direction * deltaTime;
  
  // Check patrol range
  const patrolRange = enemy.patrolRange || 100;
  if (enemy.startX !== undefined) {
    if (enemy.x > enemy.startX + patrolRange || enemy.x < enemy.startX - patrolRange) {
      enemy.direction *= -1;
      enemy.x = Math.max(enemy.startX - patrolRange, Math.min(enemy.startX + patrolRange, enemy.x));
    }
  }
  
  // Check platform edges (don't walk off)
  let onPlatform = false;
  for (const platform of platforms) {
    // Check if enemy is above this platform
    if (
      enemy.x + enemy.width > platform.x &&
      enemy.x < platform.x + platform.width &&
      Math.abs((enemy.y) - (platform.y + platform.height)) < 5
    ) {
      onPlatform = true;
      
      // Check if about to walk off edge
      if (enemy.direction > 0 && enemy.x + enemy.width > platform.x + platform.width - 10) {
        enemy.direction = -1;
      } else if (enemy.direction < 0 && enemy.x < platform.x + 10) {
        enemy.direction = 1;
      }
      break;
    }
  }
}

function updateJumperEnemy(enemy: Enemy, deltaTime: number): void {
  // Simple bounce animation
  const time = Date.now() / 500;
  enemy.y = (enemy.startX || enemy.y) + Math.sin(time) * 20; // Using startX to store base Y
}

// Update cannons and fire projectiles
export function updateCannons(cannons: Cannon[], projectiles: Projectile[], time: number): void {
  for (const cannon of cannons) {
    const timeSinceLastFire = (time - cannon.lastFired) / 1000;
    
    if (timeSinceLastFire >= cannon.fireRate) {
      // Fire a new projectile
      const projectile: Projectile = {
        x: cannon.direction === 1 ? cannon.x + cannon.width : cannon.x - 15,
        y: cannon.y + cannon.height / 2 - 7,
        width: 15,
        height: 15,
        velocityX: cannon.direction * 250,
        velocityY: 0,
        active: true,
        color: '#ff6b6b',
      };
      projectiles.push(projectile);
      cannon.lastFired = time;
    }
  }
}

// Update projectiles
export function updateProjectiles(projectiles: Projectile[], deltaTime: number, levelWidth: number): void {
  for (const projectile of projectiles) {
    if (!projectile.active) continue;
    
    projectile.x += projectile.velocityX * deltaTime;
    projectile.y += projectile.velocityY * deltaTime;
    
    // Deactivate if off screen
    if (projectile.x < -100 || projectile.x > levelWidth + 100) {
      projectile.active = false;
    }
  }
}

// Check projectile collision with player
export function checkProjectileCollision(playerBounds: Rectangle, projectiles: Projectile[]): boolean {
  for (const projectile of projectiles) {
    if (!projectile.active) continue;
    
    if (intersects(playerBounds, projectile)) {
      projectile.active = false;
      return true;
    }
  }
  return false;
}

// Check collision between player bounds and enemy
export function checkEnemyCollision(playerBounds: Rectangle, enemies: Enemy[]): { hit: boolean; stomped: boolean; enemy?: Enemy } {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    
    if (intersects(playerBounds, enemy)) {
      // Check if player is stomping (coming from above)
      const playerBottom = playerBounds.y;
      const enemyTop = enemy.y + enemy.height;
      const playerCenterX = playerBounds.x + playerBounds.width / 2;
      const enemyCenterX = enemy.x + enemy.width / 2;
      
      // Stomp if player is falling onto enemy from above
      if (playerBottom < enemyTop + 10 && Math.abs(playerCenterX - enemyCenterX) < enemy.width * 0.6) {
        return { hit: true, stomped: true, enemy };
      }
      
      return { hit: true, stomped: false, enemy };
    }
  }
  
  return { hit: false, stomped: false };
}

// Check collectible pickup
export function checkCollectiblePickup(playerBounds: Rectangle, collectibles: Collectible[]): Collectible | null {
  for (const collectible of collectibles) {
    if (collectible.collected) continue;
    
    if (intersects(playerBounds, collectible)) {
      collectible.collected = true;
      return collectible;
    }
  }
  
  return null;
}

// Render functions
export function renderPlatform(ctx: CanvasRenderingContext2D, platform: Platform): void {
  ctx.fillStyle = platform.color;
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  
  // Add some visual variation based on type
  if (platform.type === 'bouncy') {
    // Draw spring-like pattern
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    const springs = Math.floor(platform.width / 20);
    for (let i = 0; i < springs; i++) {
      const sx = platform.x + 10 + i * 20;
      ctx.beginPath();
      ctx.moveTo(sx, platform.y + platform.height);
      ctx.lineTo(sx + 5, platform.y + platform.height * 0.3);
      ctx.lineTo(sx + 10, platform.y + platform.height);
      ctx.stroke();
    }
  } else if (platform.type === 'moving') {
    // Draw movement indicators
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(platform.x + 5, platform.y + 5, platform.width - 10, platform.height - 10);
  } else if (platform.type === 'breakable') {
    // Draw cracks
    ctx.strokeStyle = '#00000044';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(platform.x + platform.width * 0.3, platform.y);
    ctx.lineTo(platform.x + platform.width * 0.4, platform.y + platform.height);
    ctx.moveTo(platform.x + platform.width * 0.7, platform.y);
    ctx.lineTo(platform.x + platform.width * 0.6, platform.y + platform.height);
    ctx.stroke();
  }
}

export function renderEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  if (!enemy.alive) return;
  
  ctx.fillStyle = enemy.color;
  
  // Different shapes for different enemy types
  switch (enemy.type) {
    case 'walker':
      // Rectangle body
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      // Eyes
      ctx.fillStyle = '#ffffff';
      const eyeOffsetX = enemy.direction > 0 ? enemy.width * 0.6 : enemy.width * 0.2;
      ctx.beginPath();
      ctx.arc(enemy.x + eyeOffsetX, enemy.y + enemy.height * 0.3, 4, 0, Math.PI * 2);
      ctx.arc(enemy.x + eyeOffsetX + 10, enemy.y + enemy.height * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'jumper':
      // Triangle/spike shape
      ctx.beginPath();
      ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
      ctx.lineTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + enemy.width, enemy.y);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'static':
      // Circle (fire/hazard)
      ctx.beginPath();
      ctx.arc(
        enemy.x + enemy.width / 2, 
        enemy.y + enemy.height / 2, 
        Math.min(enemy.width, enemy.height) / 2, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
      // Inner glow
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(
        enemy.x + enemy.width / 2, 
        enemy.y + enemy.height / 2, 
        Math.min(enemy.width, enemy.height) / 4, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
      break;
  }
}

export function renderCollectible(ctx: CanvasRenderingContext2D, collectible: Collectible, time: number): void {
  if (collectible.collected) return;
  
  // Floating animation
  const floatOffset = Math.sin(time / 300 + collectible.x) * 5;
  const y = collectible.y + floatOffset;
  
  ctx.fillStyle = collectible.color;
  
  switch (collectible.type) {
    case 'coin':
      // Circle
      ctx.beginPath();
      ctx.arc(
        collectible.x + collectible.width / 2, 
        y + collectible.height / 2, 
        collectible.width / 2, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
      // Inner shine
      ctx.fillStyle = '#ffffff44';
      ctx.beginPath();
      ctx.arc(
        collectible.x + collectible.width * 0.4, 
        y + collectible.height * 0.4, 
        collectible.width / 4, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
      break;
      
    case 'star':
      // 5-pointed star
      drawStar(ctx, collectible.x + collectible.width / 2, y + collectible.height / 2, 5, collectible.width / 2, collectible.width / 4);
      break;
      
    case 'powerup':
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(collectible.x + collectible.width / 2, y);
      ctx.lineTo(collectible.x + collectible.width, y + collectible.height / 2);
      ctx.lineTo(collectible.x + collectible.width / 2, y + collectible.height);
      ctx.lineTo(collectible.x, y + collectible.height / 2);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// Render cannon
export function renderCannon(ctx: CanvasRenderingContext2D, cannon: Cannon): void {
  ctx.fillStyle = cannon.color;
  
  // Base (square)
  ctx.fillRect(cannon.x, cannon.y, cannon.width, cannon.height);
  
  // Barrel
  ctx.fillStyle = '#2c3e50';
  const barrelWidth = cannon.width * 0.6;
  const barrelHeight = cannon.height * 0.4;
  const barrelY = cannon.y + cannon.height / 2 - barrelHeight / 2;
  
  if (cannon.direction === 1) {
    ctx.fillRect(cannon.x + cannon.width - 5, barrelY, barrelWidth, barrelHeight);
  } else {
    ctx.fillRect(cannon.x - barrelWidth + 5, barrelY, barrelWidth, barrelHeight);
  }
  
  // Highlight
  ctx.fillStyle = '#ffffff33';
  ctx.fillRect(cannon.x + 3, cannon.y + 3, cannon.width - 6, cannon.height * 0.3);
}

// Render projectile
export function renderProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile): void {
  if (!projectile.active) return;
  
  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(
    projectile.x + projectile.width / 2,
    projectile.y + projectile.height / 2,
    projectile.width / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  // Inner glow
  ctx.fillStyle = '#ffffff88';
  ctx.beginPath();
  ctx.arc(
    projectile.x + projectile.width / 2,
    projectile.y + projectile.height / 2,
    projectile.width / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

