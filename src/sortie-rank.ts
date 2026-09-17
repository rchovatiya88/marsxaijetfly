export type SortieResult = {
  score: number;
  level?: number;
  won: boolean;
  best?: number;
  mode?: string;
  route?: string;
  seconds?: number;
  shots?: number;
  chargesSpent?: number;
  hullLost?: number;
  shieldLeft?: number;
};

export type SortieRank = 'S' | 'A' | 'B' | 'C';

export interface SortieRankInfo {
  rank: SortieRank;
  title: string;
  color: string;
}

export function computeSortieRank(result: SortieResult | null): SortieRankInfo {
  if (!result) return { rank: 'C', title: 'TRAINEE', color: '#9aa0a6' };
  if (!result.won) return { rank: 'C', title: 'SIGNAL LOST', color: '#ff4f45' };
  const hullLost = result.hullLost || 0;
  const seconds = result.seconds || 999;
  if (hullLost === 0 && seconds <= 38) {
    return { rank: 'S', title: 'LEGENDARY MARS ACE', color: '#ffe29a' };
  }
  if (hullLost <= 30 || seconds <= 48) {
    return { rank: 'A', title: 'COMBAT ELITE', color: '#78ffe1' };
  }
  return { rank: 'B', title: 'SORTIE CERTIFIED', color: '#00ff9d' };
}
