# Conceitos Fullstack — Do Browser ao Banco de Dados

> Mapa mental do que realmente importa. Baseado no projeto **DevSuite**
> (React + Vite + TypeScript + Node.js + Express + Prisma + PostgreSQL / Neon).

---

## Índice

1. [Como Pensar como Dev Sênior](#1-como-pensar-como-dev-sênior)
2. [O Ciclo Completo de uma Requisição](#2-o-ciclo-completo-de-uma-requisição)
3. [Frontend em Profundidade](#3-frontend-em-profundidade)
4. [Backend em Profundidade](#4-backend-em-profundidade)
5. [Banco de Dados](#5-banco-de-dados)
6. [Segurança Essencial](#6-segurança-essencial)
7. [Testes](#7-testes)

---

## 1. Como Pensar como Dev Sênior

Antes de qualquer tecnologia, existe uma mentalidade.

### 1.1 Trade-offs — Nenhuma Solução é Universalmente Correta

Um sênior nunca diz "a melhor solução é X". Ele diz: _"dado nosso contexto, X faz mais sentido porque..."_

Exemplos reais:

**Performance vs Manutenibilidade** — Código muito otimizado tende a ser complexo. A otimização prematura é raiz de todo mal: só otimize o que você mediu que é lento.

**Velocidade de entrega vs Qualidade** — Às vezes o negócio precisa de algo funcionando em 2 dias. A decisão de fazer uma solução temporária agora e refatorar depois é legítima — desde que documentada.

**Monolito vs Microserviços** — Para a maioria dos projetos, um monolito bem estruturado é a escolha certa. Microserviços só fazem sentido quando há múltiplos times grandes e necessidade de escala independente.

### 1.2 YAGNI — You Ain't Gonna Need It

Não construa o que você _acha_ que vai precisar no futuro. Construa o que você precisa agora. Sistemas over-engineered para requisitos imaginários são tão prejudiciais quanto sistemas mal feitos.

### 1.3 Make it Work → Make it Right → Make it Fast

Esta é a ordem correta:
1. **Funcionar** — código feio que funciona é melhor que código bonito que não funciona
2. **Fazer certo** — refatore para clareza, separação de responsabilidades, testes
3. **Fazer rápido** — só se necessário, e sempre com base em métricas reais

---

## 2. O Ciclo Completo de uma Requisição

Quando o usuário clica em "Criar Tarefa" no DevSuite, o que acontece?

### 2.1 Browser → Servidor

```
1. DNS Lookup         → "devsuite-api.vercel.app" vira um IP
2. TCP Handshake      → Conexão estabelecida com o servidor
3. TLS Handshake      → Criptografia negociada (HTTPS)
4. HTTP Request       → POST /api/projects/:id/tasks
                        Authorization: Bearer eyJhbGc...
                        Body: { "title": "Nova tarefa" }
5. Resposta           → 201 Created { "data": { ... } }
```

### 2.2 Dentro do Backend — Middleware Chain

No Express, uma requisição passa por uma cadeia de middlewares antes de chegar ao controller:

```
Request: POST /api/projects/abc123/tasks

┌─────────────────────────────────────────────────┐
│ 1. CORS Middleware                              │
│    Verifica se o origin é permitido             │
│                                                 │
│ 2. Body Parser                                  │
│    JSON → objeto JavaScript                     │
│                                                 │
│ 3. Auth Middleware                              │
│    Verifica JWT → extrai userId → req.user      │
│                                                 │
│ 4. Controller (task.controller.ts)              │
│    Valida input com Zod                         │
│    Chama Prisma para criar no banco             │
│    Retorna res.json(task)                       │
│                                                 │
│ 5. Error Middleware (se algo falhar)            │
│    Captura erros → resposta uniforme            │
└─────────────────────────────────────────────────┘

Response: 201 Created
{ "id": "...", "title": "Nova tarefa", "status": "TODO" }
```

### 2.3 Tipos de Resposta HTTP

Os status codes comunicam o resultado:

```
200 OK          → Sucesso em GET/PATCH/DELETE
201 Created     → Recurso criado com sucesso (POST)
400 Bad Request → Dados inválidos (Zod validation error)
401 Unauthorized → Token ausente ou inválido
403 Forbidden   → Token válido mas sem permissão
404 Not Found   → Recurso não existe
500 Internal Server Error → Bug no servidor
```

---

## 3. Frontend em Profundidade

### 3.1 Como o Browser Renderiza

```
1. HTML Parse         → Cria a árvore DOM
2. CSS Parse          → Cria a árvore CSSOM
3. JavaScript         → Executa scripts (modifica DOM)
4. Render Tree        → DOM + CSSOM = o que renderizar
5. Layout             → Calcula posição e tamanho de cada elemento
6. Paint              → Desenha pixels
7. Composite          → Combina camadas (GPU)
```

**O que importa:** arquivos CSS grandes bloqueiam o render. JS sem `defer` na tag `<head>` bloqueia o parse do HTML. O Vite resolve isso com code splitting automático.

### 3.2 Componentes: Dumb vs Smart

```tsx
// Dumb (Apresentação) — só renderiza, sem lógica de dados
function TaskCard({ title, status, onComplete }: TaskCardProps) {
  return (
    <div className={`card card--${status.toLowerCase()}`}>
      <h3>{title}</h3>
      <button onClick={onComplete}>Concluir</button>
    </div>
  );
}

// Smart (Container) — busca dados, orquestra
function ProjectTaskList({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.getTasks(projectId),
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  if (isLoading) return <Skeleton />;

  return tasks?.map(task => (
    <TaskCard
      key={task.id}
      title={task.title}
      status={task.status}
      onComplete={() => completeTask.mutate(task.id)}
    />
  ));
}
```

**Regra:** componentes dumb são testáveis, reutilizáveis. Componentes smart orquestram. Mantenha a separação.

### 3.3 Estado — Onde Colocar o Quê

```
Tipo de Estado        O que é                    Onde guardar
─────────────────     ─────────────────────────  ─────────────────
Estado de UI          Modal aberto, tab ativa    useState local
Estado de servidor    Dados da API, projetos     React Query
Estado global         Usuário logado, token      AuthContext
Estado de URL         Filtros, página atual      useSearchParams
```

**Nunca coloque dados do servidor em useState:**

```tsx
// ❌ ERRADO — sem cache, sem loading, sem retry automático
const [projects, setProjects] = useState([]);
useEffect(() => {
  fetch('/api/projects').then(r => r.json()).then(setProjects);
}, []);

// ✅ CORRETO — React Query gerencia tudo
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list(),
  staleTime: 5 * 60 * 1000, // considera fresco por 5 min
});
```

### 3.4 React Query — O Essencial

```tsx
// Buscar dados
const { data, isLoading, error } = useQuery({
  queryKey: ['projects'],          // chave única de cache
  queryFn: () => projectsApi.list(),
  staleTime: 1000 * 60,           // 1 min antes de refetch
});

// Criar/atualizar/deletar
const createProject = useMutation({
  mutationFn: (data: CreateProjectInput) => projectsApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] }); // refetch
    toast.success('Projeto criado!');
  },
  onError: () => toast.error('Algo deu errado'),
});

// Uso
<button
  onClick={() => createProject.mutate({ name: 'Novo Projeto' })}
  disabled={createProject.isPending}
>
  {createProject.isPending ? 'Criando...' : 'Criar'}
</button>
```

### 3.5 Hooks Essenciais

**`useState`** — estado local simples (modal aberto, valor de input).

**`useEffect`** — sincronizar com sistemas externos (localStorage, event listeners). **Não usar para buscar dados:**

```tsx
// CERTO — sincronizar com localStorage
useEffect(() => {
  localStorage.setItem('theme', theme);
}, [theme]);

// CERTO — event listener com cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**`useRef`** — referenciar elemento DOM ou guardar valor sem causar re-render:

```tsx
// No DevSuite FocusTimer: o timer precisa guardar o intervalId sem re-render
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
timerRef.current = setInterval(() => setSeconds(s => s - 1), 1000);
```

**`useMemo`** — memoizar cálculo custoso:
```tsx
const tasksByStatus = useMemo(
  () => ({
    todo: tasks.filter(t => t.status === 'TODO'),
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS'),
    done: tasks.filter(t => t.status === 'DONE'),
  }),
  [tasks] // recalcula só quando tasks muda
);
```

### 3.6 Autenticação no Cliente

O DevSuite usa JWT armazenado no `localStorage` com um `AuthContext`:

```
Login:
1. POST /api/auth/login → { token, user }
2. Salva token no localStorage
3. AuthContext atualiza estado global (isAuthenticated: true)
4. Axios interceptor adiciona token em toda requisição

Acesso a rota protegida:
1. PrivateRoute verifica AuthContext.isAuthenticated
2. Se false → redireciona para /login
3. Se true → renderiza a página

Token expirado:
1. API retorna 401
2. Axios response interceptor detecta 401
3. Limpa localStorage e redireciona para /login
```

```tsx
// src/services/api.ts — interceptors que fazem isso automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 3.7 Roteamento

```tsx
// App.tsx — estrutura de rotas do DevSuite
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Rotas protegidas — requer autenticação */}
        <Route element={<PrivateRoute />}>
          <Route path="/app/tasks" element={<DashboardPage />} />
          <Route path="/app/tasks/:id" element={<ProjectPage />} />
          <Route path="/app/devpulse" element={<DevPulsePage />} />
          <Route path="/app/focus" element={<FocusTimerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 4. Backend em Profundidade

### 4.1 Express e a Cadeia de Middlewares

```typescript
// src/app.ts — configuração real do DevSuite
const app = express();

// Middlewares globais — ORDEM IMPORTA
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check — plataformas de deploy verificam isso
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/focus-sessions', focusRoutes);

// 404 catch-all
app.use('*', (req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não encontrada` });
});

// Error middleware — SEMPRE no final
app.use(errorMiddleware);

export default app; // exporta para ser importado pelo Vercel (api/index.ts)
```

**Por que `export default app`?** No Vercel (serverless), a plataforma gerencia o servidor HTTP. Ela importa o `app` do Express e passa as requisições para ele. O `server.ts` (que faz `app.listen()`) só é usado em desenvolvimento local e Docker.

### 4.2 Validação com Zod

Nunca confie em dados do cliente. Valide tudo no backend:

```typescript
// src/controllers/project.controller.ts
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
});

export async function createProject(req: Request, res: Response) {
  // Se inválido, lança ZodError → capturado pelo errorMiddleware
  const { name, description } = createProjectSchema.parse(req.body);

  const project = await prisma.project.create({
    data: { name, description, userId: req.user!.id },
  });

  res.status(201).json(project);
}
```

### 4.3 Autenticação JWT

**Fluxo completo:**

```
Registro:
1. Validar input (email, senha, nome)
2. Verificar se email já existe
3. Hash da senha com bcrypt (nunca armazene em texto puro!)
4. Criar usuário no banco
5. Retornar JWT

Login:
1. Buscar usuário por email
2. Comparar senha com bcrypt.compare()
3. Se inválido: mesmo erro para email e senha (não dê dica ao atacante)
4. Gerar JWT com { userId, email } no payload
5. Retornar { token, user }

Requisição protegida:
1. Header: Authorization: Bearer <token>
2. authMiddleware: jwt.verify(token, JWT_SECRET)
3. Se válido: injeta req.user = { id, email }
4. Controller usa req.user.id para filtrar dados do usuário
```

```typescript
// src/middlewares/auth.middleware.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido', code: 'UNAUTHORIZED' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado', code: 'UNAUTHORIZED' });
  }
}
```

### 4.4 Tratamento de Erros Centralizado

```typescript
// src/middlewares/error.middleware.ts
export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  // Erro de validação Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.flatten().fieldErrors,
    });
  }

  // Erro conhecido da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Erro inesperado — não vaze detalhes internos
  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
```

### 4.5 Design de API REST

```
Substantivos, não verbos:
✅ GET    /api/projects          → lista projetos
✅ POST   /api/projects          → cria projeto
✅ GET    /api/projects/:id      → busca projeto
✅ PATCH  /api/projects/:id      → atualiza parcialmente
✅ DELETE /api/projects/:id      → deleta

❌ POST   /api/createProject
❌ GET    /api/getProjects

Recursos aninhados (máximo 2 níveis):
✅ GET    /api/projects/:id/tasks
✅ POST   /api/projects/:id/tasks

Formato de resposta consistente:
{ "id": "...", "name": "...", ... }       // sucesso
{ "error": "Mensagem", "code": "CÓDIGO" } // erro
```

### 4.6 Prisma — ORM Type-Safe

```typescript
// Buscar projetos do usuário com suas tasks
const projects = await prisma.project.findMany({
  where: { userId: req.user.id },
  include: {
    tasks: {
      orderBy: { order: 'asc' },
    },
  },
  orderBy: { createdAt: 'desc' },
});

// Criar task
const task = await prisma.task.create({
  data: {
    title,
    description,
    projectId,
    order: lastOrder + 1,
  },
});

// Transaction — reordenar tasks (atômico: tudo ou nada)
await prisma.$transaction(
  tasks.map((task, index) =>
    prisma.task.update({
      where: { id: task.id },
      data: { order: index },
    })
  )
);
```

---

## 5. Banco de Dados

### 5.1 O Schema do DevSuite

```
User ──< Project ──< Task
  1         N    1      N

User ──< FocusSession
  1         N
```

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // sempre hashed com bcrypt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
  focusSessions FocusSession[]
  @@map("users")
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  order       Int        @default(0)  // para drag-and-drop
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId])  // índice para queries por projeto
  @@map("tasks")
}

enum TaskStatus { TODO IN_PROGRESS DONE }
```

### 5.2 Índices — Por Que São Essenciais

Sem índice: o banco lê todas as linhas (full table scan). Com índice: encontra em O(log n).

```sql
-- Sem índice: se tiver 100.000 tasks, lê TODAS para filtrar por projectId
SELECT * FROM tasks WHERE project_id = 'abc123';

-- Com índice (@@index([projectId]) no Prisma):
-- O banco vai direto aos registros do projeto — muito mais rápido
```

**Regra:** indexe colunas que aparecem frequentemente no `WHERE` e em foreign keys.

**Custo:** índices aceleram leitura, mas tornam escrita mais lenta (o índice também precisa ser atualizado). Não indexe tudo.

### 5.3 O Problema N+1

```typescript
// ❌ N+1: 1 query para projetos + N queries para tasks de cada um
const projects = await prisma.project.findMany();
for (const project of projects) {
  project.tasks = await prisma.task.findMany({
    where: { projectId: project.id },
  });
}
// 10 projetos = 11 queries no banco!

// ✅ Correto: include faz um JOIN eficiente
const projects = await prisma.project.findMany({
  include: { tasks: true }, // 1 ou 2 queries, não N+1
});
```

### 5.4 ACID e Transações

**ACID** garante integridade dos dados:
- **Atomicity:** Tudo ou nada — se uma operação falha, nada é salvo
- **Consistency:** O banco sempre vai de um estado válido para outro
- **Isolation:** Transações concorrentes não interferem uma na outra
- **Durability:** Dados commitados sobrevivem a falhas

```typescript
// Sem transação — perigoso
await prisma.task.update({ where: { id }, data: { order: 0 } });
// CRASH AQUI → outras tasks ficam com ordem errada

// Com transação — tudo ou nada
await prisma.$transaction(
  tasks.map((task, index) =>
    prisma.task.update({ where: { id: task.id }, data: { order: index } })
  )
);
```

### 5.5 Migrações — Controle de Versão do Schema

```bash
# Após alterar o schema.prisma:
npx prisma migrate dev --name add_task_description
# → cria arquivo em prisma/migrations/ com o SQL gerado

# Em produção (sem prompts):
npx prisma migrate deploy
# → aplica apenas as migrations que ainda não foram aplicadas
```

**Regras:**
1. Nunca delete colunas diretamente — marque como deprecada, migre os dados, delete depois
2. Novas colunas obrigatórias precisam de `@default(...)` (senão falha para dados existentes)
3. Nunca edite uma migration já aplicada

---

## 6. Segurança Essencial

### 6.1 As Vulnerabilidades mais Comuns

**SQL Injection — Prisma protege automaticamente:**
```typescript
// ❌ SQL puro — vulnerável
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Atacante envia: ' OR '1'='1  → acessa todos os usuários

// ✅ Prisma usa parâmetros preparados automaticamente
const user = await prisma.user.findFirst({ where: { email } });
```

**XSS — React protege automaticamente:**
```tsx
// ❌ Perigoso — executa JavaScript do usuário
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ React escapa automaticamente
<div>{userContent}</div>
```

**Senhas — sempre bcrypt:**
```typescript
// Ao criar usuário:
const hashed = await bcrypt.hash(password, 12); // 12 = salt rounds

// Ao fazer login:
const match = await bcrypt.compare(password, user.password);
// Mesmo erro para email e senha inválidos — não dê dica ao atacante
if (!user || !match) throw new AppError('Credenciais inválidas', 401);
```

### 6.2 JWT Seguro

```typescript
// ✅ JWT_SECRET gerado com entropia suficiente
// Gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// ✅ Token com expiração (env.JWT_EXPIRES_IN = '7d')
const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
  expiresIn: env.JWT_EXPIRES_IN,
});

// ❌ Nunca faça isso
const token = jwt.sign({ userId }, 'secret'); // sem expiração, secret fraco
```

### 6.3 CORS — Controle de Origem

```typescript
// src/app.ts — DevSuite só permite o frontend autorizado
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
// Dev: 'http://localhost:5173'
// Prod: 'https://devsuite.vercel.app'

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin não permitida'));
    }
  },
  credentials: true,
}));
```

### 6.4 Rate Limiting — Proteção contra Brute Force

```typescript
import rateLimit from 'express-rate-limit';

// Limite geral: 100 requests por 15 min por IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Mais restrito para auth: 10 tentativas de login por 15 min
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
}));
```

### 6.5 Nunca Exponha Dados Sensíveis

```typescript
// ❌ Retorna o hash da senha na resposta
const user = await prisma.user.findUnique({ where: { id } });
res.json(user); // inclui password!

// ✅ Exclui campos sensíveis
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true, createdAt: true },
});
res.json(user);
```

---

## 7. Testes

### 7.1 A Pirâmide de Testes

```
           /\
          /  \     E2E (Playwright)
         /    \    — poucos, lentos, testam o app completo no browser
        /──────\
       /        \   Integration Tests
      /          \  — moderados, testam módulos juntos (ex: rota → banco)
     /────────────\
    /              \  Unit Tests (Vitest)
   /                \  — muitos, rápidos, testam funções isoladas
  /──────────────────\
```

**Regra prática:** 70% unit, 20% integration, 10% E2E.

### 7.2 Unit Tests com Vitest

```typescript
// Testa função de negócio pura, sem banco
import { describe, it, expect, vi } from 'vitest';

describe('task order calculation', () => {
  it('places new task at the end', () => {
    const tasks = [
      { id: '1', order: 0 },
      { id: '2', order: 1 },
    ];
    const newOrder = tasks.length; // 2
    expect(newOrder).toBe(2);
  });
});
```

### 7.3 Integration Tests

```typescript
// Testa a rota completa com banco real (Vitest + Supertest)
import request from 'supertest';
import app from '../src/app';

describe('POST /api/auth/login', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
```

### 7.4 O Que Testar (e o Que Não Testar)

**Testar:**
- Lógica de negócio complexa (cálculos, validações, fluxos)
- Casos de borda (input inválido, usuário sem permissão)
- Integrações críticas (autenticação, queries importantes)

**Não testar:**
- Getters e setters simples
- Código que só chama a biblioteca (confie na biblioteca)
- 100% de cobertura a qualquer custo — testes ruins são piores que nenhum teste

---

## Referência Rápida — Tech Stack do DevSuite

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Frontend Framework | React 18 | Ecossistema maduro, hooks |
| Build | Vite | Desenvolvimento rápido, HMR |
| Estilo | Tailwind CSS | Utility-first, sem naming |
| HTTP Client | Axios | Interceptors, configuração central |
| Server State | TanStack Query | Cache, sync, loading states |
| Auth State | React Context | Global, simples para auth |
| Routing | React Router v6 | Padrão React |
| Backend | Express + TypeScript | Flexível, amplamente usado |
| Validação | Zod | TypeScript-first, inferência de tipos |
| ORM | Prisma | Type-safe, migrations, DX excelente |
| Banco | PostgreSQL (Neon) | ACID, relacional, escalável |
| Auth | JWT + bcryptjs | Stateless, sem sessão no servidor |
