export default {
  // General
  appName: "Ведьма",
  play: "Играть",
  rules: "Правила",
  settings: "Настройки",
  back: "Назад",
  close: "Закрыть",
  ok: "Понятно",
  menu: "В меню",

  // Menu
  menuSubtitle: "Карточная игра для двоих",

  // Game screen
  computer: "Компьютер",
  you: "Вы",
  handCount: "Карт: {{count}}",
  yourTurn: "Ваш ход",
  opponentsTurn: "Ход соперника",
  turnNumber: "Ход",
  discardPile: "Сброс",
  drawing: "Вытягивание карты…",
  pairing: "Найдена пара!",
  pressStartHint: "Нажми «Играть», чтобы начать",

  // Game over
  victoryTitle: "ПОБЕДА!",
  victorySubtitle: "Ты избавился от всех карт.",
  defeatTitle: "ВЕДЬМА!",
  defeatSubtitle: "Пиковая Дама осталась у тебя.",
  playAgain: "Играть снова",
  toMenu: "В меню",

  // Rules screen
  rulesTitle: "Правила",
  rulesTagline: "Избавься от всех своих карт и не останься с Пиковой Дамой.",
  rulesPairExampleTitle: "Как образуются пары",
  rulesPairExample: "7♠ + 7♥ → пара → сбрасываются.",
  rulesDraw: "Игрок берёт одну карту соперника.",
  rulesDrawPair: "Если карта создаёт пару → пара сбрасывается.",
  rulesWitchNoPair: "Пиковая Дама не имеет пары.",
  rulesWitchLose: "Игрок с Пиковой Дамой в конце партии проигрывает.",

  // Settings screen
  settingsTitle: "Настройки",
  sound: "Звук",
  music: "Музыка",
  animations: "Анимации",
  language: "Язык",
  on: "Вкл",
  off: "Выкл",

  // Statistics
  statisticsTitle: "Статистика",
  gamesPlayed: "Партии",
  wins: "Победы",
  losses: "Поражения",
  winRate: "Процент побед",

  // Accessibility
  ariaRules: "Показать правила",
  ariaSettings: "Открыть настройки",
  ariaPlay: "Начать игру",
  ariaCard: "Карта {{name}}",
  ariaFacedownCard: "Карта соперника {{index}}",
  ariaChooseCard: "Выбрать карту",
  ariaRestart: "Играть снова",
  ariaMenu: "Вернуться в меню",

  // Debug
  debugPhase: "Фаза",
  debugPlayer: "Игрок",
  debugWitch: "Ведьма у",
  debugReveal: "Показать руки",
  debugForcePlayer: "Ход игрока",
  debugForceAI: "Ход ИИ",
  debugRestart: "Перезапуск",
} as const;