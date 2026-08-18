import "./style.css";

import { GameEngine } from "./core/GameEngine";
import { MathRNG } from "./core/RNG";
import { RandomAI } from "./ai/RandomAI";
import { AudioManager } from "./audio/AudioManager";
import { AnimationManager } from "./animation/AnimationManager";
import { CardAnimator } from "./animation/CardAnimator";
import { PlatformManager } from "./platform/PlatformManager";
import { LocalStorageAdapter } from "./storage/LocalStorageAdapter";
import { Language, getLanguage, initI18n, setLanguage } from "./i18n";
import { PlayerStats, createEmptyStats } from "./core/PlayerStats";

import { MainMenu } from "./ui/MainMenu";
import { RulesScreen } from "./ui/RulesScreen";
import { SettingsScreen, AppSettings } from "./ui/SettingsScreen";
import { GameScreen, GameScreenCallbacks } from "./ui/GameScreen";
import { GameOverScreen } from "./ui/GameOverScreen";
import { GameController } from "./ui/GameController";
import { DebugPanel } from "./ui/DebugPanel";
import { Screen } from "./ui/Screen";
import { clearNode } from "./ui/dom";

const DEBUG = new URLSearchParams(window.location.search).has("debug");
const query = new URLSearchParams(window.location.search);
const REVEAL_HANDS = query.has("reveal");
const AI_DELAY_PARAM = Number(query.get("aidelay"));
const AI_DELAY_MS = Number.isFinite(AI_DELAY_PARAM) && AI_DELAY_PARAM >= 0 ? AI_DELAY_PARAM : 700;
const ANIM_PARAM = Number(query.get("anim"));
const ANIM_FACTOR = Number.isFinite(ANIM_PARAM) && ANIM_PARAM > 0 ? ANIM_PARAM : 3;

const root = document.getElementById("app")!;
if (!root) throw new Error("Missing #app container");

// ---------------------------------------------------------------------------
// Storage + i18n + settings
// ---------------------------------------------------------------------------

const storage = new LocalStorageAdapter();
initI18n(storage.getLang() as Language | null);

let settings: AppSettings = {
  sound: storage.getSetting("sound") !== "0",
  music: storage.getSetting("music") !== "0",
  animations: storage.getSetting("animations") !== "0",
  language: getLanguage(),
};

let stats: PlayerStats = storage.getStats() ?? createEmptyStats();

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const audio = new AudioManager();
audio.setSettings({ soundOn: settings.sound, musicOn: settings.music });

const animations = new AnimationManager();
animations.setEnabled(settings.animations);
animations.setSpeed(ANIM_FACTOR);

const platform = new PlatformManager({
  onFullscreenChange: () => {
    /* reserved for future fullscreen UI */
  },
});
void platform.initialize();

// ---------------------------------------------------------------------------
// Screens & controller
// ---------------------------------------------------------------------------

const gameCallbacks: GameScreenCallbacks = {
  onComputerCardSelect: () => {},
  onRestart: () => {},
  onMenu: () => {},
};

const engine = new GameEngine();
const ai = new RandomAI(new MathRNG());
const animator = new CardAnimator(root);
const gameScreen = new GameScreen(gameCallbacks);
const gameOverScreen = new GameOverScreen({
  onPlayAgain: () => {
    audio.playClick();
    hideOverlay(gameOverScreen.element);
    controller.startNewGame();
  },
  onMenu: () => {
    audio.playClick();
    hideOverlay(gameOverScreen.element);
    showMenu();
  },
});

let debugPanel: DebugPanel | null = null;
if (DEBUG) {
  debugPanel = new DebugPanel({
    onForcePlayerTurn: () => controller.forcePlayerTurn(),
    onForceAITurn: () => controller.forceAITurn(),
    onRevealHands: (revealed) => controller.revealHands(revealed),
    onRestart: () => controller.startNewGame(),
  });
  root.append(debugPanel.element);
}

const controller = new GameController(
  {
    engine,
    ai,
    audio,
    animator,
    animations,
    platform,
    gameScreen,
    gameOverScreen,
    gameCallbacks,
    debugPanel,
    onStatsChange: (next) => {
      stats = next;
      storage.saveStats(next);
      menu.updateStats(next);
    },
    getStats: () => stats,
  },
  { aiDelayMs: AI_DELAY_MS },
);

if (DEBUG) {
  (window as unknown as Record<string, unknown>).__witch = {
    engine,
    controller,
    platform,
    audio,
  };
}

if (REVEAL_HANDS) {
  controller.revealHands(true);
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function mountScreen(screen: Screen): void {
  clearNode(root);
  root.append(screen.element);
  screen.mount();
}

function showOverlay(overlay: HTMLElement): void {
  root.append(overlay);
  // Force a reflow so the transition plays.
  requestAnimationFrame(() => {
    overlay.classList.add("overlay--visible");
  });
}

function hideOverlay(overlay: HTMLElement): void {
  overlay.classList.remove("overlay--visible");
}

function applySettings(next: AppSettings): void {
  settings = { ...next };
  audio.setSettings({ soundOn: next.sound, musicOn: next.music });
  animations.setEnabled(next.animations);
  setLanguage(next.language);
  storage.setSetting("sound", next.sound ? "1" : "0");
  storage.setSetting("music", next.music ? "1" : "0");
  storage.setSetting("animations", next.animations ? "1" : "0");
  storage.setLang(next.language);

  // Refresh localized UI.
  menu.refresh();
  rulesScreen.refresh();
  settingsScreen.refresh();
  gameScreen.render(engine.state);
}

let menu!: MainMenu;
let rulesScreen!: RulesScreen;
let settingsScreen!: SettingsScreen;

function showMenu(): void {
  platform.gameplayStop();
  mountScreen(menu);
  if (DEBUG && debugPanel) {
    root.append(debugPanel.element);
  }
  root.append(gameOverScreen.element);
}

function buildScreens(): void {
  menu = new MainMenu({
    onPlay: () => {
      audio.playClick();
      controller.startNewGame();
      mountScreen(gameScreen);
      if (DEBUG && debugPanel) {
        root.append(debugPanel.element);
      }
      root.append(gameOverScreen.element);
    },
    onRules: () => {
      audio.playClick();
      showOverlay(rulesScreen.element);
    },
    onSettings: () => {
      audio.playClick();
      showOverlay(settingsScreen.element);
    },
  });

  rulesScreen = new RulesScreen({
    onClose: () => {
      audio.playClick();
      hideOverlay(rulesScreen.element);
    },
  });

  settingsScreen = new SettingsScreen(settings, {
    onChange: (s) => applySettings(s),
    onClose: (s) => {
      applySettings(s);
      audio.playClick();
      hideOverlay(settingsScreen.element);
    },
  });
}

// ---------------------------------------------------------------------------
// Platform-safe browser behavior
// ---------------------------------------------------------------------------

// Suppress the context menu inside the game area only.
root.addEventListener("contextmenu", (ev) => ev.preventDefault());

// No text selection or image drag inside the app.
root.classList.add("no-select");

// Double-tap zoom prevention on mobile (touches are handled by pointer events).
document.addEventListener(
  "dblclick",
  (ev) => {
    const target = ev.target as HTMLElement;
    if (root.contains(target)) ev.preventDefault();
  },
  { passive: false },
);

// Ensure keyboard navigation works on buttons/cards.
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" && ev.key !== " ") return;
  const target = ev.target as HTMLElement;
  if (target?.tagName === "BUTTON") {
    ev.preventDefault();
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

buildScreens();
menu.updateStats(stats);
showMenu();