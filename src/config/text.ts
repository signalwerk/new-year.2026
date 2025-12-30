/**
 * Game text configuration
 * Automatically selects the right text based on URL path
 */

import { TEXT_NEO } from "./text-neo";
import { TEXT_LUAN } from "./text-luan";
import { TEXT_DEV } from "./text-dev";

// Type definition for text configuration (matching Meteor Defense style)
export interface TextConfig {
  // Multi-line title (use \n for line breaks)
  title: string;
  // Subtitle shown below title
  subtitle: string;
  // Copy text (use \n for line breaks)
  copy: string;
  // Button text
  startButton: string;
  
  // Win screen
  win: {
    title: string;
    copy: string;
    restartButton: string;
  };
  
  // Game over screen
  gameOver: {
    title: string;
    restartButton: string;
  };
  
  // UI elements
  ui: {
    lives: string;
    distance: string;
  };
  
  // Loading screen
  loading: {
    title: string;
  };
}

/**
 * Get the text configuration based on URL path
 * - /game/neo/ or /neo/ -> TEXT_NEO
 * - /luan/ -> TEXT_LUAN
 * - /dev/ or anything else -> TEXT_DEV
 */
function getTextConfig(): TextConfig {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("/neo")) {
    return TEXT_NEO;
  }

  if (path.includes("/luan")) {
    return TEXT_LUAN;
  }

  // Default to dev/neutral version
  return TEXT_DEV;
}

// Export the selected text configuration
export const TEXT = getTextConfig();

// Helper function to interpolate values in text
export function interpolate(
  text: string,
  values: Record<string, string | number>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, key) =>
    String(values[key] ?? `{${key}}`),
  );
}
