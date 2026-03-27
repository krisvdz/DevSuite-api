// ═══════════════════════════════════════════════════════════════════════════
// APP.TS — Ponto de entrada do servidor Express
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Separação entre app e server
//
// É boa prática separar:
// - app.ts: configuração do Express (middlewares, rotas)
// - server.ts ou index.ts: inicialização do servidor HTTP (listen)
//
// Isso facilita testes (você pode importar a app sem iniciar o servidor)
// e é o padrão em projetos profissionais.

import 'dotenv/config'  // Carrega variáveis de ambiente do arquivo .env
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.routes'
import projectRouter from './routes/project.routes'
import { focusRoutes } from './routes/focus.routes'
import { errorMiddleware } from './middlewares/error.middleware'

const app = express()

// ─── Middlewares Globais ──────────────────────────────────────────────────────
// Middlewares globais são executados em TODAS as requisições, na ordem definida

// 📚 CONCEITO: CORS (Cross-Origin Resource Sharing)
// Browsers bloqueiam requisições entre origens diferentes por segurança
// (ex: frontend em localhost:3000 tentando acessar API em localhost:4000).
// CORS é um mecanismo que permite ao servidor autorizar origens específicas.
//
// ⚠️ cors() sem configuração permite QUALQUER origem — ok em dev, perigoso em prod!
// Em produção, especifique as origens permitidas.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true, // permite enviar cookies (útil para auth mais avançada)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// 📚 CONCEITO: express.json()
// Por padrão, o Express não sabe ler JSON no body das requisições.
// Este middleware parseia o body e disponibiliza em req.body.
// Limite de 10mb — protege contra ataques de payload gigante.
app.use(express.json({ limit: '10mb' }))

// 📚 CONCEITO: express.urlencoded()
// Parseia dados enviados via formulário HTML (Content-Type: application/x-www-form-urlencoded)
// Útil para formulários tradicionais, menos comum em APIs modernas
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ─────────────────────────────────────────────────────────────
// 📚 CONCEITO: Health Check
// Todo serviço em produção deve ter um endpoint de health check.
// É usado por load balancers, Kubernetes, e ferramentas de monitoramento
// para saber se o serviço está "vivo" e pronto para receber tráfego.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
})

// ─── Rotas ─────────────────────────────────────────────────────────────────────
// 📚 CONCEITO: Versionamento de API
// /api/v1/ permite lançar breaking changes em /api/v2/ sem quebrar clientes
// que ainda usam a v1. Boa prática desde o início!
app.use('/api/auth', authRouter)
app.use('/api/projects', projectRouter)
app.use('/api/focus-sessions', focusRoutes)

// ─── 404 Handler ──────────────────────────────────────────────────────────────
// Captura requisições para rotas que não existem
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Rota ${req.method} ${req.originalUrl} não encontrada`,
    code: 'ROUTE_NOT_FOUND',
  })
})

// ─── Error Middleware ─────────────────────────────────────────────────────────
// DEVE ser o ÚLTIMO middleware registrado
// O Express identifica error middlewares pelos 4 parâmetros (err, req, res, next)
app.use(errorMiddleware)

// ─── Inicialização do Servidor ────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       🚀 TaskFlow API iniciada!          ║
  ╠══════════════════════════════════════════╣
  ║  Ambiente: ${(process.env.NODE_ENV || 'development').padEnd(29)}║
  ║  Porta:    ${String(PORT).padEnd(29)}║
  ║  Health:   http://localhost:${PORT}/health  ║
  ╚══════════════════════════════════════════╝
  `)
})

export default app
