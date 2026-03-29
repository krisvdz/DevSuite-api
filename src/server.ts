// ═══════════════════════════════════════════════════════════════════════════
// SERVER.TS — Inicialização do servidor HTTP
// ═══════════════════════════════════════════════════════════════════════════
//
// Este arquivo é usado apenas em ambientes tradicionais (local, Docker).
// No Vercel (serverless), o servidor HTTP é gerenciado pela plataforma
// e este arquivo não é utilizado — veja api/index.ts.

import app from './app'

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
