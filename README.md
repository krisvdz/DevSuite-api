# DevSuite — API

> Backend REST da suite de produtividade para desenvolvedores. Autenticação JWT, gerenciamento de projetos/tarefas Kanban e histórico de sessões Pomodoro.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat&logo=postgresql)

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Linguagem | TypeScript 5 (strict) |
| ORM | Prisma 5 |
| Banco de Dados | PostgreSQL (Neon Tech serverless) |
| Autenticação | JWT (jsonwebtoken) + bcryptjs |
| Validação | Zod |
| Variáveis de Ambiente | dotenv |

---

## Endpoints da API

### Autenticação
```
POST /api/auth/register    Criar conta
POST /api/auth/login       Login → retorna JWT
GET  /api/auth/me          Dados do usuário autenticado
```

### Projetos *(requer JWT)*
```
GET    /api/projects              Listar projetos do usuário (paginado)
POST   /api/projects              Criar projeto
GET    /api/projects/:id          Buscar projeto com tarefas
PATCH  /api/projects/:id          Atualizar projeto
DELETE /api/projects/:id          Deletar projeto (cascade tarefas)
```

### Tarefas *(requer JWT)*
```
POST   /api/projects/:id/tasks           Criar tarefa
PATCH  /api/projects/:id/tasks/:taskId   Atualizar tarefa (título, status, ordem)
DELETE /api/projects/:id/tasks/:taskId   Deletar tarefa
PATCH  /api/projects/:id/tasks/reorder   Reordenar tarefas (drag-and-drop)
```

### Focus Timer *(requer JWT)*
```
POST /api/focus-sessions          Salvar sessão concluída
GET  /api/focus-sessions/stats    Estatísticas: hoje + últimos 7 dias
```

---

## Modelos do Banco de Dados

```prisma
model User {
  id             String         @id @default(cuid())
  name           String
  email          String         @unique
  password       String
  projects       Project[]
  focusSessions  FocusSession[]
  createdAt      DateTime       @default(now())
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  tasks       Task[]
  userId      String
  user        User     @relation(...)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  order       Int        @default(0)
  projectId   String
  project     Project    @relation(...)
}

model FocusSession {
  id          String      @id @default(cuid())
  duration    Int         # segundos
  type        SessionType @default(WORK)
  label       String?
  completedAt DateTime    @default(now())
  userId      String
}

enum TaskStatus  { TODO  IN_PROGRESS  DONE }
enum SessionType { WORK  SHORT_BREAK  LONG_BREAK }
```

---

## Configuração do Banco — Neon Tech

O projeto usa **Neon Tech** (PostgreSQL serverless) com PgBouncer. O Prisma requer **duas URLs** quando há connection pooler:

```env
# Variável usada nas queries em runtime (vai pelo PgBouncer)
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.neon.tech/neondb?sslmode=require"

# Variável usada pelo Prisma Migrate (conexão direta, sem pooler)
# DDL commands (CREATE TABLE, ALTER...) precisam de sessão persistente
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
```

> **Por que duas URLs?** O PgBouncer opera em modo *transaction pooling* — ele fecha a conexão após cada transação. O `prisma migrate` usa `SET search_path` e outras instruções de sessão que não funcionam nesse modo. A `DIRECT_URL` bypassa o pooler para as migrations.

Copie o `.env.example` e preencha com suas credenciais do [Neon Console](https://console.neon.tech).

---

## Rodando o Projeto

### Pré-requisitos
- Node.js 18+
- Conta no [Neon Tech](https://neon.tech) (gratuito)

### Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Preencha DATABASE_URL, DIRECT_URL e JWT_SECRET no .env

# Rodar migrations no banco
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate
```

### Desenvolvimento

```bash
npm run dev
# Servidor em http://localhost:3001
```

### Build de Produção

```bash
npm run build
npm start
```

---

## Estrutura do Projeto

```
src/
├── routes/
│   ├── auth.routes.ts        # Register, Login, Me
│   ├── project.routes.ts     # CRUD de projetos
│   ├── task.routes.ts        # CRUD de tarefas + reorder
│   └── focus.routes.ts       # Salvar sessão + stats
├── middlewares/
│   ├── auth.middleware.ts    # Verificação e decode do JWT
│   └── error.middleware.ts   # Handler global de erros
└── app.ts                    # Express app (middlewares + rotas)
prisma/
├── schema.prisma             # Modelos e relações
└── migrations/               # SQL gerado pelo Prisma Migrate
```

---

## Conceitos Abordados no Código

O projeto é intencionalmente comentado para fins de aprendizado:

- **JWT Flow**: geração no login, verificação em middleware, decode nos handlers
- **Prisma ORM**: relações, `include`, `select`, transactions, `@@index` para performance
- **Zod**: validação de body com schemas tipados, erros formatados
- **Middleware pattern**: `authenticate` → handler protegido
- **Error handling global**: `errorMiddleware` captura exceções de toda a app
- **CORS**: configuração para permitir o frontend em desenvolvimento e produção
- **Neon + PgBouncer**: duas URLs, `directUrl` no schema para migrations

---

## Scripts Disponíveis

```bash
npm run dev          # ts-node-dev com hot reload
npm run build        # Compilação TypeScript → dist/
npm start            # Roda o build compilado
npm run lint         # ESLint
```

---

> Projeto criado para estudo de desenvolvimento fullstack moderno.
> Em breve renomeado para **DevSuite API** no GitHub.
