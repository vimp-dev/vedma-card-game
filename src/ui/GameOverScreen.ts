import { t } from "../i18n";
import { BaseScreen } from "./Screen";
import { el } from "./dom";

export interface GameOverCallbacks {
  onPlayAgain(): void;
  onMenu(): void;
}

export class GameOverScreen extends BaseScreen {
  constructor(private readonly cb: GameOverCallbacks) {
    super("div", "overlay screen--gameover");
    this.build();
  }

  private build(): void {
    const panel = el("div", "panel panel--gameover");
    const title = el("h2", "gameover__title");
    const subtitle = el("p", "gameover__subtitle");
    const witch = el("div", "gameover__witch", "♠");
    const witchLabel = el("div", "gameover__witch-label", "Q");

    const againBtn = el("button", "btn btn--primary", t("playAgain"));
    againBtn.setAttribute("aria-label", t("ariaRestart"));
    againBtn.addEventListener("click", () => this.cb.onPlayAgain());

    const menuBtn = el("button", "btn", t("toMenu"));
    menuBtn.setAttribute("aria-label", t("ariaMenu"));
    menuBtn.addEventListener("click", () => this.cb.onMenu());

    panel.append(title, subtitle, witch, witchLabel, againBtn, menuBtn);
    this.element.append(panel);

    this.titleEl = title;
    this.subtitleEl = subtitle;
    this.witchEl = witch;
  }

  private titleEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private witchEl!: HTMLElement;

  showVictory(): void {
    this.titleEl.textContent = t("victoryTitle");
    this.subtitleEl.textContent = t("victorySubtitle");
    this.titleEl.classList.remove("gameover__title--lose");
    this.titleEl.classList.add("gameover__title--win");
    this.witchEl.style.opacity = "0";
  }

  showDefeat(): void {
    this.titleEl.textContent = t("defeatTitle");
    this.subtitleEl.textContent = t("defeatSubtitle");
    this.titleEl.classList.remove("gameover__title--win");
    this.titleEl.classList.add("gameover__title--lose");
    this.witchEl.style.opacity = "1";
  }
}