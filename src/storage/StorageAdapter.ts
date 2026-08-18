import { PlayerStats } from "../core/PlayerStats";

export interface StorageAdapter {
  getStats(): PlayerStats | null;
  saveStats(stats: PlayerStats): void;
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  getLang(): string | null;
  setLang(lang: string): void;
}