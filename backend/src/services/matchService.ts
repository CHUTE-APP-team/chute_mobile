import { Types } from 'mongoose';
import { ITeam } from '../models/Match';

export function generateTeams(players: Types.ObjectId[]): [ITeam, ITeam] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const mid = Math.floor(shuffled.length / 2);

  const teamA: ITeam = { name: 'Time A', players: shuffled.slice(0, mid) };
  const teamB: ITeam = { name: 'Time B', players: shuffled.slice(mid) };

  return [teamA, teamB];
}
