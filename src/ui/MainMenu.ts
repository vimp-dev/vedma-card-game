import { PlayerStats, createEmptyStats, winRate } from "../core/PlayerStats";
import { t } from "../i18n";
import { BaseScreen } from "./Screen";
import { el } from "./dom";

export interface MainMenuCallbacks {
  onPlay(): void;
  onRules(): void;
  onSettings(): void;
}

/** A small SVG witch silhouette used as the menu emblem. */
const WITCH_SVG = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <path class="witch-hat" d="M50 8 L74 42 L62 42 L66 52 L34 52 L38 42 L26 42 Z" />
  <path class="witch-brim" d="M22 46 h56 v8 h-56 Z" />
  <path class="witch-face" d="M36 54 Q36 84 50 84 Q64 84 64 54 Z" />
  <circle class="witch-eye" cx="43" cy="62" r="3" />
  <circle class="witch-eye" cx="57" cy="62" r="3" />
</svg>`;

export class MainMenu extends BaseScreen {
  private statsEl!: HTMLElement;
  private stats: PlayerStats = createEmptyStats();

  constructor(private readonly cb: MainMenuCallbacks) {
    super("div", "screen screen--menu");
    this.build();
  }

  private build(): void {
    this.element.textContent = "";
    const inner = el("div", "menu__inner");

    const emblem = el("div", "menu__emblem");
    emblem.innerHTML = WITCH_SVG;

    const title = el("h1", "menu__title", t("appName"));
    const subtitle = el("p", "menu__subtitle", t("menuSubtitle"));

    const playBtn = el("button", "btn btn--primary btn--big", t("play"));
    playBtn.setAttribute("aria-label", t("ariaPlay"));
    playBtn.addEventListener("click", () => {
      this.cb.onPlay();
    });

    const rulesBtn = el("button", "btn", t("rules"));
    rulesBtn.setAttribute("aria-label", t("ariaRules"));
    rulesBtn.addEventListener("click", () => this.cb.onRules());

    const settingsBtn = el("button", "btn", t("settings"));
    settingsBtn.setAttribute("aria-label", t("ariaSettings"));
    settingsBtn.addEventListener("click", () => this.cb.onSettings());

    this.statsEl = el("div", "menu__stats");

    inner.append(emblem, title, subtitle, playBtn, rulesBtn, settingsBtn, this.statsEl);
    this.element.append(inner);
    this.updateStats(this.stats);
  }

  mount(): void {
    this.element.classList.add("screen--enter");
  }

  /** Rebuilds localized strings (used after a language change). */
  refresh(): void {
    this.build();
  }

  updateStats(stats: PlayerStats): void {
    this.stats = stats;
    if (this.statsEl) {
      this.statsEl.textContent = `${t("statisticsTitle")}: ${t("gamesPlayed")} ${stats.gamesPlayed} · ${t("wins")} ${stats.wins} · ${t("losses")} ${stats.losses} · ${t("winRate")} ${winRate(stats)}%`;
    }
  }
}