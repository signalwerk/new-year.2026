/**
 * Text configuration for Luan
 */

import { TextConfig } from "./text";

export const TEXT_LUAN: TextConfig = {
  title: "LUAN\nJump",
  subtitle: "Alles Gute im neuen Jahr!",
  copy: "Ich würde mich freuen, \nwenn wir uns am 10. Mai 2026 \nfür einen Ausflug treffen.\n\nHier schon mal ein kleines Spiel \nfür die Zeitvertreibung.",
  startButton: "Start!",

  win: {
    title: "Geschafft!",
    copy: "Herzlichen Glückwunsch, Luan!\nDu hast das Portal erreicht!",
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
