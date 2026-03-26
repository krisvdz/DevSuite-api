import { Router } from 'express'
import { list, create, getById, update, remove } from '../controllers/project.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import taskRouter from './task.routes'

const router = Router()

// Todas as rotas de projetos são protegidas
// Aplicar authMiddleware uma vez no router protege TODAS as rotas abaixo
router.use(authMiddleware)

router.get('/', list)
router.post('/', create)
router.get('/:id', getById)
router.patch('/:id', update)
router.delete('/:id', remove)

// 📚 CONCEITO: Rotas aninhadas com mergeParams
// Monta o router de tasks dentro do de projects
// mergeParams: true no task router permite acessar :projectId aqui
router.use('/:projectId/tasks', taskRouter)

export default router
