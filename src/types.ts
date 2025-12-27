// Game types and interfaces

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Entity extends Rectangle {
  velocityX: number;
  velocityY: number;
}

export interface Platform extends Rectangle {
  type: 'normal' | 'moving' | 'breakable' | 'bouncy';
  color: string;
  // For moving platforms
  moveRange?: number;
  moveSpeed?: number;
  startX?: number;
  // Current velocity (for dragging player)
  currentVelocityX?: number;
}

export interface Enemy extends Entity {
  type: 'walker' | 'jumper' | 'static';
  color: string;
  direction: 1 | -1;
  patrolRange?: number;
  startX?: number;
  alive: boolean;
}

export interface Collectible extends Rectangle {
  type: 'coin' | 'powerup' | 'star';
  collected: boolean;
  color: string;
}

export interface Cannon extends Rectangle {
  direction: 1 | -1; // 1 = right, -1 = left
  fireRate: number; // seconds between shots
  lastFired: number; // timestamp
  color: string;
}

export interface Projectile extends Rectangle {
  velocityX: number;
  velocityY: number;
  active: boolean;
  color: string;
}

export interface LevelData {
  platforms: Platform[];
  enemies: Enemy[];
  collectibles: Collectible[];
  cannons: Cannon[];
  projectiles: Projectile[];
  playerStart: Vector2;
  levelHeight: number;
  levelWidth: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean; // For detecting new jump press
}

export interface GameState {
  score: number;
  lives: number;
  gameOver: boolean;
  won: boolean;
  paused: boolean;
}

// Level tile types mapped from ASCII/emoji
export const TILE_TYPES = {
  // Platforms
  '▓': 'platform-normal',
  '═': 'platform-normal',
  '~': 'platform-moving',
  '○': 'platform-bouncy',
  '╳': 'platform-breakable',
  
  // Entities
  '🎮': 'player-start',
  'P': 'player-start',
  
  // Enemies
  '👾': 'enemy-walker',
  'W': 'enemy-walker',
  '🦘': 'enemy-jumper', 
  'J': 'enemy-jumper',
  '🔥': 'enemy-static',
  'S': 'enemy-static',
  
  // Cannons
  '►': 'cannon-right',
  '>': 'cannon-right',
  '◄': 'cannon-left',
  '<': 'cannon-left',
  
  // Collectibles
  '⭐': 'collectible-star',
  '*': 'collectible-star',
  '🪙': 'collectible-coin',
  'C': 'collectible-coin',
  '💎': 'collectible-powerup',
  'U': 'collectible-powerup',
  
  // Empty
  ' ': 'empty',
  '.': 'empty',
} as const;

export type TileType = keyof typeof TILE_TYPES;

