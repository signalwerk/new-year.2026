/**
 * Text configuration for Neo
 */

import { TextConfig } from "./text";

export const TEXT_NEO: TextConfig = {
  title: "NEO\nPlatformer",
  subtitle: "Alles Gute im neuen Jahr!",
  copy: "Hast du am 23.3.2025 schon Pläne?\nIch würde gerne einen kleinen\nAusflug mit dir machen.",
  startButton: "Start!",

  win: {
    title: "Geschafft!",
    copy: "Herzlichen Glückwunsch, Neo!\nDu hast das Portal erreicht!\n\nVergiss nicht:\n23. März 2025 – unser Ausflug!",
    restartButton: "Neustart!",
  },

  gameOver: {
    title: "Game Over!",
    restartButton: "Neustart!",
  },

  ui: {
    lives: "♥ {lives}",
    distance: "↑ {height}m",
  },

  loading: {
    title: "Loading",
  },
};
