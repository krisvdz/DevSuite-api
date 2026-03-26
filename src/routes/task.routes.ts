import { Router } from 'express'
import { create, update, remove, reorder } from '../controllers/task.controller'

// mergeParams: true permite que este router acesse params do router pai
// Sem isso, req.params.projectId seria undefined
const router = Router({ mergeParams: true })

router.post('/', create)
router.patch('/reorder', reorder)  // antes de /:taskId para não conflitar
router.patch('/:taskId', update)
router.delete('/:taskId', remove)

export default router
