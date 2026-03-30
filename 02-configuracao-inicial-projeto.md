# Configuração Inicial de Projeto — Tudo que um Sênior Faz Antes de Codar

> Guia prático baseado no projeto **TaskFlow** (React + Vite + TypeScript + Node.js + Prisma + PostgreSQL).
> Um dev sênior passa os primeiros dias de qualquer projeto fazendo exatamente isso — não codando features.

---

## Por Que Isso Importa

Configuração inicial parece burocracia. Não é. É o que separa um projeto que dura anos de um que vira caos em meses.

- **ESLint** pega bugs antes de rodar o código
- **Prettier** elimina discussões de estilo nas code reviews
- **Husky + commitlint** garante que o histórico de git é legível
- **TypeScript strict** impede classes inteiras de bugs silenciosos
- **Docker** garante que "funciona na minha máquina" funciona em qualquer máquina
- **CI/CD** garante que código quebrado nunca chega à produção

---

## Índice

1. [Estrutura de Pastas](#1-estrutura-de-pastas)
2. [TypeScript em Profundidade](#2-typescript-em-profundidade)
3. [ESLint — Configuração Completa e Explicada](#3-eslint--configuração-completa-e-explicada)
4. [Prettier — Formatação Automática](#4-prettier--formatação-automática)
5. [Editor — VS Code com Superpoderes](#5-editor--vs-code-com-superpoderes)
6. [Git, Husky e Commits Semânticos](#6-git-husky-e-commits-semânticos)
7. [Variáveis de Ambiente — Da Forma Certa](#7-variáveis-de-ambiente--da-forma-certa)
8. [Aliases de Import](#8-aliases-de-import)
9. [Scripts do package.json](#9-scripts-do-packagejson)
10. [Docker para Desenvolvimento](#10-docker-para-desenvolvimento)
11. [Logging Estruturado](#11-logging-estruturado)
12. [API Documentation com Swagger](#12-api-documentation-com-swagger)
13. [CI/CD com GitHub Actions](#13-cicd-com-github-actions)
14. [Deploy — Da Configuração ao Primeiro Deploy](#14-deploy--da-configuração-ao-primeiro-deploy)
15. [Checklist Completo do Sênior](#15-checklist-completo-do-sênior)

---

## 1. Estrutura de Pastas

A estrutura de pastas comunica as intenções arquiteturais do projeto. Qualquer dev novo deve entender a organização sem perguntar.

### Frontend — taskflow-web

```
taskflow-web/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline de CI
├── .vscode/
│   ├── settings.json           # Configurações compartilhadas do VS Code
│   └── extensions.json         # Extensões recomendadas para o time
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/                 # Componentes genéricos: Button, Input, Modal
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts        # Re-export barrel file
│   │   ├── layout/             # Header, Sidebar, PageWrapper
│   │   └── TaskCard.tsx        # Componente de domínio específico
│   ├── pages/                  # Um arquivo por rota/página
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ProjectPage.tsx
│   ├── hooks/                  # Custom hooks reutilizáveis
│   │   ├── useProjects.ts
│   │   ├── useAuth.ts
│   │   └── useDebounce.ts
│   ├── contexts/               # React Contexts (estado global)
│   │   └── AuthContext.tsx
│   ├── services/               # Camada de comunicação com APIs
│   │   ├── api.ts              # Instância configurada do axios
│   │   ├── auth.service.ts
│   │   └── task.service.ts
│   ├── types/                  # Tipos e interfaces TypeScript
│   │   └── index.ts
│   ├── utils/                  # Funções puras utilitárias
│   │   ├── date.ts
│   │   └── format.ts
│   ├── styles/
│   │   └── global.css
│   ├── App.tsx                 # Rotas + Providers
│   └── main.tsx                # Entry point
├── .env                        # NÃO commitar
├── .env.example                # Commitar — mostra vars necessárias sem valores
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

### Backend — taskflow-api

```
taskflow-api/
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   ├── migrations/             # Histórico de todas as migrações (commitar)
│   ├── schema.prisma           # Definição do banco de dados
│   └── seed.ts                 # Dados iniciais para desenvolvimento
├── src/
│   ├── controllers/            # HTTP In → chama service → HTTP Out
│   │   ├── auth.controller.ts
│   │   ├── task.controller.ts
│   │   └── project.controller.ts
│   ├── services/               # Lógica de negócio (sem HTTP)
│   │   ├── auth.service.ts
│   │   ├── task.service.ts
│   │   └── project.service.ts
│   ├── repositories/           # Acesso a dados (abstrai o Prisma)
│   │   ├── task.repository.ts
│   │   └── user.repository.ts
│   ├── routes/                 # Associa URL + middlewares + controller
│   │   ├── auth.routes.ts
│   │   ├── task.routes.ts
│   │   └── index.ts            # Router raiz
│   ├── middlewares/            # Funções que rodam entre request e controller
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logger.middleware.ts
│   ├── schemas/                # Schemas de validação Zod
│   │   ├── task.schema.ts
│   │   └── auth.schema.ts
│   ├── errors/                 # Classes de erro customizadas
│   │   └── AppError.ts
│   ├── lib/                    # Instâncias de libraries (singleton)
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   └── env.ts              # Validação de variáveis de ambiente
│   ├── types/
│   │   └── express.d.ts        # Augmentação de tipos do Express (req.user)
│   └── app.ts                  # Entry point
├── .env
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Por que `repositories` separado de `services`?**

Services contêm lógica de negócio. Repositories abstraem o acesso a dados. Essa separação permite:
1. Trocar o banco (PostgreSQL → MongoDB) sem tocar no service
2. Testar o service com um repository mockado, sem banco real
3. Reutilizar queries complexas em múltiplos services

```typescript
// Sem repository — service acoplado ao Prisma
export async function getTasksDueToday(userId: string) {
  // Se precisar mudar o banco, muda aqui (junto com a lógica)
  return prisma.task.findMany({ where: { ... } });
}

// Com repository — service desacoplado
// task.repository.ts
export const taskRepo = {
  findDueToday: (userId: string) =>
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { lte: endOfDay(new Date()), gte: startOfDay(new Date()) },
        status: { not: 'DONE' },
      },
    }),
};

// task.service.ts — só lógica de negócio
export async function getTasksDueToday(userId: string) {
  const tasks = await taskRepo.findDueToday(userId);
  // Lógica de negócio: ordenar por prioridade, notificar sobre urgentes...
  return tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
}
```

---

## 2. TypeScript em Profundidade

### 2.1 Por Que Dois tsconfig Diferentes

Frontend e backend têm ambientes radicalmente diferentes:

| | Frontend (Vite) | Backend (Node.js) |
|---|---|---|
| **Módulos** | `"module": "ESNext"` — browsers falam ESM nativo | `"module": "commonjs"` — Node usa require/exports |
| **Quem compila** | Vite (não o tsc) — `"noEmit": true` | tsc — gera `dist/` |
| **DOM** | `"lib": ["DOM"]` — tem window, document | Sem DOM — Node não tem browser |
| **JSX** | `"jsx": "react-jsx"` — transforma JSX | Sem JSX |
| **moduleResolution** | `"bundler"` — modo moderno com Vite | `"node"` — como o Node resolve módulos |

### 2.2 Configuração do Frontend (taskflow-web/tsconfig.json)

```json
{
  "compilerOptions": {
    // ─── Output ─────────────────────────────────────────────────────────────
    "target": "ES2020",          // para qual versão do JS compilar
    "module": "ESNext",          // sistema de módulos (ESM para browsers modernos)
    "lib": ["ES2020", "DOM", "DOM.Iterable"], // APIs disponíveis
    "moduleResolution": "bundler", // como resolver imports (modo moderno)
    "jsx": "react-jsx",          // transforma JSX sem precisar importar React

    // ─── Qualidade (NUNCA remova strict: true) ────────────────────────────
    "strict": true,              // ativa todas as checagens rigorosas
    "noUnusedLocals": true,      // erro se variável declarada mas não usada
    "noUnusedParameters": true,  // erro se parâmetro não usado
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true, // undefined ≠ propriedade ausente

    // ─── Interoperabilidade ───────────────────────────────────────────────
    "esModuleInterop": true,     // permite: import React from 'react'
    "resolveJsonModule": true,   // permite: import data from './data.json'
    "allowImportingTsExtensions": true, // permite import de .ts explícito
    "isolatedModules": true,     // cada arquivo é um módulo independente

    // ─── Build ────────────────────────────────────────────────────────────
    "noEmit": true,              // Vite faz o build, tsc só checa tipos

    // ─── Paths (aliases) ──────────────────────────────────────────────────
    "paths": {
      "@/*": ["./src/*"]         // @/components → src/components
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// tsconfig.node.json — para arquivos de configuração (vite.config.ts)
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 2.3 Configuração do Backend (taskflow-api/tsconfig.json)

```json
{
  "compilerOptions": {
    // ─── Output ───────────────────────────────────────────────────────────
    "target": "ES2022",         // Node 20+ suporta ES2022
    "module": "commonjs",       // Node usa CommonJS (require/exports)
    "lib": ["ES2022"],          // sem DOM
    "outDir": "./dist",         // onde o JS compilado vai
    "rootDir": "./src",         // raiz do código fonte

    // ─── Qualidade ────────────────────────────────────────────────────────
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true, // case-sensitive em Windows/Mac/Linux

    // ─── Interoperabilidade ───────────────────────────────────────────────
    "esModuleInterop": true,    // import express from 'express' (não import * as)
    "moduleResolution": "node", // como Node resolve módulos
    "resolveJsonModule": true,

    // ─── Debug ────────────────────────────────────────────────────────────
    "sourceMap": true,          // mapeia JS compilado → TS original (para debugging)
    "noEmitOnError": true,      // não gera dist/ se houver erros de tipo

    // ─── Paths ────────────────────────────────────────────────────────────
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4 Augmentação de Tipos do Express

Por padrão, `req.user` não existe no tipo `Request` do Express. Precisamos adicionar:

```typescript
// src/types/express.d.ts
import { User } from '@prisma/client';

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

### 2.5 Tipos Utilitários — O que Todo Dev TS Deve Conhecer

```typescript
// Partial<T> — todas as propriedades se tornam opcionais
type UpdateTask = Partial<Task>; // para endpoints PATCH

// Required<T> — todas as propriedades se tornam obrigatórias
type FullUser = Required<User>;

// Pick<T, K> — seleciona apenas algumas propriedades
type TaskSummary = Pick<Task, 'id' | 'title' | 'status'>;

// Omit<T, K> — remove algumas propriedades
type CreateTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

// Record<K, V> — objeto com chaves K e valores V
type TaskByStatus = Record<TaskStatus, Task[]>;

// ReturnType<T> — tipo de retorno de uma função
type QueryResult = ReturnType<typeof prisma.task.findMany>;

// Awaited<T> — resolve tipo de uma Promise
type Tasks = Awaited<ReturnType<typeof getProjectTasks>>;
```

---

## 3. ESLint — Configuração Completa e Explicada

**O que é:** Analisador estático de código. Encontra bugs, padrões ruins e inconsistências antes de rodar o código. É diferente do TypeScript — TS verifica tipos, ESLint verifica padrões de código.

### 3.1 Frontend — `.eslintrc.cjs` completo

```javascript
// taskflow-web/.eslintrc.cjs
// Nota: .cjs porque o package.json tem "type": "module"
module.exports = {
  root: true, // não procura config em pastas pai

  env: {
    browser: true, // globals do browser: window, document, fetch
    es2022: true,  // sintaxe moderna: optional chaining, nullish coalescing
  },

  // Parser TypeScript — entende sintaxe TS
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'], // necessário para regras com type information
    tsconfigRootDir: __dirname,
  },

  plugins: [
    '@typescript-eslint',
    'react-hooks',
  ],

  extends: [
    'eslint:recommended',                            // regras básicas ESLint
    'plugin:@typescript-eslint/recommended',         // regras TypeScript básicas
    'plugin:@typescript-eslint/recommended-requiring-type-checking', // regras com type info
    'plugin:react-hooks/recommended',                // regras de hooks React
    'prettier',                                      // SEMPRE por último — desativa regras de formatação
  ],

  rules: {
    // ─── TypeScript ──────────────────────────────────────────────────────
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',    // _param = "sei que não uso, é proposital"
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],

    '@typescript-eslint/no-explicit-any': 'warn',
    // 'warn' em vez de 'error' porque às vezes any é necessário

    '@typescript-eslint/no-floating-promises': 'error',
    // Toda Promise deve ser awaited ou ter .catch()
    // Evita bugs silenciosos onde erros assíncronos são perdidos

    '@typescript-eslint/no-misused-promises': 'error',
    // Evita usar async onde não é esperado (ex: event handlers sem await)

    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports', // import type { User } em vez de import { User }
      // Melhor performance: type imports são removidos no build
    }],

    '@typescript-eslint/no-non-null-assertion': 'warn',
    // Avisa sobre uso de ! (non-null assertion): user!.email
    // Prefira if (user) ou optional chaining user?.email

    // ─── React Hooks ──────────────────────────────────────────────────────
    'react-hooks/rules-of-hooks': 'error',
    // Hooks só dentro de componentes React ou custom hooks
    // Nunca dentro de condicionais, loops ou funções normais

    'react-hooks/exhaustive-deps': 'warn',
    // Deps do useEffect/useMemo/useCallback devem estar completas
    // Warning para casos legítimos de override

    // ─── Qualidade geral ──────────────────────────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // console.log em produção é sinal de código de debug esquecido

    'prefer-const': 'error',
    // Se não reatribui, use const. Comunica intenção.

    'no-var': 'error',
    // Nunca use var — use const ou let

    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    // Sempre === em vez de == (evita coerção implícita de tipo)

    'no-throw-literal': 'error',
    // throw new Error('msg') em vez de throw 'msg'

    'prefer-template': 'error',
    // Template literals em vez de concatenação: `${name}` vs name + ''
  },

  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.config.js',
    '*.config.ts',
  ],
};
```

### 3.2 Backend — `.eslintrc.cjs` completo

```javascript
// taskflow-api/.eslintrc.cjs
module.exports = {
  root: true,

  env: {
    node: true,    // globals do Node: process, __dirname, Buffer
    es2022: true,
  },

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
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    // No backend, console.info é aceitável para logs de startup
    // Em produção, use Pino em vez de console

    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
  },

  ignorePatterns: ['dist/', 'node_modules/'],
};
```

### 3.3 Instalando as Dependências do ESLint

```bash
# Frontend
cd taskflow-web
npm install -D \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react-hooks \
  eslint-config-prettier

# Backend
cd taskflow-api
npm install -D \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-config-prettier
```

---

## 4. Prettier — Formatação Automática

### Por Que Usar

Sem Prettier, code reviews se tornam discussões sobre estilo. Com Prettier, você nunca mais discute aspas simples vs duplas. O código é formatado automaticamente ao salvar.

**Regra de ouro:** ESLint para qualidade de código, Prettier para estilo/formatação. Nunca misture os dois (por isso o `eslint-config-prettier` no final do extends).

### `.prettierrc` — mesma config para front e back

```json
{
  "semi": true,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**O que cada opção faz:**
- `"semi": true` — ponto-e-vírgula no final das linhas
- `"singleQuote": true` — aspas simples em JS/TS (mas não em JSX)
- `"trailingComma": "es5"` — vírgula após último item de arrays/objetos (facilita diffs no git)
- `"printWidth": 100` — quebra linha após 100 chars (80 é muito restrito)
- `"endOfLine": "lf"` — Unix line endings (evita problemas entre Windows e Mac)

### `.prettierignore`

```
node_modules/
dist/
build/
.next/
coverage/
*.min.js
*.min.css
package-lock.json
```

### Instalação

```bash
npm install -D prettier
```

---

## 5. Editor — VS Code com Superpoderes

### `.vscode/settings.json` — compartilhado com o time

```json
{
  // ─── Formatação ────────────────────────────────────────────────────────
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // ─── ESLint ───────────────────────────────────────────────────────────
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"  // aplica ESLint auto-fix ao salvar
  },
  "eslint.validate": ["typescript", "typescriptreact"],

  // ─── TypeScript ───────────────────────────────────────────────────────
  "typescript.tsdk": "node_modules/typescript/lib", // usa TS do projeto, não do VS Code
  "typescript.preferences.importModuleSpecifier": "non-relative", // usa paths/@

  // ─── Tailwind ─────────────────────────────────────────────────────────
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],

  // ─── Prisma ───────────────────────────────────────────────────────────
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma",
    "editor.formatOnSave": true
  },

  // ─── Git ──────────────────────────────────────────────────────────────
  "git.enableSmartCommit": false,
  "gitlens.currentLine.enabled": true,

  // ─── Geral ────────────────────────────────────────────────────────────
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active"
}
```

### `.vscode/extensions.json` — extensões recomendadas

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",       // Prettier
    "dbaeumer.vscode-eslint",       // ESLint
    "prisma.prisma",                // Syntax Prisma schema
    "bradlc.vscode-tailwindcss",    // Autocomplete Tailwind
    "eamodio.gitlens",              // Git superpowers
    "christian-kohler.path-intellisense", // Autocomplete de paths
    "formulahendry.auto-rename-tag",     // Renomeia tag HTML de abertura/fechamento juntos
    "aaron-bond.better-comments",        // Coloriza comentários por tipo
    "usernamehw.errorlens",              // Mostra erros inline
    "antfu.goto-alias",                  // Navega com aliases @/
    "streetsidesoftware.code-spell-checker" // Spell check em código
  ]
}
```

---

## 6. Git, Husky e Commits Semânticos

### 6.1 `.gitignore` Completo

```gitignore
# ─── Dependências ────────────────────────────────────────────────────────
node_modules/
.pnp
.pnp.js

# ─── Build ───────────────────────────────────────────────────────────────
dist/
build/
.next/
out/

# ─── Variáveis de ambiente (CRÍTICO — nunca comite!) ─────────────────────
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
# .env.example NÃO está aqui — deve ser commitado

# ─── Logs ────────────────────────────────────────────────────────────────
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# ─── Sistema operacional ─────────────────────────────────────────────────
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# ─── IDE ─────────────────────────────────────────────────────────────────
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
# .vscode/ NÃO está aqui — settings e extensions são compartilhados!

# ─── Testing ─────────────────────────────────────────────────────────────
coverage/
.nyc_output

# ─── Misc ────────────────────────────────────────────────────────────────
*.local
.cache/
```

### 6.2 Husky + lint-staged — Lint Automático no Commit

Husky é um gerenciador de git hooks. lint-staged roda scripts apenas nos arquivos que estão sendo commitados (não no projeto inteiro — muito mais rápido).

```bash
npm install -D husky lint-staged
npx husky init
```

**`package.json` — adicionar configuração do lint-staged:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,css,html}": [
      "prettier --write"
    ]
  }
}
```

**`.husky/pre-commit`:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

**O que isso faz:** Antes de cada `git commit`, roda eslint + prettier nos arquivos staged. Se houver erro de ESLint que não pode ser corrigido automaticamente, o commit é bloqueado.

### 6.3 Commitlint — Commits Semânticos Obrigatórios

Commits semânticos fazem o histórico do git legível. Ferramentas como `conventional-changelog` geram changelogs automaticamente a partir deles.

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

**`commitlint.config.cjs`:**
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Tipos permitidos
    'type-enum': [2, 'always', [
      'feat',     // nova feature
      'fix',      // correção de bug
      'docs',     // documentação
      'style',    // formatação (sem mudança de lógica)
      'refactor', // refatoração (sem nova feature ou fix)
      'perf',     // melhoria de performance
      'test',     // adição/correção de testes
      'chore',    // manutenção (deps, config)
      'ci',       // mudanças no CI/CD
      'revert',   // reverter commit
    ]],

    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'subject-empty': [2, 'never'],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

**`.husky/commit-msg`:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

**Exemplos de commits:**
```bash
# ✅ Válidos
git commit -m "feat: adiciona filtro de tasks por status"
git commit -m "fix: corrige erro de validação no formulário de login"
git commit -m "docs: atualiza README com instruções de setup"
git commit -m "chore: atualiza dependências para versões mais recentes"
git commit -m "refactor: extrai lógica de auth para serviço separado"
git commit -m "test: adiciona testes de integração para endpoint de tasks"

# ❌ Inválidos — serão bloqueados
git commit -m "arrumei bug"
git commit -m "WIP"
git commit -m "changes"
```

### 6.4 Branch Strategy — Git Flow Simplificado

```
main          → produção. Só aceita merge de PRs com CI verde
develop       → staging. Features mergeadas aqui antes de ir para main
feature/*     → desenvolvimento de cada feature
hotfix/*      → correção urgente que vai direto para main
```

```bash
# Workflow típico
git checkout develop
git pull origin develop
git checkout -b feature/task-comments  # nome descritivo

# ... desenvolve ...

git add .
git commit -m "feat: adiciona endpoint de comentários em tasks"
git push origin feature/task-comments

# Abre PR no GitHub: feature/task-comments → develop
# PR passa no CI → code review → merge
```

---

## 7. Variáveis de Ambiente — Da Forma Certa

### 7.1 As Regras Fundamentais

1. **Nunca comite `.env`** — está no `.gitignore`
2. **Sempre comite `.env.example`** — documenta as variáveis sem expor valores
3. **Valide no startup** — a app deve falhar imediatamente se var obrigatória faltar
4. **Separe por ambiente** — valores diferentes para dev/staging/production
5. **Não guarde segredos em variáveis genéricas** — `SECRET=abc123` é ruim, `JWT_SECRET=abc123` é rastreável

### 7.2 Frontend — Vite

```bash
# taskflow-web/.env
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=TaskFlow
VITE_ENABLE_DEVTOOLS=true

# taskflow-web/.env.example
VITE_API_URL=
VITE_APP_NAME=
VITE_ENABLE_DEVTOOLS=
```

**Regra do Vite:** Toda variável exposta ao browser **deve** começar com `VITE_`. Variáveis sem esse prefixo são ignoradas. Isso é segurança: evita expor acidentalmente variáveis sensíveis ao browser.

```typescript
// src/lib/env.ts — acesso tipado às vars de ambiente
const env = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  appName: import.meta.env.VITE_APP_NAME as string,
  enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
};

export default env;
```

### 7.3 Backend — Validação com Zod (taskflow-api/src/lib/env.ts)

```typescript
import { z } from 'zod';
import 'dotenv/config'; // carrega o .env antes de qualquer coisa

const envSchema = z.object({
  // Ambiente
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  // z.coerce.number() converte string '4000' para number 4000

  // Banco de dados
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis (opcional — só necessário com filas/cache)
  REDIS_URL: z.string().url().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Email (opcional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@taskflow.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Variáveis de ambiente inválidas ou ausentes:');
  const errors = parsed.error.flatten().fieldErrors;

  Object.entries(errors).forEach(([field, messages]) => {
    console.error(`  ${field}: ${messages?.join(', ')}`);
  });

  console.error('\nCopie .env.example para .env e preencha os valores.\n');
  process.exit(1); // falha rápido — melhor do que falhar silenciosamente em runtime
}

export const env = parsed.data;

// Tipos inferidos automaticamente pelo TypeScript!
// env.PORT é number, env.NODE_ENV é 'development' | 'test' | 'production'
```

```bash
# taskflow-api/.env.example — documente todas as variáveis
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://taskflow:taskflow_pass@localhost:5432/taskflow_dev
JWT_SECRET=gere-com-openssl-rand-base64-32
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=outro-secret-diferente-aqui
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173
RESEND_API_KEY=
EMAIL_FROM=noreply@taskflow.com
```

---

## 8. Aliases de Import

Evite caminhos relativos profundos. São frágeis (quebram se você mover um arquivo) e difíceis de ler.

```typescript
// ❌ Sem alias — frágil e ilegível
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import type { Task } from '../../../types';

// ✅ Com alias — robusto e legível
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/types';
```

### Frontend — Vite + TypeScript

**`vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // npm install -D @types/node

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**`tsconfig.json` (já tínhamos, mas reforçando):**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Backend — TypeScript + tsconfig-paths

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Para funcionar em runtime com `tsx` (desenvolvimento):
```bash
# tsx já suporta paths nativo — sem configuração extra
npm run dev  # tsx watch src/app.ts

# Para o build compilado (produção com Node):
npm install -D tsconfig-paths
```

```json
// package.json
{
  "scripts": {
    "start": "node -r tsconfig-paths/register dist/app.js"
  }
}
```

---

## 9. Scripts do package.json

Scripts bem definidos são documentação executável. Qualquer dev deve entender o projeto só lendo o package.json.

### Frontend — taskflow-web/package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",

    "lint": "eslint src --ext ts,tsx --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",

    "format": "prettier --write 'src/**/*.{ts,tsx,css,json}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,css,json}'",

    "type-check": "tsc --noEmit",

    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",

    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  }
}
```

### Backend — taskflow-api/package.json

```json
{
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "start:prod": "node -r tsconfig-paths/register dist/app.js",

    "lint": "eslint src --ext .ts --max-warnings 0",
    "lint:fix": "eslint src --ext .ts --fix",

    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",

    "type-check": "tsc --noEmit",

    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",

    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force",
    "db:push": "prisma db push"
  }
}
```

**Por que `--max-warnings 0`?** Avisos hoje se tornam problemas amanhã. Trate avisos como erros para manter o código limpo ao longo do tempo.

**Por que `tsc --noEmit && vite build` no frontend?** O Vite não verifica tipos — ele só transpila. Então precisamos do `tsc --noEmit` antes para garantir zero erros de TypeScript no build de produção.

---

## 10. Docker para Desenvolvimento

### Por Que Docker em Dev

Sem Docker, cada dev precisa instalar e configurar manualmente PostgreSQL, Redis, etc. na versão certa. Com Docker, um `docker compose up -d` resolve tudo.

### `docker-compose.yml` — dependências de desenvolvimento

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine  # alpine = imagem menor
    container_name: taskflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: taskflow_pass
      POSTGRES_DB: taskflow_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # O volume persiste dados entre restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskflow -d taskflow_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: taskflow-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes  # persistência
    volumes:
      - redis_data:/data

  # Opcional: Mailhog para interceptar emails em dev
  mailhog:
    image: mailhog/mailhog
    container_name: taskflow-mail
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # UI Web — acesse http://localhost:8025

volumes:
  postgres_data:
  redis_data:
```

```bash
# Comandos essenciais
docker compose up -d          # sobe tudo em background
docker compose ps             # ver status
docker compose logs postgres  # ver logs do postgres
docker compose stop           # para sem apagar dados
docker compose down -v        # para e apaga todos os dados (recomeçar do zero)
```

### `Dockerfile` — para produção (multi-stage)

```dockerfile
# ── Stage 1: Dependências ──────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci                    # instala todas as deps (dev + prod)

# ── Stage 2: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build             # compila TypeScript → dist/

# ── Stage 3: Production ───────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Apenas o build compilado
COPY --from=builder /app/dist ./dist

# Não rode como root — boa prática de segurança
USER node

EXPOSE 4000

# Inicia com migrations (garante banco atualizado)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
```

**.dockerignore** — o que não copiar para dentro da imagem:
```
node_modules/
dist/
.env
.env.*
!.env.example
.git/
.gitignore
README.md
coverage/
```

---

## 11. Logging Estruturado

### Por que não usar `console.log` em produção

`console.log` é string pura. Impossível filtrar, buscar ou alertar automaticamente.
Pino gera JSON estruturado — ferramentas como Datadog/Grafana/ELK indexam automaticamente.

```bash
# Dev: string bonitinha no terminal
# Prod: JSON para ser indexado por ferramentas de observabilidade

npm install pino pino-http
npm install -D pino-pretty
```

```typescript
// src/lib/logger.ts
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined, // produção = JSON puro
  base: {
    env: env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});
```

```typescript
// src/middlewares/logger.middleware.ts
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

export const httpLogger = pinoHttp({
  logger,
  customLogLevel(req, res, err) {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Não loga health checks — muito verboso
  autoLogging: { ignore: (req) => req.url === '/health' },
});
```

```typescript
// Uso nos controllers/services
import { logger } from '@/lib/logger';

// ✅ Logs com contexto — filtrável e pesquisável
logger.info({ userId, taskId, projectId }, 'Task created successfully');
logger.warn({ userId, attemptedProjectId }, 'Unauthorized access attempt');
logger.error({ error: err.message, stack: err.stack, userId }, 'Payment processing failed');

// ❌ Logs sem contexto — inúteis em produção
console.log('task created'); // não diz QUAL task, de QUAL usuário
```

---

## 12. API Documentation com Swagger

Documentação de API é o contrato entre frontend e backend. Com Swagger UI, o frontend testa endpoints diretamente no browser.

```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

```typescript
// src/lib/swagger.ts
import swaggerJsDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description: 'API de gerenciamento de tasks e projetos',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // onde ficam os comentários JSDoc
});
```

```typescript
// src/app.ts — adicionar rota do swagger
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './lib/swagger';

// Swagger UI disponível em http://localhost:4000/api/docs
if (env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
```

```typescript
// src/routes/task.routes.ts — documentar com JSDoc
/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Lista tasks do usuário
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, REVIEW, DONE]
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Lista de tasks com paginação
 *       401:
 *         description: Token inválido ou ausente
 */
router.get('/', authMiddleware, taskController.list);
```

---

## 13. CI/CD com GitHub Actions

### Frontend CI

```yaml
# taskflow-web/.github/workflows/ci.yml
name: CI — Frontend

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    name: Type Check, Lint & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci
        # ci é determinístico — usa exatamente o package-lock.json

      - name: Type check
        run: npm run type-check
        # Garante zero erros de TypeScript

      - name: Lint
        run: npm run lint
        # Garante zero erros e avisos de ESLint

      - name: Build
        run: npm run build
        # Garante que o build de produção funciona

      - name: Run tests
        run: npm test
```

### Backend CI com banco de dados real

```yaml
# taskflow-api/.github/workflows/ci.yml
name: CI — Backend

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Test, Lint & Build
    runs-on: ubuntu-latest

    services:
      postgres:                              # banco real para testes de integração
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: taskflow_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:                                     # variáveis de ambiente para CI
      NODE_ENV: test
      DATABASE_URL: postgresql://test:test@localhost:5432/taskflow_test
      JWT_SECRET: test-secret-for-ci-at-least-32-characters-long
      JWT_REFRESH_SECRET: test-refresh-secret-for-ci-32-chars-min

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build
```

---

## 14. Deploy — Da Configuração ao Primeiro Deploy

### Railway (recomendado para começar)

Railway é o jeito mais fácil de fazer deploy de apps Node.js + PostgreSQL + Redis.

```bash
# 1. Instalar CLI do Railway
npm install -g @railway/cli

# 2. Login
railway login

# 3. Inicializar projeto (dentro da pasta taskflow-api)
railway init

# 4. Adicionar banco PostgreSQL
railway add --plugin postgresql

# 5. Adicionar Redis
railway add --plugin redis

# 6. Configurar variáveis de ambiente
railway vars set JWT_SECRET=$(openssl rand -base64 32)
railway vars set JWT_REFRESH_SECRET=$(openssl rand -base64 32)
railway vars set NODE_ENV=production
railway vars set CORS_ORIGIN=https://taskflow.vercel.app

# 7. Deploy
railway up
```

**`railway.json` — configuração do build:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Vercel para o Frontend

```bash
# 1. Instalar CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Configurar variáveis de ambiente
vercel env add VITE_API_URL production
# Digita: https://seu-app.railway.app/api
```

**`vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

O `rewrites` é necessário para SPAs: quando o usuário acessa `/projects/123` diretamente, o Vercel precisa servir o `index.html` (e o React Router cuida do roteamento).

### Health Check — Essencial para Deploy

```typescript
// src/app.ts
app.get('/health', async (req, res) => {
  // Verifica se o banco está acessível
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Database connection failed',
    });
  }
});
```

---

## 15. Checklist Completo do Sênior

### Antes de Codar — Setup (Dia 1)

**TypeScript**
- [ ] `strict: true` em ambos tsconfigs
- [ ] `noEmit: true` no frontend (Vite faz o build)
- [ ] `module: commonjs` no backend, `module: ESNext` no frontend
- [ ] `src/types/express.d.ts` com augmentação de `req.user`

**ESLint + Prettier**
- [ ] `.eslintrc.cjs` criado em ambos os projetos
- [ ] Prettier instalado e `.prettierrc` criado
- [ ] `eslint-config-prettier` no final do `extends` (sem conflito)
- [ ] `.eslintignore` / `ignorePatterns` configurado

**Editor**
- [ ] `.vscode/settings.json` com `formatOnSave: true`
- [ ] `.vscode/extensions.json` com extensões recomendadas
- [ ] VS Code usa TypeScript do projeto (`typescript.tsdk`)

**Git**
- [ ] `.gitignore` cobrindo `node_modules/`, `dist/`, `.env`
- [ ] Husky instalado e hooks criados
- [ ] lint-staged configurado no `package.json`
- [ ] Commitlint configurado (`commitlint.config.cjs`)

**Variáveis de Ambiente**
- [ ] `.env` no `.gitignore`
- [ ] `.env.example` commitado com todas as vars
- [ ] Backend valida vars com Zod no startup (`src/lib/env.ts`)
- [ ] Frontend acessa via `import.meta.env.VITE_*`

**Estrutura**
- [ ] `src/types/index.ts` com tipos compartilhados
- [ ] `src/errors/AppError.ts` com erros customizados
- [ ] `src/middlewares/error.middleware.ts` handler global
- [ ] `src/lib/logger.ts` com Pino
- [ ] Alias `@/*` → `src/*` configurado em tsconfig + vite.config

**Scripts**
- [ ] `dev`, `build`, `start` funcionando
- [ ] `lint`, `lint:fix` funcionando com `--max-warnings 0`
- [ ] `format`, `format:check` funcionando
- [ ] `type-check` funcionando
- [ ] Scripts de banco: `db:migrate`, `db:studio`, `db:seed`

**Docker**
- [ ] `docker-compose.yml` com PostgreSQL + Redis + healthchecks
- [ ] `Dockerfile` multi-stage para produção
- [ ] `.dockerignore` configurado

**CI/CD**
- [ ] GitHub Actions rodando em PR para `main` e `develop`
- [ ] CI executa: type-check → lint → test → build
- [ ] Segredos sensíveis em GitHub Secrets (não no código)

**API**
- [ ] Endpoint `GET /health` implementado
- [ ] Swagger/OpenAPI configurado (não em produção)
- [ ] Validação com Zod em todos os endpoints

**README**
- [ ] Pré-requisitos (Node version, Docker)
- [ ] Como rodar localmente (passo a passo)
- [ ] Variáveis necessárias (referência ao `.env.example`)
- [ ] Scripts disponíveis e o que fazem
- [ ] Como contribuir (branch strategy, commit pattern)

---

## Sequência de Setup — Do Zero ao Pronto

```bash
# ── BACKEND ────────────────────────────────────────────────────────────────

# 1. Inicializar projeto
mkdir taskflow-api && cd taskflow-api
npm init -y
npm install express cors helmet dotenv bcryptjs jsonwebtoken zod @prisma/client pino pino-http
npm install -D typescript tsx @types/node @types/express @types/cors @types/bcryptjs \
             @types/jsonwebtoken prisma eslint @typescript-eslint/parser \
             @typescript-eslint/eslint-plugin prettier eslint-config-prettier \
             husky lint-staged @commitlint/cli @commitlint/config-conventional vitest

# 2. Configurar TypeScript
npx tsc --init  # depois editar com as configs deste guia

# 3. Configurar Prisma
npx prisma init --datasource-provider postgresql

# 4. Configurar ESLint, Prettier, Husky (criar os arquivos deste guia)

# 5. Inicializar Git + Husky
git init
npx husky init

# 6. Subir banco com Docker
docker compose up -d

# 7. Primeira migração
npx prisma migrate dev --name init

# 8. Seed inicial
npm run db:seed

# 9. Testar
npm run dev  # deve subir em :4000

# ── FRONTEND ───────────────────────────────────────────────────────────────

# 1. Criar projeto com Vite
npm create vite@latest taskflow-web -- --template react-ts
cd taskflow-web
npm install

# 2. Instalar dependências principais
npm install @tanstack/react-query @tanstack/react-query-devtools axios \
            react-router-dom react-hook-form @hookform/resolvers zod \
            react-hot-toast lucide-react

# 3. Instalar Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Instalar dev tools
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
             eslint-plugin-react-hooks prettier eslint-config-prettier \
             husky lint-staged @commitlint/cli @commitlint/config-conventional

# 5. Configurar todos os arquivos deste guia

# 6. Inicializar Git + Husky
git init
npx husky init

# 7. Testar
npm run dev  # deve subir em :5173
npm run lint
npm run type-check
```

---

*A configuração inicial toma 1-2 dias. O retorno desse investimento é meses sem problemas de qualidade, onboarding de novos devs em horas em vez de dias, e a segurança de que código quebrado nunca vai para produção.*
