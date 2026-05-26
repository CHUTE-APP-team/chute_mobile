import { Request, Response, NextFunction } from 'express'
import StatSession from '../models/StatSession'
import TeamGroup from '../models/TeamGroup'
import { AppError } from '../utils/AppError'
import { sendSuccess } from '../utils/response'

export async function createStatSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId, date, label, matchId, players } = req.body
    if (!teamId || !date || !players?.length)
      return next(new AppError('teamId, date e players são obrigatórios', 400))

    const team = await TeamGroup.findById(teamId)
    if (!team) return next(new AppError('Time não encontrado', 404))

    const userId = String((req as any).userId)
    const isMember =
      String(team.createdBy) === userId ||
      team.members.some((m) => String(m) === userId)
    if (!isMember) return next(new AppError('Você não faz parte deste time', 403))

    const session = await StatSession.create({
      team: teamId,
      date: new Date(date),
      label: label ?? '',
      matchId: matchId ?? null,
      players,
      createdBy: (req as any).userId,
    })
    return sendSuccess(res, 'Sessão criada', session, 201)
  } catch (err) { next(err) }
}

export async function listStatSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.query
    if (!teamId) return next(new AppError('teamId é obrigatório', 400))

    const team = await TeamGroup.findById(teamId as string)
    if (!team) return next(new AppError('Time não encontrado', 404))

    const userId = String((req as any).userId)
    const isMember =
      String(team.createdBy) === userId ||
      team.members.some((m) => String(m) === userId)
    if (!isMember) return next(new AppError('Acesso negado', 403))

    const sessions = await StatSession.find({ team: teamId }).sort({ date: -1 }).lean()
    return sendSuccess(res, 'Sessões listadas', sessions)
  } catch (err) { next(err) }
}

export async function getStatSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await StatSession.findById(req.params.id).populate('team', 'name').lean()
    if (!session) return next(new AppError('Sessão não encontrada', 404))
    return sendSuccess(res, 'Sessão encontrada', session)
  } catch (err) { next(err) }
}

export async function updateStatSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await StatSession.findById(req.params.id)
    if (!session) return next(new AppError('Sessão não encontrada', 404))
    if (String(session.createdBy) !== String((req as any).userId))
      return next(new AppError('Sem permissão', 403))
    const { label, date, players } = req.body
    if (label !== undefined) session.label = label
    if (date) session.date = new Date(date)
    if (players?.length) session.players = players
    await session.save()
    return sendSuccess(res, 'Sessão atualizada', session)
  } catch (err) { next(err) }
}

export async function deleteStatSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await StatSession.findById(req.params.id)
    if (!session) return next(new AppError('Sessão não encontrada', 404))
    if (String(session.createdBy) !== String((req as any).userId))
      return next(new AppError('Sem permissão', 403))
    await session.deleteOne()
    return sendSuccess(res, 'Sessão deletada', { deleted: true })
  } catch (err) { next(err) }
}

export async function aggregateTeamStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.params
    const team = await TeamGroup.findById(teamId)
    if (!team) return next(new AppError('Time não encontrado', 404))

    const sessions = await StatSession.find({ team: teamId }).lean()
    const map: Record<string, { name: string; goals: number; assists: number; sessions: number }> = {}

    for (const session of sessions) {
      for (const p of session.players) {
        if (!map[p.name]) map[p.name] = { name: p.name, goals: 0, assists: 0, sessions: 0 }
        map[p.name].goals += p.goals
        map[p.name].assists += p.assists
        map[p.name].sessions += 1
      }
    }

    const result = Object.values(map)
      .map((p) => ({ ...p, total: p.goals + p.assists }))
      .sort((a, b) => b.total - a.total || b.goals - a.goals)

    return sendSuccess(res, 'Estatísticas agregadas', { players: result, totalSessions: sessions.length })
  } catch (err) { next(err) }
}
