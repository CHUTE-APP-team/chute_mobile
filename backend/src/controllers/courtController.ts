import { Request, Response, NextFunction } from 'express'
import Court from '../models/Court'
import { AppError } from '../utils/AppError'
import { sendSuccess } from '../utils/response'

export async function createCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, address, modality } = req.body
    if (!name || !address || !modality)
      return next(new AppError('name, address e modality são obrigatórios', 400))
    const court = await Court.create({ name, address, modality, createdBy: (req as any).userId })
    return sendSuccess(res, 'Quadra criada', court, 201)
  } catch (err) { next(err) }
}

export async function listCourts(req: Request, res: Response, next: NextFunction) {
  try {
    const { modality } = req.query
    const filter: Record<string, unknown> = {}
    if (modality) filter.modality = modality
    const courts = await Court.find(filter).sort({ name: 1 }).lean()
    return sendSuccess(res, 'Quadras listadas', courts)
  } catch (err) { next(err) }
}

export async function getCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const court = await Court.findById(req.params.id).lean()
    if (!court) return next(new AppError('Quadra não encontrada', 404))
    return sendSuccess(res, 'Quadra encontrada', court)
  } catch (err) { next(err) }
}

export async function updateCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const court = await Court.findById(req.params.id)
    if (!court) return next(new AppError('Quadra não encontrada', 404))
    if (String(court.createdBy) !== String((req as any).userId))
      return next(new AppError('Sem permissão', 403))
    const { name, address, modality } = req.body
    if (name) court.name = name
    if (address) court.address = address
    if (modality) court.modality = modality
    await court.save()
    return sendSuccess(res, 'Quadra atualizada', court)
  } catch (err) { next(err) }
}

export async function deleteCourt(req: Request, res: Response, next: NextFunction) {
  try {
    const court = await Court.findById(req.params.id)
    if (!court) return next(new AppError('Quadra não encontrada', 404))
    if (String(court.createdBy) !== String((req as any).userId))
      return next(new AppError('Sem permissão', 403))
    await court.deleteOne()
    return sendSuccess(res, 'Quadra deletada', { deleted: true })
  } catch (err) { next(err) }
}
