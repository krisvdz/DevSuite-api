// ═══════════════════════════════════════════════════════════════════════════
// APP.TS — Configuração do servidor Express
// ═══════════════════════════════════════════════════════════════════════════

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.routes'
import projectRouter from './routes/project.routes'
import { focusRoutes } from './routes/focus.routes'
import { errorMiddleware } from './middlewares/error.middleware'
import { env } from './lib/env'

const app = express()

// ─── CORS ────────────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173']

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin '${origin}' não permitida`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    allowedOrigins,
  })
})

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/projects', projectRouter)
app.use('/api/focus-sessions', focusRoutes)

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Rota ${req.method} ${req.originalUrl} não encontrada`,
    code: 'ROUTE_NOT_FOUND',
  })
})

// ─── Error Middleware ───────────────────────────────────────────────────────
app.use(errorMiddleware)

export default app
