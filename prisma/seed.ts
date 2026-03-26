// ═══════════════════════════════════════════════════════════════════════════
// DATABASE SEED — Popula o banco com dados iniciais para desenvolvimento
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CONCEITO: Por que usar seed?
// Em desenvolvimento, você precisa de dados para testar a aplicação.
// O seed é um script que popula o banco com dados "fake" consistentes.
// Diferente de dados de teste (que são efêmeros), seeds são reutilizáveis.
//
// Execute com: npm run db:seed

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Instancia o cliente Prisma diretamente aqui (não usa o singleton da app)
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Limpa dados existentes na ordem correta (respeitando foreign keys)
  // Se tentarmos deletar users antes de tasks, vai dar erro de FK!
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // Hash da senha — NUNCA salve senha em texto puro
  // 10 = número de "salt rounds" (mais alto = mais seguro, mas mais lento)
  const hashedPassword = await bcrypt.hash('senha123', 10)

  // Cria usuário de demonstração
  const user = await prisma.user.create({
    data: {
      email: 'demo@taskflow.com',
      name: 'Demo User',
      password: hashedPassword,
      // Cria projetos e tarefas junto (nested create — recurso poderoso do Prisma!)
      projects: {
        create: [
          {
            name: 'Website Redesign',
            description: 'Redesenho completo do site institucional',
            tasks: {
              create: [
                { title: 'Definir paleta de cores', status: 'DONE', order: 0 },
                { title: 'Criar wireframes', status: 'DONE', order: 1 },
                { title: 'Desenvolver componentes', status: 'IN_PROGRESS', order: 2 },
                { title: 'Testes de usabilidade', status: 'TODO', order: 3 },
                { title: 'Deploy em produção', status: 'TODO', order: 4 },
              ],
            },
          },
          {
            name: 'App Mobile',
            description: 'Desenvolvimento do aplicativo para iOS e Android',
            tasks: {
              create: [
                { title: 'Setup do projeto React Native', status: 'DONE', order: 0 },
                { title: 'Tela de login', status: 'IN_PROGRESS', order: 1 },
                { title: 'Integração com API', status: 'TODO', order: 2 },
              ],
            },
          },
        ],
      },
    },
  })

  console.log(`✅ Usuário criado: ${user.email}`)
  console.log('✅ Projetos e tarefas criados com sucesso!')
  console.log('\n📋 Credenciais para teste:')
  console.log('   Email: demo@taskflow.com')
  console.log('   Senha: senha123')
}

// Executa o seed e trata erros
main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    // SEMPRE feche a conexão ao final
    await prisma.$disconnect()
  })
