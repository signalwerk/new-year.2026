import { InputState } from './types';

export class InputHandler {
  private state: InputState = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
  };
  
  private previousJumpState: boolean = false;
  
  // Touch control elements
  private leftBtn: HTMLElement | null = null;
  private rightBtn: HTMLElement | null = null;
  private jumpBtn: HTMLElement | null = null;
  
  constructor() {
    this.setupKeyboardListeners();
    this.createTouchControls();
  }
  
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.state.left = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.state.right = true;
          e.preventDefault();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.state.jump = true;
          e.preventDefault();
          break;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.state.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.state.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.state.jump = false;
          break;
      }
    });
  }
  
  private createTouchControls(): void {
    // Create container
    const container = document.createElement('div');
    container.id = 'touch-controls';
    container.innerHTML = `
      <div class="controls-left">
        <button id="btn-left" class="control-btn">◀</button>
        <button id="btn-right" class="control-btn">▶</button>
      </div>
      <div class="controls-right">
        <button id="btn-jump" class="control-btn jump-btn">▲</button>
      </div>
    `;
    document.body.appendChild(container);
    
    // Get button references
    this.leftBtn = document.getElementById('btn-left');
    this.rightBtn = document.getElementById('btn-right');
    this.jumpBtn = document.getElementById('btn-jump');
    
    // Setup touch events with pointer events for better compatibility
    this.setupButtonEvents(this.leftBtn, 'left');
    this.setupButtonEvents(this.rightBtn, 'right');
    this.setupButtonEvents(this.jumpBtn, 'jump');
    
    // Prevent default touch behavior to avoid scrolling
    container.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }
  
  private setupButtonEvents(button: HTMLElement | null, action: 'left' | 'right' | 'jump'): void {
    if (!button) return;
    
    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.state[action] = true;
      button.classList.add('active');
    }, { passive: false });
    
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.state[action] = false;
      button.classList.remove('active');
    }, { passive: false });
    
    button.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.state[action] = false;
      button.classList.remove('active');
    }, { passive: false });
    
    // Mouse events for desktop testing
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.state[action] = true;
      button.classList.add('active');
    });
    
    button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.state[action] = false;
      button.classList.remove('active');
    });
    
    button.addEventListener('mouseleave', () => {
      this.state[action] = false;
      button.classList.remove('active');
    });
  }
  
  getState(): InputState {
    // Detect if jump was just pressed this frame
    this.state.jumpPressed = this.state.jump && !this.previousJumpState;
    this.previousJumpState = this.state.jump;
    
    return { ...this.state };
  }
  
  // Show/hide touch controls based on device
  setTouchControlsVisible(visible: boolean): void {
    const controls = document.getElementById('touch-controls');
    if (controls) {
      controls.style.display = visible ? 'flex' : 'none';
    }
  }
  
  // Auto-detect touch device
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}

