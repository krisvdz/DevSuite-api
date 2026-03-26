// ═══════════════════════════════════════════════════════════════════════════
// PROJECT CONTROLLER — CRUD completo de Projetos
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: REST (Representational State Transfer)
//
// REST é um estilo arquitetural para APIs HTTP. Os princípios principais:
//
// 1. Recursos (nouns, não verbs): /projects, /tasks — NÃO /getProjects
// 2. Métodos HTTP para ações:
//    GET    → Leitura (idempotente, sem side effects)
//    POST   → Criação
//    PUT    → Atualização total (substitui o recurso inteiro)
//    PATCH  → Atualização parcial (só os campos enviados)
//    DELETE → Remoção
// 3. Stateless: cada requisição é independente (sem sessão no servidor)
// 4. Respostas padronizadas com status codes corretos
//
// Mapeamento de rotas desta feature:
//   GET    /api/projects         → list (todos os projetos do usuário)
//   POST   /api/projects         → create (novo projeto)
//   GET    /api/projects/:id     → getById (um projeto específico)
//   PATCH  /api/projects/:id     → update (atualiza campos)
//   DELETE /api/projects/:id     → remove (deleta projeto)

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error.middleware'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const createProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})

// ─── Helper: verifica se projeto pertence ao usuário ─────────────────────────
// 📚 CONCEITO: Authorization vs Authentication
// Authentication = "quem é você?" (JWT faz isso)
// Authorization  = "o que você pode fazer?" (isso faz aqui)
// Um usuário autenticado NÃO pode editar projetos de outros usuários!
async function getProjectOrFail(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId, // garante que pertence ao usuário logado
    },
  })

  if (!project) {
    // 404 e não 403: não revelamos se o projeto existe mas pertence a outro usuário
    throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND')
  }

  return project
}

// ─── GET /api/projects ────────────────────────────────────────────────────────
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    // 📚 CONCEITO: Query Params vs Path Params vs Body
    // - Path params: /projects/:id  → identifica um recurso específico
    // - Query params: /projects?page=1&limit=10 → filtra/pagina resultados
    // - Body: dados enviados no corpo (POST, PATCH, PUT)

    // Paginação — sempre implemente em APIs de listagem!
    const page = Number(req.query.page) || 1
    const limit = Math.min(Number(req.query.limit) || 10, 50) // máx 50 por página
    const skip = (page - 1) * limit

    // Executa duas queries em paralelo (mais eficiente que sequencial)
    // 📚 Promise.all: executa promises concorrentemente — se uma falha, todas falham
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        // include: faz JOIN e retorna dados relacionados
        include: {
          _count: {
            select: { tasks: true }, // conta tarefas sem buscar todas
          },
        },
      }),
      prisma.project.count({
        where: { userId: req.userId },
      }),
    ])

    // Resposta com metadados de paginação (boa prática para o frontend)
    res.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── POST /api/projects ───────────────────────────────────────────────────────
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createProjectSchema.parse(req.body)

    const project = await prisma.project.create({
      data: {
        ...data,
        userId: req.userId!, // ! = TypeScript trust (userId sempre existe aqui pois passou pelo auth middleware)
      },
    })

    res.status(201).json(project)
  } catch (error) {
    next(error)
  }
}

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        // Inclui as tarefas ordenadas por campo "order"
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!project) {
      throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND')
    }

    res.json(project)
  } catch (error) {
    next(error)
  }
}

// ─── PATCH /api/projects/:id ──────────────────────────────────────────────────
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    // Verifica ownership antes de atualizar
    await getProjectOrFail(req.params.id, req.userId!)

    const data = updateProjectSchema.parse(req.body)

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
    })

    res.json(project)
  } catch (error) {
    next(error)
  }
}

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await getProjectOrFail(req.params.id, req.userId!)

    await prisma.project.delete({
      where: { id: req.params.id },
      // onDelete: Cascade no schema garante que as tasks também são deletadas
    })

    // 204 No Content — padrão para DELETE bem-sucedido (sem body na resposta)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
