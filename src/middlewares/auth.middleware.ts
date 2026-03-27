// ═══════════════════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Verifica se o usuário está autenticado
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Middleware no Express
//
// Middleware é qualquer função com a assinatura (req, res, next).
// É executada ENTRE o recebimento da requisição e o envio da resposta.
// Você pode encadear múltiplos middlewares (daí o nome "middle-ware").
//
// Fluxo de uma requisição protegida:
//
//   [Client] → [authMiddleware] → [Controller] → [Client]
//                    ↓ (se falhar)
//               [401 Unauthorized]
//
// 📚 CONCEITO: JWT (JSON Web Token)
//
// JWT é o padrão mais usado para autenticação stateless em APIs REST.
// É composto por 3 partes separadas por ponto (base64url):
//
//   HEADER.PAYLOAD.SIGNATURE
//
// HEADER: algoritmo usado (ex: HS256)
// PAYLOAD: dados do usuário (userId, email, expiração...)
// SIGNATURE: HMAC do header+payload com uma chave secreta
//
// O servidor valida a assinatura — se bater, o token é legítimo.
// ⚠️ O payload é público (apenas base64, não criptografado)!
// Nunca coloque senhas ou dados sensíveis no payload.
//
// Diferença com Sessions:
// - Session: servidor guarda estado (requer Redis/banco para escalar)
// - JWT: stateless (o token carrega tudo, escala horizontalmente)

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extende o tipo Request do Express para incluir o usuário autenticado
// 📚 CONCEITO: Declaration Merging — TypeScript permite estender tipos
// de bibliotecas externas sem modificar o original
declare global {
  namespace Express {
    interface Request {
      userId?: string
      user?: { id: string }
    }
  }
}

interface JwtPayload {
  userId: string
  iat: number  // issued at (quando foi gerado)
  exp: number  // expiration (quando expira)
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Extrai o token do header Authorization
  // Padrão: "Authorization: Bearer eyJhbGci..."
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de autenticação não fornecido',
      code: 'MISSING_TOKEN',
    })
  }

  // Remove o prefixo "Bearer " para pegar só o token
  const token = authHeader.split(' ')[1]

  try {
    // 2. Verifica e decodifica o token
    // jwt.verify: valida a assinatura E a expiração ao mesmo tempo
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload

    // 3. Injeta o userId na requisição para os controllers usarem
    req.userId = payload.userId
    req.user = { id: payload.userId }

    // 4. Chama o próximo middleware/controller
    next()
  } catch (error) {
    // jwt.verify lança erros específicos que podemos tratar
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expirado. Faça login novamente.',
        code: 'TOKEN_EXPIRED',
      })
    }

    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN',
    })
  }
}
