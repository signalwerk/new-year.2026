/**
 * Asset Loader
 * Handles loading of fonts, sounds, and images with progress tracking
 */

export interface LoaderProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentAsset: string;
}

export type ProgressCallback = (progress: LoaderProgress) => void;

export interface GameAssets {
  sounds: Record<string, HTMLAudioElement>;
  fontsLoaded: boolean;
}

// Sound file definitions
const SOUND_FILES = {
  jump: '/assets/sounds/jump.mp3',
  land: '/assets/sounds/land.mp3',
  coin: '/assets/sounds/coin.mp3',
  stomp: '/assets/sounds/stomp.mp3',
  hit: '/assets/sounds/hit.mp3',
  gameover: '/assets/sounds/gameover.mp3',
  win: '/assets/sounds/win.mp3',
  bounce: '/assets/sounds/bounce.mp3',
  cannon: '/assets/sounds/cannon.mp3',
} as const;

// Font definitions
interface FontDefinition {
  family: string;
  url: string;
  weight?: string;
}

const FONTS: FontDefinition[] = [
  {
    family: 'Pilowlava',
    url: '/assets/fonts/pilowlava/Fonts/webfonts/Pilowlava-Regular.woff2',
    weight: 'normal',
  },
  {
    family: 'Space Mono',
    url: '/assets/fonts/space-mono/SpaceMono-Regular.ttf',
    weight: 'normal',
  },
  {
    family: 'Space Mono',
    url: '/assets/fonts/space-mono/SpaceMono-Bold.ttf',
    weight: 'bold',
  },
];

export class AssetLoader {
  private sounds: Record<string, HTMLAudioElement> = {};
  private fontsLoaded = false;
  private loadingScreen: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;

  constructor() {
    this.createLoadingScreen();
  }

  private createLoadingScreen(): void {
    const screen = document.createElement('div');
    screen.id = 'loading-screen';
    screen.innerHTML = `
      <div class="loading-title">LOADING</div>
      <div class="loading-status">Initializing...</div>
      <div class="progress-container">
        <div class="progress-bar"></div>
      </div>
    `;
    document.body.appendChild(screen);

    this.loadingScreen = screen;
    this.progressBar = screen.querySelector('.progress-bar');
    this.statusText = screen.querySelector('.loading-status');
  }

  private updateProgress(progress: LoaderProgress): void {
    if (this.progressBar) {
      this.progressBar.style.width = `${progress.percentage}%`;
    }
    if (this.statusText) {
      this.statusText.textContent = progress.currentAsset;
    }
  }

  async loadAll(onProgress?: ProgressCallback): Promise<GameAssets> {
    const totalAssets = Object.keys(SOUND_FILES).length + FONTS.length;
    let loadedCount = 0;

    const updateAndNotify = (assetName: string) => {
      loadedCount++;
      const progress: LoaderProgress = {
        loaded: loadedCount,
        total: totalAssets,
        percentage: Math.round((loadedCount / totalAssets) * 100),
        currentAsset: assetName,
      };
      this.updateProgress(progress);
      onProgress?.(progress);
    };

    // Load fonts first
    await this.loadFonts(updateAndNotify);

    // Load sounds
    await this.loadSounds(updateAndNotify);

    // Small delay to show 100% completion
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      sounds: this.sounds,
      fontsLoaded: this.fontsLoaded,
    };
  }

  private async loadFonts(onAssetLoaded: (name: string) => void): Promise<void> {
    const fontPromises = FONTS.map(async (font) => {
      try {
        const fontFace = new FontFace(
          font.family,
          `url(${font.url})`,
          { weight: font.weight || 'normal' }
        );
        const loadedFont = await fontFace.load();
        document.fonts.add(loadedFont);
        onAssetLoaded(`Font: ${font.family}${font.weight === 'bold' ? ' Bold' : ''}`);
      } catch (error) {
        console.warn(`Failed to load font ${font.family}:`, error);
        onAssetLoaded(`Font: ${font.family} (fallback)`);
      }
    });

    await Promise.all(fontPromises);
    this.fontsLoaded = true;
  }

  private async loadSounds(onAssetLoaded: (name: string) => void): Promise<void> {
    const soundPromises = Object.entries(SOUND_FILES).map(async ([name, url]) => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        
        await new Promise<void>((resolve, reject) => {
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => reject(new Error(`Failed to load ${url}`));
          audio.src = url;
        });

        this.sounds[name] = audio;
        onAssetLoaded(`Sound: ${name}`);
      } catch (error) {
        console.warn(`Failed to load sound ${name}:`, error);
        // Create a silent placeholder
        this.sounds[name] = new Audio();
        onAssetLoaded(`Sound: ${name} (failed)`);
      }
    });

    await Promise.all(soundPromises);
  }

  hideLoadingScreen(): void {
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('hidden');
      // Remove after transition
      setTimeout(() => {
        this.loadingScreen?.remove();
      }, 500);
    }
  }
}

/**
 * Sound Manager for playing game sounds
 */
export class SoundManager {
  private sounds: Record<string, HTMLAudioElement>;
  private enabled = true;
  private volume = 0.5;

  constructor(sounds: Record<string, HTMLAudioElement>) {
    this.sounds = sounds;
    this.setVolume(this.volume);
  }

  play(soundName: string): void {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      // Clone for overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = this.volume;
      clone.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

