# Setup Inicial de Projeto — O Que um Sênior Faz Antes de Codar

> Guia prático baseado no **DevSuite** (React + Vite + TypeScript + Node.js + Prisma).
> Um dev sênior passa os primeiros dias de qualquer projeto configurando isso — não codando features.

---

## Por Que Isso Importa

Configuração inicial parece burocracia. Não é. É o que separa um projeto que dura anos de um que vira caos em meses.

- **TypeScript strict** impede classes inteiras de bugs silenciosos
- **ESLint** pega bugs antes de rodar o código
- **Prettier** elimina discussões de estilo nas code reviews
- **Husky + commitlint** garante que o histórico de git é legível
- **Docker** garante que "funciona na minha máquina" funciona em qualquer máquina

---

## Índice

1. [Estrutura de Pastas](#1-estrutura-de-pastas)
2. [TypeScript em Profundidade](#2-typescript-em-profundidade)
3. [ESLint + Prettier](#3-eslint--prettier)
4. [VS Code com Superpoderes](#4-vs-code-com-superpoderes)
5. [Git, Husky e Commits Semânticos](#5-git-husky-e-commits-semânticos)
6. [Variáveis de Ambiente — Da Forma Certa](#6-variáveis-de-ambiente--da-forma-certa)
7. [Aliases de Import](#7-aliases-de-import)
8. [Scripts do package.json](#8-scripts-do-packagejson)
9. [Docker para Desenvolvimento Local](#9-docker-para-desenvolvimento-local)
10. [Logging Estruturado](#10-logging-estruturado)
11. [Checklist do Sênior](#11-checklist-do-sênior)

---

## 1. Estrutura de Pastas

A estrutura comunica as intenções arquiteturais. Qualquer dev novo deve entender o projeto sem perguntar.

### DevSuite-web (Frontend)

```
DevSuite-web/
├── .vscode/
│   ├── settings.json           # Configurações compartilhadas do VS Code
│   └── extensions.json         # Extensões recomendadas
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/                 # Componentes genéricos: Button, Input, Modal
│   │   └── layout/             # AppLayout, Sidebar
│   ├── pages/                  # Um arquivo por rota
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProjectPage.tsx
│   │   ├── DevPulsePage.tsx
│   │   └── FocusTimerPage.tsx
│   ├── hooks/                  # Custom hooks reutilizáveis
│   │   └── useAuth.ts
│   ├── contexts/               # Estado global via React Context
│   │   └── AuthContext.tsx
│   ├── services/               # Comunicação com a API
│   │   └── api.ts              # Instância Axios + interceptors
│   ├── types/                  # Tipos e interfaces TypeScript
│   │   └── index.ts
│   ├── styles/
│   │   └── global.css
│   ├── App.tsx                 # Rotas + Providers
│   └── main.tsx                # Entry point
├── .env                        # NÃO commitar
├── .env.example                # Commitar sem valores reais
├── vercel.json                 # Config de deploy (SPA rewrites)
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### DevSuite-api (Backend)

```
DevSuite-api/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline de CI
├── api/
│   └── index.ts                # Entry point para Vercel serverless
├── prisma/
│   ├── migrations/             # Histórico de migrações (commitar)
│   └── schema.prisma           # Definição do banco de dados
├── src/
│   ├── controllers/            # HTTP In → lógica → HTTP Out
│   │   ├── auth.controller.ts
│   │   ├── project.controller.ts
│   │   ├── task.controller.ts
│   │   └── focus.controller.ts
│   ├── routes/                 # URL + middlewares + controller
│   │   ├── auth.routes.ts
│   │   ├── project.routes.ts
│   │   └── focus.routes.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── lib/                    # Instâncias singleton (evita múltiplas conexões)
│   │   ├── prisma.ts           # PrismaClient singleton
│   │   └── env.ts              # Validação de variáveis de ambiente
│   ├── types/
│   │   └── express.d.ts        # Augmentação: req.user
│   ├── app.ts                  # Configuração do Express
│   └── server.ts               # app.listen() — só usado localmente
├── .env                        # NÃO commitar
├── .env.example                # Commitar sem valores
├── vercel.json                 # Config de deploy (serverless functions)
├── Dockerfile                  # Build de produção
├── docker-compose.yml          # PostgreSQL local para dev
├── tsconfig.json
└── package.json
```

**Por que `lib/prisma.ts` como singleton?**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Singleton — evita múltiplas conexões ao banco
// Em serverless: cada invocação pode criar uma nova instância
// Global previne isso em desenvolvimento com hot reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 2. TypeScript em Profundidade

### 2.1 Por Que Dois tsconfig Diferentes

Frontend e backend têm ambientes radicalmente diferentes:

| | Frontend (Vite) | Backend (Node.js) |
|---|---|---|
| **Módulos** | `"module": "ESNext"` — ESM nativo | `"module": "commonjs"` — require/exports |
| **Quem compila** | Vite (tsc só checa tipos) | tsc gera `dist/` |
| **APIs disponíveis** | `"lib": ["DOM"]` — window, document | Sem DOM |
| **JSX** | `"jsx": "react-jsx"` | Sem JSX |

### 2.2 Frontend — tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",

    "strict": true,              // NUNCA remova — pega bugs silenciosos
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,              // Vite faz o build, tsc só checa tipos

    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

### 2.3 Backend — tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,

    "esModuleInterop": true,
    "moduleResolution": "node",
    "sourceMap": true,           // mapeia JS compilado → TS original (debug)
    "noEmitOnError": true,       // não gera dist/ se houver erros

    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4 Augmentação de Tipos do Express

`req.user` não existe no tipo padrão do Express. Adicionamos:

```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {}; // necessário para ser tratado como módulo
```

### 2.5 Tipos Utilitários Essenciais

```typescript
type UpdateTask = Partial<Task>;                    // todas as props opcionais (PATCH)
type TaskSummary = Pick<Task, 'id' | 'title' | 'status'>; // só algumas props
type CreateTask = Omit<Task, 'id' | 'createdAt'>;  // remove props geradas pelo banco
type TaskByStatus = Record<TaskStatus, Task[]>;     // { TODO: [], IN_PROGRESS: [], DONE: [] }
```

---

## 3. ESLint + Prettier

ESLint encontra bugs e padrões ruins. Prettier formata. São complementares — nunca conflitem configurando `eslint-config-prettier` por último.

### 3.1 Frontend — .eslintrc.cjs

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react-hooks/recommended',
    'prettier', // SEMPRE por último — desativa regras de formatação
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'error', // toda Promise deve ser awaited
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
```

### 3.2 Backend — .eslintrc.cjs

```javascript
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'prefer-const': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
```

### 3.3 Prettier — .prettierrc

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Por que Prettier?** Elimina discussões de style nas code reviews. O time nunca mais debate "ponto e vírgula ou não?" — o Prettier decide e formata automaticamente ao salvar.

---

## 4. VS Code com Superpoderes

### 4.1 .vscode/settings.json (compartilhado com o time)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.tabSize": 2,
  "files.eol": "\n",
  "editor.rulers": [100]
}
```

**Por que `typescript.tsdk`?** Garante que o VS Code usa a versão do TypeScript do projeto, não a versão global. Todos do time usam a mesma versão.

### 4.2 .vscode/extensions.json

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "ms-azuretools.vscode-docker"
  ]
}
```

---

## 5. Git, Husky e Commits Semânticos

### 5.1 Por Que Commits Semânticos

```
feat: adiciona sistema de focus timer
fix: corrige reordenação de tasks em drag-and-drop
chore: atualiza dependências
docs: adiciona guia de contribuição
refactor: extrai lógica de auth para AuthContext
```

Benefícios:
- CHANGELOG gerado automaticamente
- Fácil entender o histórico sem ler o diff
- Facilita encontrar onde um bug foi introduzido

### 5.2 Configuração Completa

```bash
# Instalar dependências
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# Inicializar Husky
npx husky init
```

**`.husky/pre-commit`** — roda antes de todo commit:
```bash
#!/usr/bin/env sh
npx lint-staged
```

**`.husky/commit-msg`** — valida a mensagem do commit:
```bash
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```

**`commitlint.config.cjs`:**
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // nova funcionalidade
      'fix',      // correção de bug
      'chore',    // manutenção (deps, configs)
      'docs',     // documentação
      'refactor', // refatoração sem mudança de comportamento
      'test',     // adição/correção de testes
      'style',    // formatação, sem mudança de lógica
      'perf',     // melhoria de performance
    ]],
    'subject-max-length': [2, 'always', 72],
  },
};
```

**`package.json` — lint-staged:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 5.3 Estratégia de Branches

```
main       → produção. Só via PR com CI verde
develop    → staging/integração. Features vão aqui primeiro
feature/*  → desenvolvimento de cada feature
hotfix/*   → correção urgente que vai direto para main
```

---

## 6. Variáveis de Ambiente — Da Forma Certa

### 6.1 As Regras

1. **Nunca comite `.env`** — sempre no `.gitignore`
2. **Sempre comite `.env.example`** — documenta as variáveis sem valores
3. **Valide no startup** — falhe rápido se var obrigatória faltar
4. **Valores diferentes por ambiente** — dev local ≠ produção

### 6.2 Frontend — Vite (DevSuite-web/.env.example)

```bash
# Vite expõe ao browser SÓ variáveis com prefixo VITE_
# NUNCA coloque segredos aqui — o frontend é público!
VITE_API_URL=        # URL da API (vazio = usa proxy do Vite em dev)
VITE_APP_ENV=development
```

```typescript
// Acesso tipado no código
const API_URL = import.meta.env.VITE_API_URL as string;
// Diferente do backend: não usa process.env, usa import.meta.env
```

### 6.3 Backend — Validação com Zod (DevSuite-api/src/lib/env.ts)

```typescript
import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Neon PostgreSQL — duas URLs (ver arquivo 03 para entender por quê)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(), // obrigatória para Prisma Migrate

  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Variáveis de ambiente inválidas:\n');
  console.error(parsed.error.flatten().fieldErrors);
  console.error('\nCopie .env.example para .env e preencha os valores.\n');
  process.exit(1); // falha rápido — melhor que falhar silenciosamente em runtime
}

export const env = parsed.data;
// Tipos inferidos automaticamente: env.PORT é number, não string
```

### 6.4 DevSuite-api/.env.example

```bash
NODE_ENV=development
PORT=4000

# Neon Tech — PostgreSQL serverless
# Pooled: para queries em runtime (via PgBouncer)
DATABASE_URL="postgresql://USER:PASSWORD@ep-XXXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
# Direct: obrigatória para Prisma Migrate
DIRECT_URL="postgresql://USER:PASSWORD@ep-XXXX.REGION.aws.neon.tech/neondb?sslmode=require"

JWT_SECRET="gere-com: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
JWT_EXPIRES_IN="7d"

CORS_ORIGIN="http://localhost:5173"
```

---

## 7. Aliases de Import

Evite caminhos relativos profundos — são frágeis e difíceis de ler:

```typescript
// ❌ Sem alias — quebra se você mover o arquivo
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';

// ✅ Com alias — limpo e robusto
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
```

### Frontend — vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

Mais o `paths` no `tsconfig.json` (já mostrado na seção 2).

### Backend — tsx já suporta paths nativamente

```json
// tsconfig.json — paths configurados
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

Para o build compilado (Node.js):
```json
{
  "scripts": {
    "start": "node -r tsconfig-paths/register dist/server.js"
  }
}
```

---

## 8. Scripts do package.json

Scripts bem definidos são documentação executável.

### DevSuite-web

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx,css,json}'",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### DevSuite-api

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts --max-warnings 0",
    "format": "prettier --write 'src/**/*.ts'",
    "type-check": "tsc --noEmit",
    "test": "vitest run",

    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:push": "prisma db push"
  }
}
```

**Por que `tsc --noEmit && vite build` no frontend?** O Vite não verifica tipos — só transpila. O `tsc --noEmit` garante zero erros TypeScript antes de criar o build de produção.

**Por que `--max-warnings 0`?** Avisos de hoje se tornam problemas de amanhã. Trate avisos como erros.

---

## 9. Docker para Desenvolvimento Local

### Por Que Docker em Dev

Sem Docker, cada dev precisa instalar e configurar PostgreSQL localmente (versão certa, usuário, senha...). Com Docker, um comando resolve tudo.

### docker-compose.yml — DevSuite-api

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: devsuite-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: devsuite
      POSTGRES_PASSWORD: devsuite_pass
      POSTGRES_DB: devsuite_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devsuite"]
      interval: 5s
      retries: 5

volumes:
  postgres_data:
```

```bash
# Iniciar banco em background
docker compose up -d

# Ver logs
docker compose logs -f postgres

# Parar tudo
docker compose down

# Parar e apagar volumes (reset do banco)
docker compose down -v
```

### Dockerfile — Build de Produção (Multi-stage)

```dockerfile
# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Produção — só o necessário
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER node           # nunca rode como root em produção
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

**Por que multi-stage?** A imagem final não inclui TypeScript, código-fonte, testes, devDependencies. Fica ~150MB vs ~600MB em stage único — menor e mais segura.

> **Nota:** No DevSuite, o backend é deployado no Vercel como serverless functions (não Docker). O Dockerfile é útil para rodar localmente de forma idêntica à produção, ou para migrar para outra plataforma futuramente.

---

## 10. Logging Estruturado

`console.log` em produção é problemático: sem contexto, sem nível, difícil de pesquisar. Use Pino:

```typescript
// src/lib/logger.ts
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }  // output legível em dev
    : undefined,                  // JSON puro em produção (para agregadores como Datadog)
});

// Uso — sempre com contexto
logger.info({ userId: user.id, projectId }, 'Project created');
logger.error({ error: err.message, stack: err.stack }, 'Failed to create task');
```

**Por que JSON em produção?** Plataformas como Vercel, Datadog, CloudWatch ingerem logs em JSON e permitem busca por campos específicos: `userId:abc123 AND level:error`.

---

## 11. Checklist do Sênior

### Dia 1 — Setup Básico

**TypeScript**
- [ ] `strict: true` em ambos os tsconfigs
- [ ] `noEmit: true` no frontend (Vite faz o build)
- [ ] `module: commonjs` no backend, `module: ESNext` no frontend
- [ ] `src/types/express.d.ts` com augmentação de `req.user`

**ESLint + Prettier**
- [ ] `.eslintrc.cjs` em ambos os projetos
- [ ] `.prettierrc` criado
- [ ] `eslint-config-prettier` no final do `extends`

**Editor**
- [ ] `.vscode/settings.json` com `formatOnSave: true`
- [ ] `.vscode/extensions.json` com extensões recomendadas
- [ ] `typescript.tsdk` apontando para o TypeScript do projeto

**Git**
- [ ] `.gitignore` cobrindo `node_modules/`, `dist/`, `.env`
- [ ] Husky instalado com hooks `pre-commit` e `commit-msg`
- [ ] `lint-staged` configurado no `package.json`
- [ ] `commitlint.config.cjs` configurado

### Dia 1-2 — Infra e Ambiente

**Variáveis de Ambiente**
- [ ] `.env` no `.gitignore`
- [ ] `.env.example` commitado com todas as vars documentadas
- [ ] Backend valida vars com Zod no startup (`src/lib/env.ts`)
- [ ] Frontend usa `import.meta.env.VITE_*`

**Banco de Dados**
- [ ] `docker-compose.yml` com PostgreSQL para dev local
- [ ] `prisma/schema.prisma` com models e relações corretas
- [ ] `prisma generate` rodando sem erros
- [ ] Primeira migration criada

**Desenvolvimento**
- [ ] `npm run dev` funciona em ambos os projetos
- [ ] `npm run lint` passa sem warnings
- [ ] `npm run type-check` passa sem erros
- [ ] `npm run build` funciona em ambos

### Antes do Deploy

- [ ] Variáveis de ambiente configuradas na plataforma (Vercel)
- [ ] `DATABASE_URL` e `DIRECT_URL` do Neon configuradas
- [ ] `JWT_SECRET` gerado com entropia suficiente (min 64 chars hex)
- [ ] `CORS_ORIGIN` aponta para a URL do frontend em produção
- [ ] Health check `/health` retorna 200
- [ ] Migrations aplicadas no banco de produção
