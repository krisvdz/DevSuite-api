import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import {
  getPortfolio,
  savePortfolio,
  getPrices,
  getNews,
  getAnalysis,
  generateAnalysis,
} from '../controllers/market.controller'

export const marketRoutes = Router()

// All routes require authentication
marketRoutes.use(authMiddleware)

marketRoutes.get('/portfolio', getPortfolio)
marketRoutes.put('/portfolio', savePortfolio)
marketRoutes.get('/prices', getPrices)
marketRoutes.get('/news', getNews)
marketRoutes.get('/analysis', getAnalysis)
marketRoutes.post('/analysis/generate', generateAnalysis)
