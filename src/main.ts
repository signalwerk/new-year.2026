import { Game } from './game';
import { AssetLoader, SoundManager } from './assets/loader';
import './style.css';

async function init() {
  // Create and show loading screen
  const loader = new AssetLoader();
  
  // Load all assets
  const assets = await loader.loadAll((progress) => {
    console.log(`Loading: ${progress.percentage}% - ${progress.currentAsset}`);
  });
  
  // Create sound manager
  const soundManager = new SoundManager(assets.sounds);
  
  // Hide loading screen
  loader.hideLoadingScreen();
  
  // Initialize game
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const game = new Game(canvas, soundManager);
  
  game.start();
}

init().catch(console.error);
