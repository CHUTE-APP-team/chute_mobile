import { Types } from 'mongoose';
import { ITeam } from '../models/Match';

interface PlayerWithOverall {
  _id: Types.ObjectId;
  overall: number;
}

/**
 * Generates 2 balanced teams using a snake draft.
 *
 * Algorithm:
 *   1. Sort players by overall DESC
 *   2. Alternate assignment A, B, B, A, A, B, B, A … (snake draft)
 *      → minimises the overall gap between teams without complex math
 *   3. Calculate totalOverall for each team
 *
 * The function is pure — it does not mutate the input array.
 */
export function generateBalancedTeams(players: PlayerWithOverall[]): [ITeam, ITeam] {
  const sorted = [...players].sort((a, b) => b.overall - a.overall);

  const teamA: Types.ObjectId[] = [];
  const teamB: Types.ObjectId[] = [];
  let totalA = 0;
  let totalB = 0;

  // Snake draft: pick order → A B B A A B B A …
  sorted.forEach((player, index) => {
    const round = Math.floor(index / 2);
    const pickA = round % 2 === 0 ? index % 2 === 0 : index % 2 === 1;

    if (pickA) {
      teamA.push(player._id);
      totalA += player.overall;
    } else {
      teamB.push(player._id);
      totalB += player.overall;
    }
  });

  return [
    { name: 'Time A', players: teamA, totalOverall: totalA },
    { name: 'Time B', players: teamB, totalOverall: totalB },
  ];
}

/**
 * Returns whether the match should auto-generate teams.
 * Triggers when the player count hits exactly the minPlayers threshold.
 */
export function shouldAutoGenerateTeams(
  playerCount: number,
  minPlayers: number
): boolean {
  return playerCount >= minPlayers;
}
