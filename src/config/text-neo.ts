/**
 * Text configuration for Neo
 */

import { TextConfig } from "./text";

export const TEXT_NEO: TextConfig = {
  // Game title
  title: {
    line1: "NEO",
    line2: "PLATFORMER",
  },

  // Intro screen
  intro: {
    subtitle1: "Lieber Neo",
    subtitle2: "Alles Gute im neuen Jahr!",
    startButton: "Start!",
    message1: "Hast du am 23.3.2025 schon Pläne?",
    message2: "Ich würde gerne einen kleinen",
    message3: "Ausflug mit dir machen.",
    hint1: "Bis dahin kannst du mal versuchen",
    hint2: "die Meteoriten zu erwischen.",
  },

  // Win screen
  win: {
    title: "🎉 Geschafft! 🎉",
    congratulations: "Herzlichen Glückwunsch, Neo!",
    portalReached: "Du hast das Portal erreicht!",
    finalScore: "Endstand: {score} Punkte",
    reminder1: "Vergiss nicht:",
    reminder2: "23. März 2025 - unser Ausflug!",
    restartHint: "Tippen oder SPACE für neues Spiel",
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

