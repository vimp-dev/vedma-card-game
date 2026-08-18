import { GameState } from "../core/GameState";
import { t, tTpl } from "../i18n";
import { BaseScreen } from "./Screen";
import { HandView } from "./HandView";
import { DiscardPileView } from "./DiscardPileView";
import { TurnIndicator } from "./TurnIndicator";
import { CardView } from "./CardView";
import { el } from "./dom";

export interface GameScreenCallbacks {
  onComputerCardSelect(cardId: string): void;
  onRestart(): void;
  onMenu(): void;
}

/**
 * The main play screen. Owns the DOM layout; rendering is driven by the
 * controller reading the engine's authoritative state.
 *
 * `callbacks` is a shared mutable object — the controller updates its
 * methods after construction without rebuilding the DOM.
 */
export class GameScreen extends BaseScreen {
  readonly computerHand: HandView;
  readonly playerHand: HandView;
  readonly discard: DiscardPileView;
  readonly turnIndicator: TurnIndicator;
  readonly hintEl: HTMLElement;
  readonly centerEl: HTMLElement;

  private computerLabelEl: HTMLElement;
  private playerLabelEl: HTMLElement;
  private interactive = false;
  private readonly callbacks: GameScreenCallbacks;

  constructor(callbacks: GameScreenCallbacks) {
    super("div", "screen screen--game");
    this.callbacks = callbacks;
    this.computerLabelEl = el("div", "zone__label");
    this.playerLabelEl = el("div", "zone__label");

    this.computerHand = new HandView({
      facedown: true,
      onCardClick: (cardId) => this.callbacks.onComputerCardSelect(cardId),
    });
    this.playerHand = new HandView({ facedown: false });
    this.discard = new DiscardPileView(t("discardPile"));
    this.turnIndicator = new TurnIndicator();
    this.hintEl = el("div", "game-hint");
    this.hintEl.setAttribute("aria-live", "polite");
    this.centerEl = el("div", "game-center");

    this.build();
  }

  private build(): void {
    const topbar = el("div", "game-topbar");
    const restartBtn = el("button", "btn btn--ghost btn--small", "↻");
    restartBtn.setAttribute("aria-label", t("ariaRestart"));
    restartBtn.addEventListener("click", () => this.callbacks.onRestart());
    const menuBtn = el("button", "btn btn--ghost btn--small", t("menu"));
    menuBtn.setAttribute("aria-label", t("ariaMenu"));
    menuBtn.addEventListener("click", () => this.callbacks.onMenu());
    topbar.append(restartBtn, menuBtn);

    const computerArea = el("div", "zone zone--computer");
    computerArea.append(this.computerLabelEl, this.computerHand.element);

    this.centerEl.append(this.discard.element, this.turnIndicator.element, this.hintEl);

    const playerArea = el("div", "zone zone--player");
    playerArea.append(this.playerLabelEl, this.playerHand.element);

    this.element.append(topbar, computerArea, this.centerEl, playerArea);
  }

  /** Full re-render from the engine state. */
  render(state: GameState): void {
    const me = state.players.find((p) => p.type === "human");
    const opponent = state.players.find((p) => p.type === "ai");
    if (!me || !opponent) return;

    this.playerLabelEl.textContent = `${t("you")} · ${tTpl("handCount", { count: me.hand.length })}`;
    this.computerLabelEl.textContent = `${t("computer")} · ${tTpl("handCount", { count: opponent.hand.length })}`;

    this.playerHand.render(me.hand);
    this.computerHand.render(opponent.hand);
    this.discard.update(state.discardPile);
  }

  setComputerInteractive(interactive: boolean): void {
    this.interactive = interactive;
    for (const view of this.computerHand.getCardViews()) {
      view.setInteractive(interactive);
    }
    this.computerHand.element.classList.toggle("hand--active", interactive);
  }

  setTurn(isYou: boolean, turnNumber: number): void {
    this.turnIndicator.setText(
      isYou
        ? `${t("yourTurn")} · №${turnNumber}`
        : `${t("opponentsTurn")} · №${turnNumber}`,
    );
    this.turnIndicator.setState(isYou ? "you" : "opponent");
  }

  setHint(text: string): void {
    this.hintEl.textContent = text;
    this.hintEl.classList.toggle("game-hint--visible", text.length > 0);
  }

  isInteractive(): boolean {
    return this.interactive;
  }

  getCardView(cardId: string): CardView | null {
    return (
      this.computerHand.getCardView(cardId) ??
      this.playerHand.getCardView(cardId) ??
      null
    );
  }

  getComputerCardRect(cardId: string): DOMRect | null {
    const view = this.computerHand.getCardView(cardId);
    return view ? view.element.getBoundingClientRect() : null;
  }

  getPlayerCardRect(cardId: string): DOMRect | null {
    const view = this.playerHand.getCardView(cardId);
    return view ? view.element.getBoundingClientRect() : null;
  }

  getDiscardRect(): DOMRect {
    return this.discard.element.getBoundingClientRect();
  }
}