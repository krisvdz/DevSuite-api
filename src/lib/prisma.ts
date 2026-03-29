// ═══════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT — Singleton pattern para conexão com o banco
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Por que Singleton?
//
// Em Node.js, cada vez que você faz `new PrismaClient()`, ele cria um
// novo connection pool (grupo de conexões com o banco).
// Em desenvolvimento com hot-reload (tsx watch), o módulo é recarregado
// constantemente, o que criaria MILHARES de conexões e esgotaria o banco!
//
// A solução: guardar a instância em `globalThis` (objeto global do Node).
// Assim, mesmo com recarregamentos, reutilizamos a mesma instância.
//
// Em produção isso não é necessário (processo Node roda uma vez),
// mas não causa problemas.
//
// 📚 CONCEITO: Connection Pool
// Abrir/fechar conexões com banco é caro (handshake TCP, autenticação...).
// Um connection pool mantém N conexões abertas e reutiliza-as entre requests.
// O Prisma gerencia isso automaticamente para você.

import { PrismaClient } from '@prisma/client'
import { env } from './env'

// TypeScript precisa saber sobre nossa propriedade customizada no globalThis
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Em desenvolvimento, loga todas as queries executadas no terminal
    // Útil para debugar, mas desative em produção (verboso e lento)
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
