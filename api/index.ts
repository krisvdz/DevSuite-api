// ═══════════════════════════════════════════════════════════════════════════
// API/INDEX.TS — Entry point para Vercel Serverless
// ═══════════════════════════════════════════════════════════════════════════
//
// O Vercel procura um handler exportado como default neste arquivo.
// O Express app funciona diretamente como handler serverless.
// O vercel.json redireciona todas as rotas para cá.

import app from '../src/app'

export default app
