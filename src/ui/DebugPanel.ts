import { GameState } from "../core/GameState";
import { t } from "../i18n";
import { el } from "./dom";

export interface DebugCallbacks {
  onForcePlayerTurn(): void;
  onForceAITurn(): void;
  onRevealHands(revealed: boolean): void;
  onRestart(): void;
}

/**
 * Development-only floating panel. Rendered only when `?debug=true` is in
 * the URL — never shown to normal players.
 */
export class DebugPanel {
  readonly element: HTMLElement;
  private readonly infoEl: HTMLElement;
  private revealed = false;

  constructor(private readonly cb: DebugCallbacks) {
    this.element = el("div", "debug-panel");
    this.element.setAttribute("aria-label", "Debug panel");

    const title = el("div", "debug-title", "DEBUG");

    this.infoEl = el("div", "debug-info");

    const buttons = el("div", "debug-buttons");
    const revealBtn = el("button", "btn btn--tiny", t("debugReveal"));
    revealBtn.addEventListener("click", () => {
      this.revealed = !this.revealed;
      this.cb.onRevealHands(this.revealed);
      revealBtn.classList.toggle("btn--active", this.revealed);
    });
    const playerBtn = el("button", "btn btn--tiny", t("debugForcePlayer"));
    playerBtn.addEventListener("click", () => this.cb.onForcePlayerTurn());
    const aiBtn = el("button", "btn btn--tiny", t("debugForceAI"));
    aiBtn.addEventListener("click", () => this.cb.onForceAITurn());
    const restartBtn = el("button", "btn btn--tiny", t("debugRestart"));
    restartBtn.addEventListener("click", () => this.cb.onRestart());

    buttons.append(revealBtn, playerBtn, aiBtn, restartBtn);
    this.element.append(title, this.infoEl, buttons);
  }

  update(state: GameState, seed: number | undefined, witchHolderId: string | null): void {
    const current = state.players[state.currentPlayerIndex];
    const counts = state.players.map((p) => `${p.id}:${p.hand.length}`).join(" ");
    this.infoEl.textContent = [
      `${t("debugPhase")}: ${state.phase}`,
      `${t("debugPlayer")}: ${current?.id ?? "—"} (turn ${state.turnNumber})`,
      `cards [${counts}]`,
      `${t("debugWitch")}: ${witchHolderId ?? "—"}`,
      `seed: ${seed ?? "—"}`,
      `discard: ${state.discardPile.length}`,
    ].join("\n");
  }
}