import { Card } from "../core/Card";
import { GameState } from "../core/GameState";
import { GameEngine, CardDrawnEvent } from "../core/GameEngine";
import { addGame, PlayerStats } from "../core/PlayerStats";
import { AIPlayer, VisibleInfo } from "../ai/AIPlayer";
import { AudioManager } from "../audio/AudioManager";
import { AnimationManager } from "../animation/AnimationManager";
import { CardAnimator, RectLike } from "../animation/CardAnimator";
import { PlatformManager } from "../platform/PlatformManager";
import { GameScreen, GameScreenCallbacks } from "./GameScreen";
import { GameOverScreen } from "./GameOverScreen";
import { DebugPanel } from "./DebugPanel";
import { t } from "../i18n";

export interface ControllerDeps {
  engine: GameEngine;
  ai: AIPlayer;
  audio: AudioManager;
  animator: CardAnimator;
  animations: AnimationManager;
  platform: PlatformManager;
  gameScreen: GameScreen;
  gameOverScreen: GameOverScreen;
  gameCallbacks: GameScreenCallbacks;
  debugPanel: DebugPanel | null;
  onStatsChange(stats: PlayerStats): void;
  getStats(): PlayerStats;
}

export interface GameControllerOptions {
  /** Delay before the AI acts, in ms. */
  aiDelayMs?: number;
}

interface CollectedDraw {
  drawn: CardDrawnEvent | null;
  pair: { playerId: string; card: Card; pair: [Card, Card] } | null;
  discarded: Card[] | null;
  gameOver: boolean;
}

const HUMAN_ID = "human";
const AI_ID = "ai";

export class GameController {
  private readonly engine: GameEngine;
  private readonly ai: AIPlayer;
  private readonly audio: AudioManager;
  private readonly animator: CardAnimator;
  private readonly animations: AnimationManager;
  private readonly platform: PlatformManager;
  private readonly gameScreen: GameScreen;
  private readonly gameOverScreen: GameOverScreen;
  private readonly debugPanel: DebugPanel | null;
  private readonly onStatsChange: (stats: PlayerStats) => void;
  private readonly getStats: () => PlayerStats;
  private readonly gameCallbacks: GameScreenCallbacks;
  private readonly aiDelayMs: number;

  private busy = false;
  private aiTimer: number | null = null;
  private hidden = false;
  private wasMuted = false;
  private prevPhase: GameState["phase"] | null = null;

  constructor(deps: ControllerDeps, options: GameControllerOptions = {}) {
    this.engine = deps.engine;
    this.ai = deps.ai;
    this.audio = deps.audio;
    this.animator = deps.animator;
    this.animations = deps.animations;
    this.platform = deps.platform;
    this.gameScreen = deps.gameScreen;
    this.gameOverScreen = deps.gameOverScreen;
    this.debugPanel = deps.debugPanel;
    this.onStatsChange = deps.onStatsChange;
    this.getStats = deps.getStats;
    this.gameCallbacks = deps.gameCallbacks;
    this.aiDelayMs = options.aiDelayMs ?? 700;

    this.bindGameScreen();
    this.bindVisibility();
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /** Starts a fresh game against the AI. */
  startNewGame(): void {
    this.cancelAITimer();
    this.busy = false;
    this.gameScreen.element.classList.remove("game--paused");
    this.gameOverScreen.element.classList.remove("overlay--visible");
    this.hidden = false;
    this.prevPhase = null;

    // Clear any lingering hidden cards (e.g. after an aborted AI turn).
    for (const view of this.gameScreen.computerHand.getAllViews()) {
      view.element.classList.remove("card--hidden");
    }

    this.engine.startGame([
      { id: HUMAN_ID, type: "human", name: t("you") },
      { id: AI_ID, type: "ai", name: t("computer") },
    ]);

    this.platform.gameplayStart();
    this.audio.playSound("turn");

    this.gameScreen.render(this.engine.state);
    this.updateDebug();

    if (this.engine.isGameOver()) {
      this.finishGame();
      return;
    }
    this.beginNextTurn();
  }

  /** Returns to the menu (abandons the current game). */
  abortToMenu(): void {
    this.cancelAITimer();
    this.platform.gameplayStop();
    this.gameOverScreen.element.classList.remove("overlay--visible");
  }

  // ------------------------------------------------------------------
  // Input handling
  // ------------------------------------------------------------------

  private bindGameScreen(): void {
    this.gameCallbacks.onComputerCardSelect = (cardId) =>
      this.onHumanSelectComputerCard(cardId);
    this.gameCallbacks.onRestart = () => this.startNewGame();
    this.gameCallbacks.onMenu = () => this.onMenuRequested();
  }

  private onHumanSelectComputerCard(cardId: string): void {
    if (this.busy || this.hidden) return;
    if (this.engine.isGameOver()) return;
    if (this.engine.state.phase !== "PLAYER_TURN") return;
    if (!this.gameScreen.isInteractive()) return;

    void this.runHumanDraw(cardId);
  }

  private onMenuRequested(): void {
    this.abortToMenu();
  }

  // ------------------------------------------------------------------
  // Turn flow
  // ------------------------------------------------------------------

  private async runHumanDraw(cardId: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.setBusyUI(true);
    this.gameScreen.setHint("");
    this.audio.playSound("draw");

    // Capture pre-draw geometry.
    const fromRect = this.gameScreen.getComputerCardRect(cardId);
    const playerRects = this.captureRects(this.gameScreen.playerHand.getAllViews());

    const collected = this.collectDraw(() => {
      this.engine.drawCard({
        type: "DRAW_CARD",
        sourcePlayerId: AI_ID,
        cardId,
      });
    });

    this.gameScreen.render(this.engine.state);
    this.updateDebug();

    if (fromRect && collected.drawn) {
      await this.animateHumanDraw(collected, fromRect, playerRects);
    }

    await this.animations.sleep(80);
    this.busy = false;
    this.setBusyUI(false);

    if (collected.gameOver) {
      this.finishGame();
      return;
    }
    this.beginNextTurn();
  }

  private async animateHumanDraw(
    collected: CollectedDraw,
    fromRect: DOMRect,
    playerRects: Map<string, DOMRect>,
  ): Promise<void> {
    const drawn = collected.drawn!;
    const card = drawn.card;

    if (!collected.pair) {
      // The card now sits in the player's hand; fly a ghost onto it.
      const toRect = this.gameScreen.getPlayerCardRect(card.id);
      if (toRect) {
        const real = this.gameScreen.getCardView(card.id);
        real?.element.classList.add("card--hidden");
        await this.animator.fly(card, fromRect, toRect, {
          duration: this.animations.time(480),
          easing: "ease-in-out",
          flip: true,
          scale: 1.12,
        });
        real?.element.classList.remove("card--hidden");
        real?.popIn();
      }
      return;
    }

    // Pair formed: the drawn card flies into the hand area, then both the
    // drawn card and the matching card converge on the discard pile.
    const [a, b] = collected.pair.pair;
    const matching = a.id === card.id ? b : a;
    const matchingRect = playerRects.get(matching.id);

    this.gameScreen.setHint(t("pairing"));
    this.audio.playSound("pair");
    this.animations.flashClass(this.gameScreen.centerEl, "game-center--pair", 500);

    const handRect = this.gameScreen.playerHand.element.getBoundingClientRect();
    const midRect: RectLike = {
      left: handRect.left + handRect.width * 0.35,
      top: handRect.top + handRect.height * 0.1,
      width: fromRect.width,
      height: fromRect.height,
    };

    const discardRect = this.gameScreen.getDiscardRect();
    const targetRect: RectLike = {
      left: discardRect.left - 0,
      top: discardRect.top - 0,
      width: fromRect.width,
      height: fromRect.height,
    };

    // Hold the matching card in place right away so it never vanishes from
    // the hand while the drawn card flies in.
    const ghostMatching = this.animator.createGhost(matching, matchingRect ?? midRect, false);

    await this.animator.fly(card, fromRect, midRect, {
      duration: this.animations.time(420),
      easing: "ease-out",
      flip: true,
      scale: 1.12,
    });

    const ghostDrawn = this.animator.createGhost(card, midRect, false);
    const duration = this.animations.time(520);
    await Promise.all([
      this.animator.flyGhostTo(ghostDrawn, targetRect, duration, 1.16),
      this.animator.flyGhostTo(ghostMatching, targetRect, duration),
    ]);
    this.audio.playSound("discard");
    await this.animations.sleep(140);
  }

  private async runAITurn(): Promise<void> {
    if (this.busy || this.hidden) return;
    if (this.engine.isGameOver()) return;
    if (this.engine.state.phase !== "AI_TURN") return;

    this.busy = true;
    this.setBusyUI(true);

    // Pause for the configured AI delay.
    await this.sleep(this.aiDelayMs);
    if (this.hidden || this.engine.isGameOver()) {
      this.busy = false;
      this.setBusyUI(false);
      return;
    }

    const aiPlayer = this.engine.getPlayer(AI_ID);
    if (!aiPlayer || aiPlayer.hand.length === 0) {
      this.busy = false;
      this.setBusyUI(false);
      if (this.engine.isGameOver()) {
        this.finishGame();
      } else {
        this.beginNextTurn();
      }
      return;
    }

    const visibleInfo: VisibleInfo = {
      selfId: AI_ID,
      opponentCardCounts: new Map(
        this.engine.state.players
          .filter((p) => p.id !== AI_ID)
          .map((p) => [p.id, p.hand.length]),
      ),
      discardPile: [...this.engine.state.discardPile],
    };

    const choice = this.ai.chooseCard(aiPlayer.hand, visibleInfo, this.engine.state);
    const card = this.engine.getCardAt(choice.sourcePlayerId, choice.index);
    if (!card) {
      this.busy = false;
      this.setBusyUI(false);
      this.beginNextTurn();
      return;
    }

    const fromRect = this.gameScreen.getPlayerCardRect(card.id);

    const collected = this.collectDraw(() => {
      this.engine.drawCard({
        type: "DRAW_CARD",
        sourcePlayerId: choice.sourcePlayerId,
        cardId: card.id,
      });
    });

    this.gameScreen.render(this.engine.state);
    this.updateDebug();
    this.audio.playSound("draw");

    const computerRects = this.captureRects(this.gameScreen.computerHand.getAllViews());
    if (fromRect && collected.drawn) {
      await this.animateAIDraw(collected, fromRect, computerRects);
    }

    await this.animations.sleep(80);
    this.busy = false;
    this.setBusyUI(false);

    // The card has landed in the AI hand — shuffle it right away so the
    // card positions are not preserved and the landing slot stays unknown.
    this.engine.shufflePlayerHand(AI_ID);

    if (collected.gameOver) {
      // Game is over — reveal the final hands for the game-over screen.
      this.gameScreen.render(this.engine.state);
      const drawnView = this.gameScreen.getCardView(collected.drawn!.card.id);
      drawnView?.element.classList.remove("card--hidden");
      this.finishGame();
      return;
    }
    this.beginNextTurn();
  }

  private async animateAIDraw(
    collected: CollectedDraw,
    fromRect: DOMRect,
    computerRects: Map<string, DOMRect>,
  ): Promise<void> {
    const card = collected.drawn!.card;

    if (!collected.pair) {
      // Card joined the computer's (face-down) hand. Fly the ghost toward the
      // middle of the hand and fade it out, and keep the real card hidden —
      // the hand is re-rendered in its shuffled order on the player's turn,
      // so the exact landing slot is never revealed.
      const handRect = this.gameScreen.computerHand.element.getBoundingClientRect();
      const toRect: RectLike = {
        left: handRect.left + handRect.width / 2 - fromRect.width / 2,
        top: handRect.top + handRect.height / 2 - fromRect.height / 2,
        width: fromRect.width,
        height: fromRect.height,
      };
      const real = this.gameScreen.getCardView(card.id);
      real?.element.classList.add("card--hidden");
      await this.animator.fly(card, fromRect, toRect, {
        duration: this.animations.time(460),
        easing: "ease-in-out",
        flip: true,
        flipTo: "back",
        fadeOut: true,
      });
      return;
    }

    // AI formed a pair as well — same convergence animation.
    const [a, b] = collected.pair.pair;
    const matching = a.id === card.id ? b : a;
    const matchingRect = computerRects.get(matching.id) ?? fromRect;
    const discardRect = this.gameScreen.getDiscardRect();
    const targetRect: RectLike = {
      left: discardRect.left,
      top: discardRect.top,
      width: fromRect.width,
      height: fromRect.height,
    };

    this.gameScreen.setHint(t("pairing"));
    this.audio.playSound("pair");
    this.animations.flashClass(this.gameScreen.centerEl, "game-center--pair", 500);

    const ghostDrawn = this.animator.createGhost(card, fromRect, false);
    const ghostMatching = this.animator.createGhost(
      matching,
      matchingRect ?? fromRect,
      false,
    );
    await Promise.all([
      this.animator.flyGhostTo(ghostDrawn, targetRect, this.animations.time(520), 1.16),
      this.animator.flyGhostTo(ghostMatching, targetRect, this.animations.time(520)),
    ]);
    this.audio.playSound("discard");
    await this.animations.sleep(140);
  }

  // ------------------------------------------------------------------
  // Turn transitions
  // ------------------------------------------------------------------

  private beginNextTurn(): void {
    if (this.engine.isGameOver()) {
      this.finishGame();
      return;
    }
    const state = this.engine.state;
    const current = this.engine.currentPlayer();
    const isYou = current.type === "human";

    this.gameScreen.setTurn(isYou, state.turnNumber);
    this.updateDebug();

    if (isYou) {
      // Re-render so the AI hand appears in its freshly shuffled order
      // before input is enabled (the player must not act on stale slots).
      this.gameScreen.render(state);
      // Un-hide the AI's drawn card only now: the hand is shuffled, so its
      // landing slot can no longer be determined.
      for (const view of this.gameScreen.computerHand.getAllViews()) {
        view.element.classList.remove("card--hidden");
      }
      this.gameScreen.setComputerInteractive(true);
      this.gameScreen.setHint(t("yourTurn"));
      this.busy = false;
      this.setBusyUI(false);
    } else {
      this.gameScreen.setComputerInteractive(false);
      this.gameScreen.setHint("");
      this.busy = false;
      this.setBusyUI(false);
      this.scheduleAITurn();
    }
  }

  private scheduleAITurn(): void {
    this.cancelAITimer();
    this.aiTimer = window.setTimeout(() => {
      this.aiTimer = null;
      void this.runAITurn();
    }, this.aiDelayMs);
  }

  private cancelAITimer(): void {
    if (this.aiTimer !== null) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Game over
  // ------------------------------------------------------------------

  private finishGame(): void {
    if (this.busy) {
      this.busy = false;
      this.setBusyUI(false);
    }
    this.cancelAITimer();
    this.gameScreen.setComputerInteractive(false);
    this.gameScreen.setHint("");
    this.platform.gameplayStop();

    const winner = this.engine.getWinner();
    const me = this.engine.getPlayer(HUMAN_ID);
    const won = me !== undefined && winner === me.id;

    if (won) {
      this.audio.playSound("win");
    } else {
      this.audio.playSound("lose");
    }

    const stats = addGame(this.getStats(), won ? "win" : "loss");
    this.onStatsChange(stats);
    this.updateDebug();

    const overlay = this.gameOverScreen.element;
    window.setTimeout(() => {
      if (won) {
        this.gameOverScreen.showVictory();
      } else {
        this.gameOverScreen.showDefeat();
      }
      overlay.classList.add("overlay--visible");
    }, this.animations.time(500));
  }

  // ------------------------------------------------------------------
  // Debug tools
  // ------------------------------------------------------------------

  forcePlayerTurn(): void {
    this.cancelAITimer();
    const humanIndex = this.engine.state.players.findIndex((p) => p.type === "human");
    if (humanIndex === -1) return;
    if (this.engine.isGameOver()) return;
    this.engine.state.currentPlayerIndex = humanIndex;
    this.engine.state.phase = "PLAYER_TURN";
    this.busy = false;
    this.beginNextTurn();
  }

  forceAITurn(): void {
    this.cancelAITimer();
    const aiIndex = this.engine.state.players.findIndex((p) => p.type === "ai");
    if (aiIndex === -1) return;
    if (this.engine.isGameOver()) return;
    this.engine.state.currentPlayerIndex = aiIndex;
    this.engine.state.phase = "AI_TURN";
    this.busy = false;
    this.beginNextTurn();
  }

  revealHands(revealed: boolean): void {
    // Flip the computer's cards for real — the CSS-only approach can't work
    // because setFacedown(true) clears the face DOM. HandView.setFacedown
    // updates its internal flag, so re-renders keep the reveal.
    this.gameScreen.computerHand.setFacedown(!revealed);
  }

  private updateDebug(): void {
    if (!this.debugPanel) return;
    const witch = this.engine.getWitchHolder();
    this.debugPanel.update(
      this.engine.state,
      this.engine.getSeed(),
      witch?.id ?? null,
    );
  }

  // ------------------------------------------------------------------
  // Visibility / pause
  // ------------------------------------------------------------------

  private bindVisibility(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.onHidden();
      } else {
        this.onVisible();
      }
    });
    window.addEventListener("blur", () => this.onHidden());
    window.addEventListener("focus", () => this.onVisible());
  }

  private onHidden(): void {
    if (this.hidden || this.engine.isGameOver()) return;
    this.hidden = true;
    this.cancelAITimer();
    this.prevPhase = this.engine.state.phase;
    if (this.engine.state.phase !== "GAME_OVER") {
      this.engine.state.phase = "PAUSED";
    }
    this.gameScreen.setComputerInteractive(false);
    this.gameScreen.element.classList.add("game--paused");
    this.wasMuted = this.audio.isMuted();
    this.audio.setMuted(true);
  }

  private onVisible(): void {
    if (!this.hidden) return;
    this.hidden = false;
    this.audio.setMuted(this.wasMuted);
    this.gameScreen.element.classList.remove("game--paused");

    if (this.engine.isGameOver()) return;
    if (this.prevPhase) {
      this.engine.state.phase = this.prevPhase;
      this.prevPhase = null;
    }
    this.gameScreen.render(this.engine.state);
    this.updateDebug();

    const phase = this.engine.state.phase;
    if (phase === "AI_TURN" && !this.busy) {
      this.scheduleAITurn();
    } else if (phase === "PLAYER_TURN") {
      this.gameScreen.setComputerInteractive(true);
      this.gameScreen.setHint(t("yourTurn"));
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private setBusyUI(busy: boolean): void {
    this.engine.state.isAnimating = busy;
    this.gameScreen.setComputerInteractive(!busy && !this.hidden && this.engine.state.phase === "PLAYER_TURN");
  }

  private captureRects(views: { element: HTMLElement; card: Card }[]): Map<string, DOMRect> {
    const map = new Map<string, DOMRect>();
    for (const view of views) {
      map.set(view.card.id, view.element.getBoundingClientRect());
    }
    return map;
  }

  private collectDraw(fn: () => void): CollectedDraw {
    const collected: CollectedDraw = {
      drawn: null,
      pair: null,
      discarded: null,
      gameOver: false,
    };
    const offDrawn = this.engine.on("CARD_DRAWN", (e) => {
      collected.drawn = e;
    });
    const offPair = this.engine.on("PAIR_CREATED", (e) => {
      collected.pair = e;
    });
    const offDiscard = this.engine.on("CARDS_DISCARDED", (e) => {
      collected.discarded = e.cards;
    });
    const offOver = this.engine.on("GAME_OVER", () => {
      collected.gameOver = true;
    });
    fn();
    offDrawn();
    offPair();
    offDiscard();
    offOver();
    return collected;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}