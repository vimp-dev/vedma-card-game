import { CrazyGamesPlatformAdapter } from "./CrazyGamesPlatformAdapter";
import { LocalPlatformAdapter } from "./LocalPlatformAdapter";
import { PlatformAdapter, PlatformId } from "./PlatformAdapter";
import { YandexPlatformAdapter, YandexHooks } from "./YandexPlatformAdapter";

/**
 * Detects the hosting platform and returns the right adapter.
 *
 * Detection order:
 *   1. CrazyGames (injected `window.CrazyGames`)
 *   2. Yandex Games (hosted on yandex.net with `ya_sid`, or `window.YaGames`)
 *   3. Local / generic web
 */
export class PlatformManager {
  private adapter: PlatformAdapter;
  private started = false;

  constructor(hooks: YandexHooks | null = null) {
    this.adapter = new LocalPlatformAdapter();
    if (CrazyGamesPlatformAdapter.detect()) {
      this.adapter = new CrazyGamesPlatformAdapter();
    } else if (this.isYandex()) {
      this.adapter = new YandexPlatformAdapter(hooks);
    }
  }

  private isYandex(): boolean {
    try {
      const host = window.location.hostname;
      return (
        host.endsWith("yandex.net") ||
        host.endsWith("yandex.ru") ||
        !!window.YaGames
      );
    } catch {
      return false;
    }
  }

  getAdapter(): PlatformAdapter {
    return this.adapter;
  }

  getId(): PlatformId {
    return this.adapter.id;
  }

  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /** Signals entering the playable state (deduplicated). */
  gameplayStart(): void {
    if (this.started) return;
    this.started = true;
    this.adapter.gameplayStart();
  }

  /** Signals leaving the playable state. */
  gameplayStop(): void {
    if (!this.started) return;
    this.started = false;
    this.adapter.gameplayStop();
  }
}