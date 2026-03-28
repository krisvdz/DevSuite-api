import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middlewares/auth.middleware'
import { prisma } from '../lib/prisma'

export const focusRoutes = Router()

// ─── Validation Schema ────────────────────────────────────────────────────────
const createFocusSessionSchema = z.object({
  duration: z
    .number({ required_error: 'Duração é obrigatória', invalid_type_error: 'Duração deve ser um número' })
    .int('Duração deve ser um número inteiro')
    .min(1, 'Duração deve ser pelo menos 1 segundo')
    .max(28800, 'Duração não pode exceder 8 horas (28800 segundos)'),
  type: z.enum(['WORK', 'SHORT_BREAK', 'LONG_BREAK']).default('WORK'),
  label: z.string().max(200, 'Label muito longo').nullable().optional(),
})

// POST /focus-sessions — save a completed session
focusRoutes.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = createFocusSessionSchema.parse(req.body)
    const userId = req.user!.id

    const session = await prisma.focusSession.create({
      data: { duration: data.duration, type: data.type, label: data.label, userId },
    })

    return res.status(201).json({ data: session })
  } catch (error) {
    next(error)
  }
})

// GET /focus-sessions/stats — today's stats
focusRoutes.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sessions = await prisma.focusSession.findMany({
      where: {
        userId,
        completedAt: { gte: today, lt: tomorrow },
        type: 'WORK',
      },
      orderBy: { completedAt: 'desc' },
    })

    const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0)
    const totalMinutes = Math.floor(totalSeconds / 60)

    // Weekly data (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    weekAgo.setHours(0, 0, 0, 0)

    const weekSessions = await prisma.focusSession.findMany({
      where: { userId, completedAt: { gte: weekAgo }, type: 'WORK' },
    })

    const weeklyByDay: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekAgo)
      d.setDate(d.getDate() + i)
      weeklyByDay[d.toISOString().slice(0, 10)] = 0
    }
    for (const s of weekSessions) {
      const key = s.completedAt.toISOString().slice(0, 10)
      if (key in weeklyByDay) weeklyByDay[key] = (weeklyByDay[key] || 0) + Math.floor(s.duration / 60)
    }

    return res.json({
      data: {
        todaySessions: sessions.length,
        todayMinutes: totalMinutes,
        sessions: sessions.slice(0, 10),
        weeklyMinutes: weeklyByDay,
      },
    })
  } catch (error) {
    next(error)
  }
})
