import { t } from "../i18n";
import { BaseScreen } from "./Screen";
import { el } from "./dom";

export interface RulesCallbacks {
  onClose(): void;
}

/** Example mini-cards shown inline in the rules screen. */
function exampleCard(rank: string, suit: string): HTMLElement {
  const card = el("div", "example-card");
  card.append(
    el("span", "example-card__rank", rank),
    el("span", "example-card__suit", suit),
  );
  return card;
}

export class RulesScreen extends BaseScreen {
  constructor(private readonly cb: RulesCallbacks) {
    super("div", "overlay screen--rules");
    this.build();
  }

  private build(): void {
    this.element.textContent = "";
    const panel = el("div", "panel");

    const title = el("h2", "panel__title", t("rulesTitle"));
    const tagline = el("p", "panel__text panel__text--lead", t("rulesTagline"));

    // Pair example
    const pairTitle = el("h3", "panel__subtitle", t("rulesPairExampleTitle"));
    const pairRow = el("div", "example-row");
    pairRow.append(exampleCard("7", "♠"));
    const plus = el("span", "example-op", "+");
    pairRow.append(plus);
    pairRow.append(exampleCard("7", "♥"));
    const arrow = el("span", "example-op", "→");
    pairRow.append(arrow);
    const pairLabel = el("span", "example-note", t("rulesPairExample").split("→").pop() ?? "");
    pairRow.append(pairLabel);

    const list = el("ul", "rules-list");
    const items = [
      t("rulesDraw"),
      t("rulesDrawPair"),
      t("rulesWitchNoPair"),
      t("rulesWitchLose"),
    ];
    for (const item of items) {
      const li = el("li", "rules-list__item", item);
      list.append(li);
    }

    const okBtn = el("button", "btn btn--primary", t("ok"));
    okBtn.addEventListener("click", () => this.cb.onClose());

    panel.append(title, tagline, pairTitle, pairRow, list, okBtn);
    this.element.append(panel);
  }

  /** Rebuilds localized strings (used after a language change). */
  refresh(): void {
    this.build();
  }
}