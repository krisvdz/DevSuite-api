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

const router = Router()

// Rotas públicas (não precisam de token)
router.post('/register', register)
router.post('/login', login)

// Rota protegida (precisa de token)
// authMiddleware é executado ANTES do handler me()
// Se o token for inválido, authMiddleware retorna 401 e me() nunca é chamado
router.get('/me', authMiddleware, me)

export default router
