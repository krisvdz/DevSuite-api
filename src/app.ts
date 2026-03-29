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
import { env } from './lib/env' // Valida variáveis de ambiente na inicialização

const app = express()

// ─── CORS ────────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173']

app.use(
  cors({
    origin: env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true, // permite enviar cookies (útil para auth mais avançada)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  })
})

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/projects', projectRouter)
app.use('/api/focus-sessions', focusRoutes)

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Rota ${req.method} ${req.originalUrl} não encontrada`,
    code: 'ROUTE_NOT_FOUND',
  })
})

// ─── Error Middleware ────────────────────────────────────────────────────────
app.use(errorMiddleware)

// ─── Inicialização do Servidor ────────────────────────────────────────────────
const PORT = env.PORT

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       🚀 DevSuite API iniciada!          ║
  ╠══════════════════════════════════════════╣
  ║  Ambiente: ${env.NODE_ENV.padEnd(29)}║
  ║  Porta:    ${String(PORT).padEnd(29)}║
  ║  Health:   http://localhost:${PORT}/health  ║
  ╚══════════════════════════════════════════╝
  `)
})

export default app
