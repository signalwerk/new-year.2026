/**
 * Text configuration for development (neutral)
 */

import { TextConfig } from "./text";

export const TEXT_DEV: TextConfig = {
  title: "Jump\nUp!",
  subtitle: "Happy New Year 2026!",
  copy: "Jump your way to the top,\navoid enemies and obstacles,\nand reach the portal!",
  startButton: "Start!",

  win: {
    title: "You Win!",
    copy: "Congratulations!\nYou reached the portal!\n\nGreat job!\nTry again to beat your time!",
    restartButton: "Play Again!",
  },

  gameOver: {
    title: "Game Over!",
    restartButton: "Try Again!",
  },

  ui: {
    lives: "♥ {lives}",
    distance: "↑ {height}m",
  },

  loading: {
    title: "Loading",
  },
};
