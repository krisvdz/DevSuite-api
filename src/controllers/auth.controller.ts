// ═══════════════════════════════════════════════════════════════════════════
// AUTH CONTROLLER — Registro e Login de usuários
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Controller
// No padrão MVC (Model-View-Controller), o Controller é responsável por:
// 1. Receber a requisição HTTP
// 2. Validar os dados de entrada
// 3. Chamar a lógica de negócio (aqui fazemos inline, em apps maiores
//    seria separado em uma camada "Service")
// 4. Retornar a resposta HTTP
//
// O Controller NÃO deve conter lógica de negócio complexa.
// Ele é apenas o "orquestrador" entre a requisição e o banco.

import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { env } from '../lib/env'
import { AppError } from '../middlewares/error.middleware'

// ─── Schemas de Validação (Zod) ─────────────────────────────────────────────
// 📚 CONCEITO: Por que validar inputs?
// Nunca confie em dados que vêm do cliente! Um usuário mal-intencionado
// pode enviar qualquer coisa. Validação garante que os dados estão
// no formato esperado ANTES de chegar no banco.
//
// Zod gera tipos TypeScript automaticamente a partir dos schemas!
// Isso elimina a necessidade de definir tipos separadamente.

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').toLowerCase(), // normaliza para minúsculas
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha muito longa'),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Senha é obrigatória'),
})

// Inferindo tipos TypeScript a partir do schema Zod
type RegisterInput = z.infer<typeof registerSchema>
type LoginInput = z.infer<typeof loginSchema>

// ─── Helper: gerar JWT ────────────────────────────────────────────────────────
function generateToken(userId: string): string {
  return jwt.sign(
    { userId }, // payload
    env.JWT_SECRET, // chave secreta (validada na inicialização)
    {
      expiresIn: env.JWT_EXPIRES_IN, // expiração (ex: "7d", "24h")
      // 📚 Em produção, considere refresh tokens:
      // - access token: curta duração (15min), usado nas requisições
      // - refresh token: longa duração (30d), salvo no banco, usado só para
      //   gerar novos access tokens. Mais seguro pois permite revogação.
    } as jwt.SignOptions
  )
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Valida e tipifica os dados de entrada
    // .parse() lança ZodError se inválido (capturado pelo errorMiddleware)
    const data: RegisterInput = registerSchema.parse(req.body)

    // 2. Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new AppError('Email já cadastrado', 409, 'EMAIL_IN_USE')
    }

    // 3. Hash da senha
    // 📚 CONCEITO: bcrypt
    // bcrypt é um algoritmo de hash projetado para senhas.
    // O "salt" (número 10) define o custo computacional — exponencial!
    // salt=10: ~100ms, salt=12: ~400ms, salt=14: ~1.6s
    // Mais lento = mais difícil de atacar por brute-force.
    // Cada hash gerado é diferente mesmo para a mesma senha (salt aleatório).
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // 4. Cria o usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
      // select: define exatamente quais campos retornar
      // Nunca retorne o campo password para o cliente!
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    // 5. Gera o JWT
    const token = generateToken(user.id)

    // 201 Created — padrão HTTP para criação bem-sucedida de recurso
    res.status(201).json({
      user,
      token,
    })
  } catch (error) {
    // Passa o erro para o errorMiddleware tratar
    next(error)
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data: LoginInput = loginSchema.parse(req.body)

    // 1. Busca usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    // 2. Verifica se usuário existe E se a senha está correta
    // ⚠️ IMPORTANTE: Verificamos senha ANTES de retornar erro de "usuário não encontrado"
    // pois em alguns casos é melhor dar uma mensagem genérica para não revelar
    // se um email está cadastrado (prevenção de user enumeration).
    const passwordMatch = user
      ? await bcrypt.compare(data.password, user.password)
      : false

    if (!user || !passwordMatch) {
      // Mensagem genérica — não revela se o email existe ou não
      throw new AppError('Email ou senha incorretos', 401, 'INVALID_CREDENTIALS')
    }

    // 3. Gera o JWT
    const token = generateToken(user.id)

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (error) {
    next(error)
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Retorna os dados do usuário autenticado (rota protegida)
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    // req.userId foi injetado pelo authMiddleware
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        // Conta quantos projetos o usuário tem (agregação sem buscar todos)
        _count: {
          select: { projects: true },
        },
      },
    })

    if (!user) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
}
