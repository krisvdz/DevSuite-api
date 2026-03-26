// ═══════════════════════════════════════════════════════════════════════════
// TASK CONTROLLER — CRUD de Tarefas dentro de Projetos
// ═══════════════════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error.middleware'

// 📚 CONCEITO: Rotas aninhadas (nested routes)
// Tarefas sempre pertencem a projetos, então faz sentido aninhar:
//   POST   /api/projects/:projectId/tasks
//   PATCH  /api/projects/:projectId/tasks/:taskId
//   DELETE /api/projects/:projectId/tasks/:taskId
//
// Isso é mais RESTful do que /api/tasks?projectId=...
// porque deixa a hierarquia explícita na URL.

const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  order: z.number().int().min(0).default(0),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  order: z.number().int().min(0).optional(),
})

// Valida que o projeto pertence ao usuário (evita acesso cross-user)
async function validateProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  })

  if (!project) {
    throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND')
  }

  return project
}

// ─── POST /api/projects/:projectId/tasks ─────────────────────────────────────
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    await validateProjectOwnership(req.params.projectId, req.userId!)

    const data = createTaskSchema.parse(req.body)

    const task = await prisma.task.create({
      data: {
        ...data,
        projectId: req.params.projectId,
      },
    })

    res.status(201).json(task)
  } catch (error) {
    next(error)
  }
}

// ─── PATCH /api/projects/:projectId/tasks/:taskId ────────────────────────────
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    await validateProjectOwnership(req.params.projectId, req.userId!)

    // Verifica se a task pertence ao projeto
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        projectId: req.params.projectId,
      },
    })

    if (!existingTask) {
      throw new AppError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND')
    }

    const data = updateTaskSchema.parse(req.body)

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data,
    })

    res.json(task)
  } catch (error) {
    next(error)
  }
}

// ─── DELETE /api/projects/:projectId/tasks/:taskId ───────────────────────────
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await validateProjectOwnership(req.params.projectId, req.userId!)

    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        projectId: req.params.projectId,
      },
    })

    if (!existingTask) {
      throw new AppError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND')
    }

    await prisma.task.delete({
      where: { id: req.params.taskId },
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

// ─── PATCH /api/projects/:projectId/tasks/reorder ────────────────────────────
// 📚 CONCEITO: Operação não-CRUD em REST
// Quando a ação não se encaixa em CRUD, use um "sub-recurso" ou "action":
//   PATCH /api/projects/:id/tasks/reorder
// Isso é mais expressivo que PUT /api/tasks/:id com campo order.
export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    await validateProjectOwnership(req.params.projectId, req.userId!)

    // Espera um array com a nova ordem: [{ id, order }, ...]
    const reorderSchema = z.array(
      z.object({
        id: z.string(),
        order: z.number().int().min(0),
      })
    )

    const updates = reorderSchema.parse(req.body)

    // 📚 CONCEITO: Transaction
    // Uma transação garante que TODAS as operações sejam executadas ou
    // NENHUMA (ACID). Se o servidor cair no meio, não ficamos com
    // dados parcialmente atualizados.
    // Use $transaction sempre que precisar de múltiplas writes atômicas!
    await prisma.$transaction(
      updates.map(({ id, order }) =>
        prisma.task.update({
          where: { id, projectId: req.params.projectId },
          data: { order },
        })
      )
    )

    res.json({ message: 'Tarefas reordenadas com sucesso' })
  } catch (error) {
    next(error)
  }
}
