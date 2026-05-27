import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { sendSuccess } from '../utils/response'

interface DrawPlayer { name: string; stars: number }
interface DrawnTeam  { name: string; players: DrawPlayer[]; totalStars: number; avgStars: number }

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function snakeDraft(players: DrawPlayer[], teamSize: number): DrawnTeam[] {
  if (players.length < 2) throw new AppError('Mínimo 2 jogadores', 400)
  const numTeams = Math.ceil(players.length / teamSize)
  // Group by stars, shuffle within each group, then sort descending to keep balance
  const grouped = new Map<number, DrawPlayer[]>()
  for (const p of players) {
    if (!grouped.has(p.stars)) grouped.set(p.stars, [])
    grouped.get(p.stars)!.push(p)
  }
  for (const [, group] of grouped) shuffle(group)
  // Rebuild sorted array from shuffled groups so same-star players appear in random order
  const starLevels = Array.from(grouped.keys()).sort((a, b) => b - a)
  const sorted: DrawPlayer[] = starLevels.flatMap((star) => grouped.get(star)!)
  const teams: DrawPlayer[][] = Array.from({ length: numTeams }, () => [])
  let round = 0, idx = 0
  while (idx < sorted.length) {
    const indices = round % 2 === 0
      ? Array.from({ length: numTeams }, (_, i) => i)
      : Array.from({ length: numTeams }, (_, i) => numTeams - 1 - i)
    for (const teamIdx of indices) {
      if (idx >= sorted.length) break
      teams[teamIdx].push(sorted[idx++])
    }
    round++
  }
  return teams.map((players, i) => {
    const totalStars = players.reduce((s, p) => s + p.stars, 0)
    return {
      name: `Time ${String.fromCharCode(65 + i)}`,
      players,
      totalStars,
      avgStars: players.length > 0 ? Math.round((totalStars / players.length) * 10) / 10 : 0,
    }
  })
}

export async function drawTeamsStandalone(req: Request, res: Response, next: NextFunction) {
  try {
    const { players, teamSize } = req.body
    if (!Array.isArray(players) || players.length < 2)
      return next(new AppError('Informe pelo menos 2 jogadores', 400))
    const size = Number(teamSize)
    if (!size || size < 1)
      return next(new AppError('teamSize deve ser um número positivo', 400))

    const normalized: DrawPlayer[] = players.map((p: any, i: number) => {
      if (!p.name?.trim()) throw new AppError(`Jogador ${i + 1} sem nome`, 400)
      const s = Number(p.stars)
      return { name: p.name.trim(), stars: s >= 1 && s <= 5 ? Math.round(s) : 3 }
    })

    const teams = snakeDraft(normalized, size)
    return sendSuccess(res, 'Times sorteados', { teams, totalPlayers: normalized.length })
  } catch (err) { next(err) }
}
