import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { prisma } from '../lib/prisma'

export const focusRoutes = Router()

// POST /focus-sessions — save a completed session
focusRoutes.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { duration, type, label } = req.body
    const userId = req.user!.id

    const session = await prisma.focusSession.create({
      data: { duration, type: type || 'WORK', label, userId },
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
