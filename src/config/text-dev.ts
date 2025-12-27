/**
 * Text configuration for development (neutral)
 */

import { TextConfig } from "./text";

export const TEXT_DEV: TextConfig = {
  // Game title
  title: {
    line1: "JUMP",
    line2: "UP!",
  },

  // Intro screen
  intro: {
    subtitle1: "A Vertical Platformer",
    subtitle2: "Happy New Year 2026!",
    startButton: "Start!",
    message1: "Jump your way to the top",
    message2: "Collect stars, avoid enemies",
    message3: "and reach the portal!",
    hint1: "Use arrow keys or touch controls",
    hint2: "to move and jump.",
  },

  // Win screen
  win: {
    title: "🎉 You Win! 🎉",
    congratulations: "Congratulations!",
    portalReached: "You reached the portal!",
    finalScore: "Final Score: {score} points",
    reminder1: "Great job!",
    reminder2: "Can you beat your score?",
    restartHint: "Tap or press SPACE to play again",
  },

  // Game over screen
  gameOver: {
    title: "GAME OVER",
    finalScore: "Final Score: {score}",
    restartHint: "Tap or press SPACE to restart",
  },

  // UI elements
  ui: {
    score: "Score: {score}",
    lives: "♥ {lives}",
    height: "Height: {height}m",
  },

  // Loading screen
  loading: {
    title: "Loading...",
    loadingFonts: "Loading fonts...",
    loadingSounds: "Loading sounds...",
    ready: "Ready!",
  },
};

