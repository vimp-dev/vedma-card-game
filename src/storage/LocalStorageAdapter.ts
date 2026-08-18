import { PlayerStats, createEmptyStats } from "../core/PlayerStats";
import { StorageAdapter } from "./StorageAdapter";

const STATS_KEY = "witch.stats.v1";
const SETTINGS_PREFIX = "witch.setting.";
const LANG_KEY = "witch.lang";

/**
 * localStorage-backed storage. Silently degrades to in-memory storage when
 * localStorage is unavailable (private mode, blocked cookies, sandboxed
 * iframes on gaming platforms).
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly memory = new Map<string, string>();
  private readonly canStore: boolean;

  constructor() {
    this.canStore = this.tryLocalStorage();
  }

  private tryLocalStorage(): boolean {
    try {
      const probe = "__witch_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  private rawGet(key: string): string | null {
    if (this.canStore) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return this.memory.get(key) ?? null;
  }

  private rawSet(key: string, value: string): void {
    if (this.canStore) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        this.memory.set(key, value);
      }
    } else {
      this.memory.set(key, value);
    }
  }

  getStats(): PlayerStats | null {
    const raw = this.rawGet(STATS_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<PlayerStats>;
      return {
        gamesPlayed: Number(parsed.gamesPlayed) || 0,
        wins: Number(parsed.wins) || 0,
        losses: Number(parsed.losses) || 0,
      };
    } catch {
      return null;
    }
  }

  saveStats(stats: PlayerStats): void {
    this.rawSet(STATS_KEY, JSON.stringify(stats));
  }

  getStatsOrEmpty(): PlayerStats {
    return this.getStats() ?? createEmptyStats();
  }

  getSetting(key: string): string | null {
    return this.rawGet(SETTINGS_PREFIX + key);
  }

  setSetting(key: string, value: string): void {
    this.rawSet(SETTINGS_PREFIX + key, value);
  }

  getLang(): string | null {
    return this.rawGet(LANG_KEY);
  }

  setLang(lang: string): void {
    this.rawSet(LANG_KEY, lang);
  }
}