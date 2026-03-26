// ═══════════════════════════════════════════════════════════════════════════
// ERROR MIDDLEWARE — Tratamento centralizado de erros
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Error-handling Middleware no Express
//
// Um middleware de erro tem 4 parâmetros: (err, req, res, next)
// O Express identifica que é um error handler pela presença dos 4 params.
// Quando qualquer controller chama next(error), o Express pula direto
// para este middleware, ignorando os demais.
//
// Por que centralizar tratamento de erros?
// - Evita repetir blocos try/catch em cada controller
// - Garante respostas de erro consistentes para o frontend
// - Facilita logging centralizado (Sentry, Datadog, etc.)
//
// 📚 CONCEITO: HTTP Status Codes
// 200 OK          → Sucesso
// 201 Created     → Recurso criado com sucesso
// 400 Bad Request → Erro do cliente (dados inválidos)
// 401 Unauthorized → Não autenticado (sem token)
// 403 Forbidden   → Autenticado mas sem permissão
// 404 Not Found   → Recurso não encontrado
// 409 Conflict    → Conflito (ex: email já cadastrado)
// 422 Unprocessable → Validação falhou
// 500 Internal Server Error → Bug no servidor

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

// Classe customizada para erros operacionais (erros esperados)
// 📚 Diferença entre erros operacionais e de programação:
// - Operacional: "email já existe", "não encontrado" — tratáveis
// - Programação: NullPointerException, tipo errado — bugs reais
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
    // Necessário para instanceof funcionar corretamente com classes que
    // herdam de Error no TypeScript
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log do erro (em produção, enviaria para serviço de monitoramento)
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  // ─── Erros de Validação Zod ──────────────────────────────────────────────
  // Zod é usado para validar os dados de entrada das requisições
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      // Formata os erros do Zod de forma legível
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // ─── Erros do Prisma ────────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = violação de constraint unique (ex: email duplicado)
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ')
      return res.status(409).json({
        error: `${field} já está em uso`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      })
    }

    // P2025 = registro não encontrado (ex: DELETE de ID que não existe)
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro não encontrado',
        code: 'NOT_FOUND',
      })
    }
  }

  // ─── Erros da Aplicação (AppError) ─────────────────────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
  }

  // ─── Erro genérico (bugs reais) ─────────────────────────────────────────
  // Em produção, NUNCA exponha detalhes internos ao cliente!
  return res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Erro interno do servidor'
        : err.message,
    code: 'INTERNAL_SERVER_ERROR',
  })
}
