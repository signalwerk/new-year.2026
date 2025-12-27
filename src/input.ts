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
  private dpad: HTMLElement | null = null;
  private dpadKnob: HTMLElement | null = null;
  private jumpBtn: HTMLElement | null = null;
  
  // D-pad state
  private dpadActive: boolean = false;
  private dpadCenterX: number = 0;
  private dpadRadius: number = 50;
  private currentTouchId: number | null = null;
  
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
        <div id="dpad" class="dpad">
          <div id="dpad-knob" class="dpad-knob"></div>
          <div class="dpad-arrows">
            <svg class="dpad-arrow left" viewBox="0 0 24 24" width="20" height="20">
              <polygon points="18,4 18,20 6,12" fill="currentColor"/>
            </svg>
            <svg class="dpad-arrow right" viewBox="0 0 24 24" width="20" height="20">
              <polygon points="6,4 6,20 18,12" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="controls-right">
        <button id="btn-jump" class="control-btn jump-btn">
          <svg viewBox="0 0 24 24" width="32" height="32">
            <polygon points="12,4 22,20 2,20" fill="currentColor"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(container);
    
    // Get element references
    this.dpad = document.getElementById('dpad');
    this.dpadKnob = document.getElementById('dpad-knob');
    this.jumpBtn = document.getElementById('btn-jump');
    
    // Setup d-pad events
    this.setupDpadEvents();
    
    // Setup jump button events
    this.setupButtonEvents(this.jumpBtn, 'jump');
    
    // Prevent default touch behavior to avoid scrolling
    container.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }
  
  private setupDpadEvents(): void {
    if (!this.dpad || !this.dpadKnob) return;
    
    const handleStart = (clientX: number, clientY: number, touchId?: number) => {
      const rect = this.dpad!.getBoundingClientRect();
      this.dpadCenterX = rect.left + rect.width / 2;
      this.dpadRadius = rect.width / 2 - 25; // Leave room for knob
      this.dpadActive = true;
      if (touchId !== undefined) {
        this.currentTouchId = touchId;
      }
      this.dpad!.classList.add('active');
      this.updateDpadPosition(clientX, clientY);
    };
    
    const handleMove = (clientX: number, clientY: number) => {
      if (!this.dpadActive) return;
      this.updateDpadPosition(clientX, clientY);
    };
    
    const handleEnd = () => {
      this.dpadActive = false;
      this.currentTouchId = null;
      this.state.left = false;
      this.state.right = false;
      this.dpad!.classList.remove('active');
      this.dpadKnob!.classList.remove('left', 'right');
      // Reset knob position
      this.dpadKnob!.style.transform = 'translate(-50%, -50%)';
    };
    
    // Touch events
    this.dpad.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
      if (!this.dpadActive) return;
      // Find the touch that started on the dpad
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.currentTouchId) {
          handleMove(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
      // Check if the touch that ended was our dpad touch
      let stillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.currentTouchId) {
          stillActive = true;
          break;
        }
      }
      if (!stillActive && this.dpadActive) {
        handleEnd();
      }
    }, { passive: false });
    
    window.addEventListener('touchcancel', () => {
      if (this.dpadActive) {
        handleEnd();
      }
    }, { passive: false });
    
    // Mouse events for desktop testing
    this.dpad.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    });
    
    window.addEventListener('mousemove', (e) => {
      handleMove(e.clientX, e.clientY);
    });
    
    window.addEventListener('mouseup', () => {
      if (this.dpadActive) {
        handleEnd();
      }
    });
  }
  
  private updateDpadPosition(clientX: number, _clientY: number): void {
    if (!this.dpadKnob) return;
    
    // Calculate offset from center (horizontal only)
    let offsetX = clientX - this.dpadCenterX;
    
    // Clamp to radius (horizontal only for left/right)
    const maxOffset = this.dpadRadius;
    offsetX = Math.max(-maxOffset, Math.min(maxOffset, offsetX));
    
    // Update knob visual position
    this.dpadKnob.style.transform = `translate(calc(-50% + ${offsetX}px), -50%)`;
    
    // Determine direction based on offset
    const deadzone = 15; // Pixels of deadzone in center
    
    if (offsetX < -deadzone) {
      this.state.left = true;
      this.state.right = false;
      this.dpadKnob.classList.add('left');
      this.dpadKnob.classList.remove('right');
    } else if (offsetX > deadzone) {
      this.state.left = false;
      this.state.right = true;
      this.dpadKnob.classList.remove('left');
      this.dpadKnob.classList.add('right');
    } else {
      this.state.left = false;
      this.state.right = false;
      this.dpadKnob.classList.remove('left', 'right');
    }
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
