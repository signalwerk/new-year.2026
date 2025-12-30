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
        onAssetLoaded(`Font: ${font.family}`);
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
        
        // Safari mobile doesn't fire canplaythrough due to autoplay restrictions
        // Use a combination of events and timeout
        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          
          const done = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          
          // Try multiple events - Safari may fire loadeddata but not canplaythrough
          audio.oncanplaythrough = done;
          audio.onloadeddata = done;
          audio.onerror = () => {
            if (!resolved) {
              resolved = true;
              reject(new Error(`Failed to load ${url}`));
            }
          };
          
          // Timeout after 2 seconds - Safari may not fire any events due to autoplay policy
          setTimeout(done, 2000);
          
          audio.src = url;
          audio.load(); // Explicitly call load() for Safari
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
 * Sound Manager using Web Audio API for better mobile performance
 * Web Audio API provides lower latency and doesn't block the main thread
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private enabled = true;
  private volume = 0.5;
  private gainNode: GainNode | null = null;
  private lastPlayTime: Record<string, number> = {};
  private readonly MIN_PLAY_INTERVAL = 50; // Minimum ms between same sound plays

  constructor(sounds: Record<string, HTMLAudioElement>) {
    // Initialize Web Audio API lazily (on first user interaction)
    this.initAudioContext(sounds);
  }

  private async initAudioContext(sounds: Record<string, HTMLAudioElement>): Promise<void> {
    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create master gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);
      
      // Convert HTMLAudioElements to AudioBuffers
      for (const [name, audio] of Object.entries(sounds)) {
        try {
          if (audio.src) {
            const response = await fetch(audio.src);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
          }
        } catch (e) {
          console.warn(`Failed to decode sound ${name}:`, e);
        }
      }
    } catch (e) {
      console.warn('Web Audio API not supported, sounds disabled:', e);
      this.enabled = false;
    }
  }

  play(soundName: string): void {
    if (!this.enabled || !this.audioContext || !this.gainNode) return;
    
    const buffer = this.buffers[soundName];
    if (!buffer) return;
    
    // Throttle repeated plays of the same sound
    const now = performance.now();
    const lastPlay = this.lastPlayTime[soundName] || 0;
    if (now - lastPlay < this.MIN_PLAY_INTERVAL) return;
    this.lastPlayTime[soundName] = now;
    
    // Resume context if suspended (mobile browsers require user interaction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Create and play buffer source (very lightweight)
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);
    source.start(0);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

