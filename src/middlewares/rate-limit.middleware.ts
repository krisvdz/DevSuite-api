// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMIT MIDDLEWARE — Proteção contra brute-force
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Rate Limiting
//
// Rate limiting restringe quantas requisições um cliente pode fazer em um
// período de tempo. É essencial para:
// - Prevenir brute-force em login (tentativas ilimitadas de senha)
// - Prevenir abuso de registro (criação em massa de contas)
// - Proteger contra ataques de denial-of-service (DoS)
//
// Esta implementação usa um Map em memória (simples e sem dependências).
// ⚠️ Em produção com múltiplas instâncias, use Redis para compartilhar
// o estado entre servidores.
//
// 📚 CONCEITO: Sliding Window vs Fixed Window
// - Fixed window: reseta a contagem a cada intervalo fixo (mais simples)
// - Sliding window: considera a janela de tempo relativa (mais preciso)
// Esta implementação usa fixed window por simplicidade.

import { Request, Response, NextFunction } from 'express'

interface RateLimitEntry {
  count: number
  resetAt: number // timestamp em ms
}

interface RateLimitOptions {
  windowMs: number   // janela de tempo em milissegundos
  maxAttempts: number // máximo de requisições por janela
  message?: string    // mensagem de erro customizada
}

// Store global — compartilhado entre todas as instâncias do middleware
// Cada "store" é isolado por um prefixo (ex: "login", "register")
const stores = new Map<string, Map<string, RateLimitEntry>>()

// Limpa entradas expiradas periodicamente para evitar memory leak
const CLEANUP_INTERVAL_MS = 60_000 // 1 minuto

function getOrCreateStore(prefix: string): Map<string, RateLimitEntry> {
  let store = stores.get(prefix)
  if (!store) {
    store = new Map()
    stores.set(prefix, store)

    // Agenda limpeza periódica para este store
    const interval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of store!) {
        if (now >= entry.resetAt) {
          store!.delete(key)
        }
      }
      // Se o store ficou vazio, pode limpar o intervalo
      if (store!.size === 0) {
        clearInterval(interval)
        stores.delete(prefix)
      }
    }, CLEANUP_INTERVAL_MS)

    // Permite que o processo Node.js encerre normalmente
    interval.unref()
  }
  return store
}

function getClientIp(req: Request): string {
  // X-Forwarded-For é definido por proxies/load balancers
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

export function rateLimit(prefix: string, options: RateLimitOptions) {
  const { windowMs, maxAttempts, message } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const store = getOrCreateStore(prefix)
    const clientIp = getClientIp(req)
    const now = Date.now()

    let entry = store.get(clientIp)

    // Se não existe ou a janela expirou, cria/reseta
    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs }
      store.set(clientIp, entry)
      return next()
    }

    entry.count++

    if (entry.count > maxAttempts) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)

      res.set('Retry-After', String(retryAfterSeconds))
      return res.status(429).json({
        error: message || 'Muitas tentativas. Tente novamente mais tarde.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds,
      })
    }

    next()
  }
}
