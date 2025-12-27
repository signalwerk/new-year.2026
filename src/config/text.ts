/**
 * Game text configuration
 * Automatically selects the right text based on URL path
 */

import { TEXT_NEO } from "./text-neo";
import { TEXT_LUAN } from "./text-luan";
import { TEXT_DEV } from "./text-dev";

// Type definition for text configuration
export interface TextConfig {
  title: {
    line1: string;
    line2: string;
  };
  intro: {
    subtitle1: string;
    subtitle2: string;
    startButton: string;
    message1: string;
    message2: string;
    message3: string;
    hint1: string;
    hint2: string;
  };
  win: {
    title: string;
    congratulations: string;
    portalReached: string;
    finalScore: string;
    reminder1: string;
    reminder2: string;
    restartHint: string;
  };
  gameOver: {
    title: string;
    finalScore: string;
    restartHint: string;
  };
  ui: {
    score: string;
    lives: string;
    height: string;
  };
  loading: {
    title: string;
    loadingFonts: string;
    loadingSounds: string;
    ready: string;
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
