// ═══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES — Definição das rotas de autenticação
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Express Router
// Em vez de definir todas as rotas no app.ts principal, usamos Routers
// para organizar as rotas por funcionalidade (separation of concerns).
// O Router é depois "montado" em um prefixo no app.ts:
//   app.use('/api/auth', authRouter)
//
// Isso significa que:
//   authRouter.post('/register') → POST /api/auth/register
//   authRouter.post('/login')    → POST /api/auth/login
//   authRouter.get('/me')        → GET  /api/auth/me

import { Router } from 'express'
import { register, login, me } from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { rateLimit } from '../middlewares/rate-limit.middleware'

const router = Router()

// 📚 CONCEITO: Rate Limiting em rotas de autenticação
// Login e registro são os alvos mais comuns de ataques de brute-force.
// Limitamos as tentativas por IP para mitigar isso:
// - Login: 10 tentativas a cada 15 minutos (permite erros de digitação)
// - Registro: 5 tentativas a cada 15 minutos (criação de contas é menos frequente)
const loginLimiter = rateLimit('login', {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxAttempts: 10,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
})

const registerLimiter = rateLimit('register', {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxAttempts: 5,
  message: 'Muitas tentativas de registro. Tente novamente em alguns minutos.',
})

// Rotas públicas (não precisam de token)
router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)

// Rota protegida (precisa de token)
// authMiddleware é executado ANTES do handler me()
// Se o token for inválido, authMiddleware retorna 401 e me() nunca é chamado
router.get('/me', authMiddleware, me)

export default router
