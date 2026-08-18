import { Language, getLanguage, t } from "../i18n";
import { BaseScreen } from "./Screen";
import { el } from "./dom";

export interface AppSettings {
  sound: boolean;
  music: boolean;
  animations: boolean;
  language: Language;
}

export interface SettingsCallbacks {
  onClose(settings: AppSettings): void;
  onChange(settings: AppSettings): void;
}

export class SettingsScreen extends BaseScreen {
  private settings: AppSettings;

  constructor(
    initial: AppSettings,
    private readonly cb: SettingsCallbacks,
  ) {
    super("div", "overlay screen--settings");
    this.settings = { ...initial };
    this.build();
  }

  private build(): void {
    this.element.textContent = "";
    const panel = el("div", "panel");

    const title = el("h2", "panel__title", t("settingsTitle"));
    panel.append(title);

    const rows: Array<[string, string, () => boolean, (v: boolean) => void]> = [
      [t("sound"), "sound", () => this.settings.sound, (v) => (this.settings.sound = v)],
      [t("music"), "music", () => this.settings.music, (v) => (this.settings.music = v)],
      [
        t("animations"),
        "animations",
        () => this.settings.animations,
        (v) => (this.settings.animations = v),
      ],
    ];

    for (const [label, key, get, set] of rows) {
      const row = el("div", "setting-row");
      const name = el("span", "setting-row__label", label);
      const toggle = el("button", "toggle");
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-label", label);
      const thumb = el("span", "toggle__thumb");
      toggle.append(thumb);
      const sync = () => {
        const on = get();
        toggle.classList.toggle("toggle--on", on);
        toggle.setAttribute("aria-checked", String(on));
      };
      sync();
      toggle.addEventListener("click", () => {
        set(!get());
        sync();
        this.commit();
      });
      row.append(name, toggle);
      panel.append(row);
      void key;
    }

    // Language
    const langRow = el("div", "setting-row");
    const langName = el("span", "setting-row__label", t("language"));
    const langGroup = el("div", "lang-group");
    const langs: Language[] = ["ru", "en"];
    for (const lang of langs) {
      const btn = el("button", "lang-btn", lang.toUpperCase());
      btn.setAttribute("aria-pressed", String(this.settings.language === lang));
      btn.addEventListener("click", () => {
        this.settings.language = lang;
        for (const b of Array.from(langGroup.children)) {
          b.setAttribute("aria-pressed", String(b === btn));
          b.classList.toggle("lang-btn--active", b === btn);
        }
        this.commit();
      });
      if (this.settings.language === lang) {
        btn.classList.add("lang-btn--active");
      }
      langGroup.append(btn);
    }
    langRow.append(langName, langGroup);
    panel.append(langRow);

    const closeBtn = el("button", "btn btn--primary", t("close"));
    closeBtn.addEventListener("click", () => this.cb.onClose(this.settings));
    panel.append(closeBtn);

    this.element.append(panel);
  }

  private commit(): void {
    this.cb.onChange(this.settings);
  }

  /** Rebuilds localized strings and resets toggles (language change). */
  refresh(): void {
    this.build();
  }

  currentLanguage(): Language {
    return getLanguage();
  }
}