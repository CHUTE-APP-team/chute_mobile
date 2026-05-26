import { Request, Response, NextFunction } from 'express'
import User from '../models/User'
import { AppError } from '../utils/AppError'
import { sendSuccess } from '../utils/response'

export async function rateUserStars(req: Request, res: Response, next: NextFunction) {
  try {
    const { stars } = req.body
    const targetId = req.params.id
    const callerId = String((req as any).userId as string)

    if (targetId === callerId)
      return next(new AppError('Você não pode se auto-avaliar', 400))

    const starsNum = Number(stars)
    if (!starsNum || starsNum < 1 || starsNum > 5 || !Number.isInteger(starsNum))
      return next(new AppError('stars deve ser inteiro entre 1 e 5', 400))

    const user = await User.findById(targetId)
    if (!user) return next(new AppError('Usuário não encontrado', 404))

    user.starRatingsCount = (user.starRatingsCount ?? 0) + 1
    user.starRatingsSum   = (user.starRatingsSum ?? 0) + starsNum
    user.stars = Math.round(user.starRatingsSum / user.starRatingsCount)

    await user.save()
    return sendSuccess(res, 'Avaliação registrada', { stars: user.stars, starRatingsCount: user.starRatingsCount })
  } catch (err) { next(err) }
}
