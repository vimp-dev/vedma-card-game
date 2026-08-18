export default {
  // General
  appName: "Witch",
  play: "Play",
  rules: "Rules",
  settings: "Settings",
  back: "Back",
  close: "Close",
  ok: "Got it",
  menu: "Menu",

  // Menu
  menuSubtitle: "A card game for two",

  // Game screen
  computer: "Computer",
  you: "You",
  handCount: "Cards: {{count}}",
  yourTurn: "Your turn",
  opponentsTurn: "Opponent's turn",
  turnNumber: "Turn",
  discardPile: "Discard",
  drawing: "Drawing a card…",
  pairing: "Found a pair!",
  pressStartHint: "Press Play to start",

  // Game over
  victoryTitle: "VICTORY!",
  victorySubtitle: "You got rid of all your cards.",
  defeatTitle: "WITCH!",
  defeatSubtitle: "The Queen of Spades stayed with you.",
  playAgain: "Play again",
  toMenu: "Menu",

  // Rules screen
  rulesTitle: "Rules",
  rulesTagline: "Get rid of all your cards and don't end up with the Queen of Spades.",
  rulesPairExampleTitle: "How pairs form",
  rulesPairExample: "7♠ + 7♥ → pair → discarded.",
  rulesDraw: "Each turn you draw one card from your opponent.",
  rulesDrawPair: "If the card forms a pair, the pair is discarded.",
  rulesWitchNoPair: "The Queen of Spades has no pair.",
  rulesWitchLose: "The player left holding the Queen of Spades loses.",

  // Settings screen
  settingsTitle: "Settings",
  sound: "Sound",
  music: "Music",
  animations: "Animations",
  language: "Language",
  on: "On",
  off: "Off",

  // Statistics
  statisticsTitle: "Statistics",
  gamesPlayed: "Games",
  wins: "Wins",
  losses: "Losses",
  winRate: "Win rate",

  // Accessibility
  ariaRules: "Show rules",
  ariaSettings: "Open settings",
  ariaPlay: "Start the game",
  ariaCard: "Card {{name}}",
  ariaFacedownCard: "Opponent's card {{index}}",
  ariaChooseCard: "Choose a card",
  ariaRestart: "Play again",
  ariaMenu: "Back to menu",

  // Debug
  debugPhase: "Phase",
  debugPlayer: "Player",
  debugWitch: "Witch at",
  debugReveal: "Reveal hands",
  debugForcePlayer: "Player turn",
  debugForceAI: "AI turn",
  debugRestart: "Restart",
} as const;