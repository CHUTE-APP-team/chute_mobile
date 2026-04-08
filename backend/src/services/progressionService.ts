import { Types } from 'mongoose';
import User, { Rank } from '../models/User';
import { IMatch, IPlayerResult } from '../models/Match';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function calcXpEarned(notaFinal: number, isWinner: boolean, isMvp: boolean): number {
  let xp = notaFinal * 10;
  if (isWinner) xp += 20;
  if (isMvp)    xp += 30;
  return xp;
}

export function calcLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function calcRank(level: number): Rank {
  if (level >= 21) return 'Elite';
  if (level >= 11) return 'Ouro';
  if (level >= 6)  return 'Prata';
  return 'Bronze';
}

// ─── Build player results from finish payload ─────────────────────────────────

export interface FinishMatchPayload {
  winnerTeam: string;           // "Time A" | "Time B"
  mvpPlayerId: string;
  playerNotes: Record<string, number>; // { [userId]: notaFinal }
}

export function buildPlayerResults(
  match: IMatch,
  payload: FinishMatchPayload
): IPlayerResult[] {
  const winnerTeam = match.teams.find((t) => t.name === payload.winnerTeam);
  const winnerIds = new Set(winnerTeam?.players.map((p) => p.toString()) ?? []);

  return match.players.map((playerId) => {
    const id = playerId.toString();
    const notaFinal = payload.playerNotes[id] ?? 5;
    const isWinner  = winnerIds.has(id);
    const isMvp     = id === payload.mvpPlayerId;
    const xpEarned  = calcXpEarned(notaFinal, isWinner, isMvp);

    return {
      playerId: new Types.ObjectId(id),
      notaFinal,
      isWinner,
      isMvp,
      xpEarned,
    };
  });
}

// ─── Persist XP gains to each player ─────────────────────────────────────────

export async function updatePlayerProgress(results: IPlayerResult[]): Promise<void> {
  await Promise.all(
    results.map(async ({ playerId, xpEarned }) => {
      const user = await User.findById(playerId);
      if (!user) return;

      user.xp    = user.xp + xpEarned;
      user.level = calcLevel(user.xp);
      user.rank  = calcRank(user.level);
      await user.save();
    })
  );
}
