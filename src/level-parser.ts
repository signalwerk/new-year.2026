import { 
  LevelData, 
  Platform, 
  Enemy, 
  Collectible, 
  Cannon,
  Projectile,
  Portal,
  Vector2, 
  TILE_TYPES, 
  TileType 
} from './types';

// Each tile is this many pixels
export const TILE_SIZE = 40;

// Color schemes for different element types
const PLATFORM_COLORS = {
  'normal': '#4a7c59',
  'moving': '#7c4a6b',
  'bouncy': '#4a6b7c',
  'breakable': '#7c6b4a',
};

const ENEMY_COLORS = {
  'walker': '#c94c4c',
  'jumper': '#c94c4c',
  'static': '#c94c4c',
  'flyer': '#c94c4c',
};

const COLLECTIBLE_COLORS = {
  'coin': '#ffd700',
  'star': '#ffff00',
  'powerup': '#00ffff',
};

export function parseLevel(asciiLevel: string): LevelData {
  const lines = asciiLevel.trim().split('\n');
  const platforms: Platform[] = [];
  const enemies: Enemy[] = [];
  const collectibles: Collectible[] = [];
  const cannons: Cannon[] = [];
  const projectiles: Projectile[] = [];
  let portal: Portal | null = null;
  let playerStart: Vector2 = { x: 100, y: 100 };
  
  // Level is read top-to-bottom, but we need to flip Y for game coordinates
  // In our game, Y=0 is at the bottom, Y increases upward
  const levelHeight = lines.length * TILE_SIZE;
  let maxWidth = 0;
  
  // Track horizontal runs of platform tiles for merging
  const platformRuns: Map<number, { startCol: number; endCol: number; type: string }[]> = new Map();
  
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    // Convert row to game Y coordinate (flip vertical)
    const gameY = (lines.length - 1 - row) * TILE_SIZE;
    
    // Parse character by character, handling multi-byte emoji
    const chars = [...line]; // This properly handles emoji
    maxWidth = Math.max(maxWidth, chars.length * TILE_SIZE);
    
    let col = 0;
    for (const char of chars) {
      const gameX = col * TILE_SIZE;
      const tileType = TILE_TYPES[char as TileType];
      
      if (tileType) {
        if (tileType === 'player-start') {
          playerStart = { x: gameX + TILE_SIZE / 2, y: gameY + TILE_SIZE / 2 };
        } 
        else if (tileType.startsWith('platform-')) {
          const platformType = tileType.replace('platform-', '') as Platform['type'];
          // Track this platform tile for potential merging
          if (!platformRuns.has(row)) {
            platformRuns.set(row, []);
          }
          const runs = platformRuns.get(row)!;
          const lastRun = runs[runs.length - 1];
          
          if (lastRun && lastRun.endCol === col - 1 && lastRun.type === platformType) {
            // Extend existing run
            lastRun.endCol = col;
          } else {
            // Start new run
            runs.push({ startCol: col, endCol: col, type: platformType });
          }
        }
        else if (tileType.startsWith('enemy-')) {
          const enemyType = tileType.replace('enemy-', '') as Enemy['type'];
          // Set speed based on enemy type - faster speeds
          let velocityX = 0;
          let patrolRange = TILE_SIZE * 3;
          
          if (enemyType === 'walker') {
            velocityX = 120; // Faster walker
            patrolRange = TILE_SIZE * 4;
          } else if (enemyType === 'flyer') {
            velocityX = 100; // Flying enemy
            patrolRange = TILE_SIZE * 3;
          }
          
          enemies.push({
            x: gameX,
            y: gameY,
            width: TILE_SIZE * 0.8,
            height: TILE_SIZE * 0.8,
            velocityX: velocityX,
            velocityY: 0,
            type: enemyType,
            color: ENEMY_COLORS[enemyType as keyof typeof ENEMY_COLORS],
            direction: 1,
            patrolRange: patrolRange,
            startX: gameX,
            startY: gameY,
            alive: true,
          });
        }
        else if (tileType.startsWith('collectible-')) {
          const collectibleType = tileType.replace('collectible-', '') as Collectible['type'];
          collectibles.push({
            x: gameX + TILE_SIZE * 0.25,
            y: gameY + TILE_SIZE * 0.25,
            width: TILE_SIZE * 0.5,
            height: TILE_SIZE * 0.5,
            type: collectibleType,
            collected: false,
            color: COLLECTIBLE_COLORS[collectibleType],
          });
        }
        else if (tileType.startsWith('cannon-')) {
          const direction = tileType === 'cannon-right' ? 1 : -1;
          cannons.push({
            x: gameX,
            y: gameY,
            width: TILE_SIZE,
            height: TILE_SIZE,
            direction: direction,
            fireRate: 1.5, // Fire every 1.5 seconds - faster!
            lastFired: 0,
            color: '#5c6370',
          });
        }
        else if (tileType === 'portal') {
          portal = {
            x: gameX,
            y: gameY,
            width: TILE_SIZE * 2,
            height: TILE_SIZE * 2,
            color: '#9b59b6',
          };
        }
      }
      col++;
    }
  }
  
  // Convert platform runs to actual platform objects
  for (const [row, runs] of platformRuns) {
    const gameY = (lines.length - 1 - row) * TILE_SIZE;
    
    for (const run of runs) {
      const width = (run.endCol - run.startCol + 1) * TILE_SIZE;
      const platform: Platform = {
        x: run.startCol * TILE_SIZE,
        y: gameY,
        width: width,
        height: TILE_SIZE * 0.4, // Platforms are thinner than full tile
        type: run.type as Platform['type'],
        color: PLATFORM_COLORS[run.type as keyof typeof PLATFORM_COLORS],
      };
      
      // Add movement properties for moving platforms
      if (platform.type === 'moving') {
        platform.moveRange = TILE_SIZE * 3;
        platform.moveSpeed = 80;
        platform.startX = platform.x;
        platform.currentVelocityX = 0;
      }
      
      platforms.push(platform);
    }
  }
  
  return {
    platforms,
    enemies,
    collectibles,
    cannons,
    projectiles,
    portal,
    playerStart,
    levelHeight,
    levelWidth: maxWidth,
  };
}

// Challenging level with cannons, enemies, and obstacles
// Legend:
// ▓ = normal platform, ~ = moving platform, ○ = bouncy platform
// P = player start, W = walker, S = static hazard, F = flyer
// * = star, > = cannon right, < = cannon left, O = portal (goal)
// All lines are exactly 30 characters for consistent level width
export const DEMO_LEVEL = `
..............................
..............O...............
..............................
..............*...............
......▓▓▓▓▓▓▓▓▓▓▓▓▓▓..........
............F.................
.*.......W...........○○○○○....
.▓▓▓▓▓▓▓▓▓▓▓▓......▓▓▓▓▓▓....
..........>........*..........
.○○○○..........▓▓▓▓▓▓......F..
......................▓▓▓▓▓▓▓▓
...............<..............
.*....W.....○○○○○○○○○○........
.▓▓▓▓▓▓▓▓▓▓...................
..............*...............
..▓▓▓▓▓....▓▓▓▓▓▓▓▓▓▓.....F...
..>............W.......○○○○...
........▓▓▓▓▓▓▓▓▓▓▓...........
.*..S.........................
.○○○○○○○○○.......▓▓▓▓▓▓▓▓....
..........<...................
.F.......▓▓▓▓▓▓▓▓........*....
.....................○○○○○○○○○
......*........W..............
.....▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓........
............>..........*.....
.*..W...○○○○○○○..........▓▓▓▓▓
.▓▓▓▓▓▓▓▓▓▓...................
..........<...................
.......▓▓▓▓▓▓▓▓▓▓▓.....*...F..
.....F.................○○○○○○○
.*...........W................
.○○○○○○○○▓▓▓▓▓▓▓▓.............
.......>......................
.▓▓▓▓▓▓▓▓.........○○○○○○○○....
..........*......W............
....~~~~.....▓▓▓▓▓▓▓▓▓▓▓▓.....
...........<..................
.*...○○○○○○○○○○.....S.........
....................▓▓▓▓▓▓▓...
........W.......*..........F..
....▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓..........
..>...........................
.▓▓▓▓▓▓......○○○○○○○○○○.......
........*.....................
.○○○○○○○○...▓▓▓▓▓▓...W........
.....S.............▓▓▓▓▓▓▓▓▓▓▓
.*......W.....................
.▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓...........
..............................
.P............................
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
`;
