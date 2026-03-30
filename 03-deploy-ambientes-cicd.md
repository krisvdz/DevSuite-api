# Deploy, Ambientes e CI/CD — Como o Código Chega em Produção

> Como o DevSuite sai da sua máquina e chega para os usuários.
> Stack: **Vercel** (frontend + API serverless) + **Neon** (PostgreSQL) + **GitHub Actions** (CI).

---

## Índice

1. [Ambientes — Por Que Existem](#1-ambientes--por-que-existem)
2. [Variáveis de Ambiente por Plataforma](#2-variáveis-de-ambiente-por-plataforma)
3. [Neon — PostgreSQL Serverless na Nuvem](#3-neon--postgresql-serverless-na-nuvem)
4. [Vercel para o Frontend](#4-vercel-para-o-frontend)
5. [Vercel para a API (Serverless Functions)](#5-vercel-para-a-api-serverless-functions)
6. [CI/CD com GitHub Actions](#6-cicd-com-github-actions)
7. [Fluxo Completo de um Deploy](#7-fluxo-completo-de-um-deploy)
8. [Health Checks e Monitoramento](#8-health-checks-e-monitoramento)

---

## 1. Ambientes — Por Que Existem

Todo projeto sério tem pelo menos dois ambientes separados:

| Ambiente | Propósito | Trigger | Banco |
|---|---|---|---|
| **Development** | Desenvolvimento local | `npm run dev` | Docker local ou Neon dev |
| **Production** | Usuários reais | Push na `main` | Neon production |

Idealmente há também **Staging** (cópia da produção para testar antes de ir ao ar), mas para projetos menores development + production já é suficiente.

**Regras importantes:**
- Nunca teste diretamente em produção — um bug pode afetar usuários reais
- Nunca use dados reais de produção em desenvolvimento (privacidade)
- Produção e desenvolvimento têm variáveis de ambiente diferentes

---

## 2. Variáveis de Ambiente por Plataforma

As mesmas variáveis existem em cada ambiente com valores diferentes.

### Visão geral de todas as variáveis do DevSuite

```
VARIÁVEL          DEV LOCAL             PRODUÇÃO (Vercel)
────────────────  ────────────────────  ──────────────────────────────────
NODE_ENV          development           production
PORT              4000                  (não usado — Vercel gerencia)
DATABASE_URL      postgresql://...      postgresql://...neon.tech (pooled)
DIRECT_URL        postgresql://...      postgresql://...neon.tech (direct)
JWT_SECRET        qualquer string       string aleatória longa (64+ chars hex)
JWT_EXPIRES_IN    7d                    7d
CORS_ORIGIN       http://localhost:5173 https://devsuite.vercel.app
VITE_API_URL      (vazio/proxy)         https://devsuite-api.vercel.app
```

### Onde configurar cada uma

**Desenvolvimento local:** arquivo `.env` na raiz do projeto (nunca commitado).

**Produção no Vercel:** Painel do Vercel → Settings → Environment Variables.
Cada projeto Vercel (frontend e API) tem suas próprias variáveis configuradas separadamente.

### A regra do prefixo VITE_

```
Backend (Node.js):     usa process.env.JWT_SECRET
Frontend (Vite):       usa import.meta.env.VITE_API_URL

REGRA: Variáveis que vão para o browser PRECISAM do prefixo VITE_
       Variáveis SEM prefixo VITE_ são ignoradas pelo Vite — proteção automática
       contra expor segredos acidentalmente no código frontend.
```

**Nunca coloque no frontend:**
- `JWT_SECRET` — segredo do servidor
- `DATABASE_URL` — credenciais do banco
- Qualquer chave privada de API

---

## 3. Neon — PostgreSQL Serverless na Nuvem

### O que é Neon

Neon é um serviço de PostgreSQL gerenciado com uma diferença: escala para zero quando não há uso (sem cobrança de servidor ocioso). Funciona como um PostgreSQL normal, mas a infraestrutura é gerenciada.

**Por que Neon no DevSuite:**
- Gratuito para projetos pequenos
- Deploy instantâneo (sem configurar servidor)
- Integra nativamente com Vercel
- Suporta branches de banco de dados (útil para staging)

### Por Que Duas URLs (DATABASE_URL e DIRECT_URL)

Esta é uma das partes mais confusas de usar Neon com Prisma.

```
Neon usa PgBouncer como connection pooler em modo "transaction pooling".

Transaction pooling:
  - Cada TRANSAÇÃO pode ir para um servidor diferente
  - Excelente para performance: muitas conexões simultâneas sem sobrecarregar o banco
  - ✅ Para queries normais (SELECT, INSERT, UPDATE, DELETE)
  - ❌ Para comandos de sessão (SET, PREPARE, advisory locks)

O Prisma Migrate precisa de uma SESSÃO persistente para:
  - CREATE TABLE, ALTER TABLE, DROP TABLE (DDL)
  - Controle de migrations
  → Por isso precisa da conexão DIRETA (sem pooler)
```

```bash
# DATABASE_URL → hostname com "-pooler" → PgBouncer → para queries em runtime
DATABASE_URL="postgresql://USER:PASS@ep-XXXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
#                                           ↑ tem "-pooler"

# DIRECT_URL → hostname sem "-pooler" → conexão direta → para Prisma Migrate
DIRECT_URL="postgresql://USER:PASS@ep-XXXX.REGION.aws.neon.tech/neondb?sslmode=require"
#                                     ↑ sem "-pooler"
```

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // runtime: usa pooler
  directUrl = env("DIRECT_URL")     // migrations: usa conexão direta
}
```

### Como encontrar as URLs no Neon

```
1. Acesse https://console.neon.tech
2. Selecione seu projeto
3. Clique em "Connection string"
4. Copie a "Pooled connection" → DATABASE_URL
5. Copie a "Direct connection" → DIRECT_URL
```

### Rodando Migrations com Neon

```bash
# Em desenvolvimento local (usa DIRECT_URL automaticamente)
npx prisma migrate dev --name nome_da_migration

# Em produção — DEVE usar DIRECT_URL
# Vercel roda automaticamente durante o deploy se configurado
npx prisma migrate deploy
```

---

## 4. Vercel para o Frontend

### Como Funciona o Deploy de SPA

O DevSuite Web é uma Single Page Application (SPA): há apenas um arquivo HTML (`index.html`) e o React Router cuida de toda a navegação no browser.

**O problema:** quando um usuário acessa `devsuite.vercel.app/app/tasks` diretamente, o servidor tenta encontrar o arquivo `/app/tasks/index.html` — que não existe! Só existe o `index.html` na raiz.

**A solução:** redirecionar tudo para `index.html` e deixar o React Router decidir o que mostrar.

### vercel.json do Frontend

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

Isso diz ao Vercel: "qualquer URL que chegar, sirva o `index.html`". O React Router recebe a URL e renderiza o componente correto.

### Variáveis de Ambiente no Frontend (Vercel)

```
Vercel → Settings → Environment Variables

VITE_API_URL = https://devsuite-api.vercel.app
VITE_APP_ENV = production
```

**Atenção:** variáveis com prefixo `VITE_` são injetadas no build em tempo de build, não em runtime. Isso significa que depois de fazer o build, os valores estão "congelados" no JavaScript gerado. Se mudar o valor no Vercel, precisa refazer o deploy para ter efeito.

### Deploy Manual via CLI

```bash
npm install -g vercel
vercel login

# Dentro de DevSuite-web/
vercel --prod     # deploy para produção
vercel            # deploy para preview (URL temporária)
```

### Deploy Automático (recomendado)

Conecte o repositório GitHub ao Vercel:
1. Vercel Dashboard → New Project → Import Git Repository
2. Configure as variáveis de ambiente
3. A cada push na `main`: Vercel faz o build e deploy automaticamente

---

## 5. Vercel para a API (Serverless Functions)

### O que é Serverless

Em um servidor tradicional (Railway, Render, VPS):
```
Servidor ligado 24/7 → aguarda requisições → processa → responde
Custo: você paga o servidor mesmo sem uso
```

Em serverless (Vercel):
```
Requisição chega → Vercel cria uma instância do código → processa → responde → destrói
Custo: você paga só pelo tempo de execução
```

**Vantagens:** escala automaticamente, sem gerenciar servidores, custo baseado em uso.
**Desvantagens:** cold start, limite de tempo de execução, sem estado em memória entre requisições.

### Como o Express vira Serverless no Vercel

O Express normalmente escuta em uma porta (`app.listen(4000)`). No Vercel, não há porta — a plataforma gerencia o servidor HTTP e passa as requisições para um handler.

```typescript
// api/index.ts — entry point para o Vercel
import app from '../src/app'; // importa o Express app configurado

export default app; // Vercel importa isso e gerencia o servidor HTTP
```

O `src/app.ts` exporta o `app` sem chamar `app.listen()`. O `src/server.ts` (que chama `app.listen()`) só é usado localmente.

### vercel.json da API

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ]
}
```

Isso diz ao Vercel:
1. Compile o `api/index.ts` como uma Node.js serverless function
2. Roteie todas as requisições para ele

### Cold Start — O Principal Trade-off

```
Requisição numa função "fria" (não usada há um tempo):
1. Vercel cria um novo container
2. Carrega o Node.js
3. Importa os módulos (Express, Prisma...)
4. Executa a requisição
→ Tempo total: 500ms - 2s

Requisição numa função "quente" (recém usada):
1. Container já está rodando
→ Tempo total: 10-50ms
```

**Para o DevSuite:** cold starts são aceitáveis. Aplica principal para APIs de baixo tráfego. Mitigação: Vercel tem warm-up automático em planos pagos.

### Limitações de Serverless que Importam

```
❌ Sem WebSockets (conexão persistente)
❌ Sem estado em memória entre requisições (sem variáveis globais persistentes)
✅ Prisma funciona normalmente
✅ JWT funciona normalmente
✅ Todas as operações de banco funcionam
```

**Conexões de banco no serverless:** Cada invocação serverless pode abrir uma nova conexão ao banco. Por isso usamos o `DATABASE_URL` com PgBouncer (connection pooler do Neon) — ele reutiliza conexões e evita sobrecarregar o banco.

### Variáveis de Ambiente na API (Vercel)

```
Vercel → Settings do projeto DevSuite-api → Environment Variables

DATABASE_URL = postgresql://...neon.tech (pooled)
DIRECT_URL   = postgresql://...neon.tech (direct)
JWT_SECRET   = [string aleatória longa gerada com crypto]
JWT_EXPIRES_IN = 7d
CORS_ORIGIN  = https://devsuite.vercel.app
NODE_ENV     = production
```

---

## 6. CI/CD com GitHub Actions

### O Que é CI/CD

**CI (Continuous Integration):** A cada push, garante automaticamente que o código compila, passa no lint e nos testes. Detecta problemas antes de chegar em produção.

**CD (Continuous Deployment):** Se o CI passou, faz o deploy automaticamente. No DevSuite com Vercel, o CD é automático por integração nativa.

### Anatomia de um Workflow

```yaml
# .github/workflows/ci.yml

name: CI — API                # nome exibido no GitHub

on:                            # quando disparar
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:                          # grupos de steps (podem rodar em paralelo)
  quality-check:
    runs-on: ubuntu-latest     # máquina virtual Linux gratuita

    steps:                     # executados em sequência
      - uses: actions/checkout@v4     # clona o repositório
      - uses: actions/setup-node@v4  # instala Node.js
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci                  # instala dependências
      - run: npx prisma generate     # gera Prisma Client
      - run: npx tsc --noEmit        # type check
      - run: npm run lint            # lint
      - run: npm test                # testes

  build:
    needs: quality-check       # só roda se quality-check passar
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run build           # compila TypeScript
```

### Segredos no GitHub Actions

Credenciais nunca vão no código — ficam nos Secrets do repositório:

```
GitHub Repo → Settings → Secrets and variables → Actions

JWT_SECRET      = [seu secret de produção]
DATABASE_URL    = [URL do Neon]
```

No workflow:
```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Integração Vercel + GitHub Actions

Quando conecta o repositório ao Vercel:
- **Push na `main`** → Vercel faz build + deploy em produção automaticamente
- **Push em outras branches** → Vercel cria um "Preview Deployment" (URL temporária)
- **Pull Request** → Vercel comenta no PR com o link do preview

O GitHub Actions cuida da qualidade (lint, testes, type-check). O Vercel cuida do deploy.

---

## 7. Fluxo Completo de um Deploy

Da mudança no código ao usuário ver a nova versão:

```
1. DESENVOLVIMENTO LOCAL
   ├── git checkout -b feature/nova-feature
   ├── npm run dev (frontend + backend rodando localmente)
   ├── [desenvolve e testa localmente]
   └── git commit -m "feat: adiciona nova feature"

2. CODE REVIEW
   ├── git push origin feature/nova-feature
   ├── Abre Pull Request no GitHub
   ├── GitHub Actions CI roda automaticamente:
   │     ├── npm ci
   │     ├── prisma generate
   │     ├── tsc --noEmit
   │     ├── npm run lint
   │     └── npm test
   ├── Vercel cria Preview Deploy (URL temporária para testar)
   └── Code review aprovado → merge na main

3. DEPLOY AUTOMÁTICO
   ├── Push na main → Vercel inicia o deploy
   ├── Vercel instala dependências (npm ci)
   ├── Vercel compila o código
   ├── Para o frontend: npm run build → dist/ publicado
   ├── Para a API: tsc → serverless function publicada
   └── ✅ Nova versão em produção (em ~1-2 minutos)

4. MIGRAÇÕES DE BANCO (quando há mudanças no schema)
   ├── Roda ANTES do deploy (ou como parte do processo)
   ├── npx prisma migrate deploy (usa DIRECT_URL)
   └── Banco atualizado com o novo schema
```

### Ordem Correta ao Atualizar o Schema

**SEMPRE aplique a migration antes de fazer o deploy do código novo:**

```bash
# 1. Aplicar migration em produção primeiro
DATABASE_URL=<direct-url> npx prisma migrate deploy

# 2. Deploy do código que usa o novo schema
git push origin main → Vercel deploy automático
```

Se inverter a ordem (código novo sem migration), o código vai tentar acessar colunas que não existem ainda — causando erros em produção.

---

## 8. Health Checks e Monitoramento

### O Endpoint /health

```typescript
// src/app.ts — DevSuite
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});
```

**Por que existe:** plataformas de deploy verificam esse endpoint para saber se a aplicação está saudável. Se retornar erro, a plataforma pode reiniciar o container ou não rotear tráfego para ele.

Acesse: `https://devsuite-api.vercel.app/health`

### Logs no Vercel

O Vercel captura tudo que é enviado para `stdout` e `stderr`:

```typescript
// Aparece nos logs do Vercel
console.log('Informação'); // nível: log
console.error('Erro crítico'); // nível: error
```

Para ver logs:
```
Vercel Dashboard → seu projeto → Deployments → [deployment] → Functions → View Logs
```

Em produção: logs em tempo real ficam disponíveis por 1 hora. Para histórico maior, configure um serviço externo como Axiom (tem integração nativa com Vercel).

### O Que Monitorar

```
Taxa de erro (5xx):  meta < 1% das requisições
Latência (p95):      meta < 500ms para a maioria das rotas
Disponibilidade:     Vercel garante 99.99% de uptime no CDN

Para o banco Neon:
  Conexões ativas:   nunca deve atingir o limite (pool)
  Query time:        queries lentas indicam N+1 ou índice faltando
```

### Quando Algo Quebra em Produção

Sequência de investigação:

```
1. Vercel Dashboard → Functions → Logs
   → Ver o erro exato e stack trace

2. Verificar se é uma query problemática
   → Prisma loga queries lentas em modo debug (log: ['query'])

3. Neon Dashboard → Monitoring
   → Ver conexões ativas, queries lentas

4. Rollback se necessário
   Vercel → Deployments → [deployment anterior] → Promote to Production
   (um clique para voltar à versão anterior — sempre mantenha deploys anteriores)
```

---

## Referência Rápida — Checklists de Deploy

### Primeiro Deploy (setup inicial)

- [ ] Conta no Neon criada, projeto criado
- [ ] `DATABASE_URL` (pooled) e `DIRECT_URL` (direct) copiadas do Neon
- [ ] Repositório conectado ao Vercel (frontend e API como projetos separados)
- [ ] Variáveis de ambiente configuradas no Vercel para ambos os projetos
- [ ] `CORS_ORIGIN` na API aponta para URL do frontend no Vercel
- [ ] `VITE_API_URL` no frontend aponta para URL da API no Vercel
- [ ] `npx prisma migrate deploy` rodado com a `DIRECT_URL` de produção
- [ ] `/health` retornando 200 em produção
- [ ] Login e criação de projeto testados em produção

### A Cada Deploy com Mudança de Schema

- [ ] Migration criada localmente: `npx prisma migrate dev --name descricao`
- [ ] Testada localmente
- [ ] Migration aplicada em produção: `npx prisma migrate deploy` (com `DIRECT_URL`)
- [ ] Deploy do código feito após a migration

### Geração do JWT_SECRET para Produção

```bash
# Gera string aleatória de 64 bytes em hexadecimal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Resultado: algo como
# a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1...
```

Nunca reutilize o `JWT_SECRET` de desenvolvimento em produção.
