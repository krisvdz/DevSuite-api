// ═══════════════════════════════════════════════════════════════════════════
// ENV — Validação de variáveis de ambiente na inicialização
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Fail Fast
//
// Se uma variável de ambiente obrigatória estiver faltando, é melhor que o
// servidor NÃO inicie do que falhar silenciosamente durante uma requisição.
//
// Sem validação, o app inicia "normal" mas:
// - JWT_SECRET undefined → tokens assinados com "undefined" (inseguro!)
// - DATABASE_URL faltando → erro só quando a primeira query é executada
//
// Com validação na inicialização, o dev recebe feedback imediato sobre
// o que está faltando no .env — economiza tempo de debug.
//
// 📚 CONCEITO: Reutilizando Zod para config
// Zod não é só para validar input de API! Usamos o mesmo pattern para
// garantir que as variáveis de ambiente estão corretas e tipadas.

import { z } from 'zod'

const envSchema = z.object({
  // Servidor
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('4000'),

  // Banco de dados (obrigatórios — sem eles nada funciona)
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL é obrigatória. Veja .env.example para configurar.' })
    .url('DATABASE_URL deve ser uma URL válida'),

  // JWT (obrigatório — sem ele, autenticação fica comprometida)
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET é obrigatória. Gere com: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"' })
    .min(16, 'JWT_SECRET deve ter pelo menos 16 caracteres para segurança'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS (opcional — tem fallback)
  CORS_ORIGIN: z.string().optional(),
})

// Tipo inferido automaticamente — use em vez de process.env para ter autocomplete
export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('\n╔══════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Erro nas variáveis de ambiente                      ║')
    console.error('╠══════════════════════════════════════════════════════════╣')

    for (const issue of result.error.issues) {
      const field = issue.path.join('.')
      console.error(`║  ${field}: ${issue.message}`)
    }

    console.error('║                                                          ║')
    console.error('║  Copie .env.example para .env e preencha os valores.     ║')
    console.error('╚══════════════════════════════════════════════════════════╝\n')

    process.exit(1)
  }

  return result.data
}

export const env = validateEnv()
