export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export function createEmptyStats(): PlayerStats {
  return { gamesPlayed: 0, wins: 0, losses: 0 };
}

export function addGame(
  stats: PlayerStats,
  result: "win" | "loss",
): PlayerStats {
  return {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + (result === "win" ? 1 : 0),
    losses: stats.losses + (result === "loss" ? 1 : 0),
  };
}

export function winRate(stats: PlayerStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.wins / stats.gamesPlayed) * 100);
}