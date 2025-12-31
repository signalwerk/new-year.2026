/**
 * Text configuration for Neo
 */

import { TextConfig } from "./text";

export const TEXT_NEO: TextConfig = {
  title: "NEO\nJump",
  subtitle: "Alles Gute im neuen Jahr!",
  copy: "Hast du am Abend vom \n10.2.2025 schon Pläne? \nIch würde gerne mit dir \netwas unternehmen \n(mit Übernachten bei mir).\n\nHier schon mal ein kleines Spiel \nfür die Zeitvertreibung.",
  startButton: "Start!",

  win: {
    title: "Geschafft!",
    copy: "Herzlichen Glückwunsch, Neo!\nDu hast das Portal erreicht!",
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
