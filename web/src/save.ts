// Replaces PlayerMemories (a text file next to the .exe) with localStorage.
const KEY = 'voidrunner.save.v1';

export interface SaveData {
  level: number; // next level index to play (SPlvlCounter)
  achievements: string[];
  muted: boolean;
  best: Record<string, number>; // best time per level, seconds
  timesPlayed: number;
}

const fresh = (): SaveData => ({ level: 0, achievements: [], muted: false, best: {}, timesPlayed: 0 });

let cache: SaveData | null = null;

export function load(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    cache = fresh();
  }
  return cache!;
}

export function save(patch: Partial<SaveData>): SaveData {
  const d = { ...load(), ...patch };
  cache = d;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* private mode: keep in memory only */
  }
  return d;
}

// Same names as the original achievements.cs
export const ACHIEVEMENTS = ['stronglegs', 'dedicated', 'bandageman', 'friends', 'champ', 'quick', 'finisher'];

/** Returns true if newly unlocked. */
export function unlock(name: string): boolean {
  const d = load();
  if (d.achievements.includes(name)) return false;
  save({ achievements: [...d.achievements, name] });
  return true;
}
