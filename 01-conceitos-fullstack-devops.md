# Guia Completo: Do Junior ao Senior — Frontend, Backend, DevOps e o Lado do Negócio

> Este guia foi escrito para que você consiga ter uma conversa com qualquer sênior e entender tudo.
> Não é um manual de referência — é um mapa mental mastigado do que realmente importa.

---

## Índice

1. [Como Pensar como um Desenvolvedor Sênior](#1-como-pensar-como-um-desenvolvedor-sênior)
2. [Frontend em Profundidade](#2-frontend-em-profundidade)
3. [Backend em Profundidade](#3-backend-em-profundidade)
4. [Banco de Dados em Profundidade](#4-banco-de-dados-em-profundidade)
5. [DevOps e Infraestrutura](#5-devops-e-infraestrutura)
6. [System Design — Como Sistemas Escalam](#6-system-design--como-sistemas-escalam)
7. [Segurança](#7-segurança)
8. [Testes](#8-testes)
9. [O Lado do Negócio](#9-o-lado-do-negócio)
10. [Ferramentas e Ecossistema — O Mapa Completo](#10-ferramentas-e-ecossistema--o-mapa-completo)

---

## 1. Como Pensar como um Desenvolvedor Sênior

Antes de qualquer tecnologia, existe uma mentalidade. É ela que diferencia o sênior do pleno, não o número de frameworks conhecidos.

### 1.1 Trade-offs — Nenhuma Solução é Universalmente Correta

Um sênior nunca diz "a melhor solução é X". Ele diz "dado nosso contexto, X faz mais sentido porque..." e consegue explicar os trade-offs.

Exemplos de trade-offs comuns:

**Consistência vs Disponibilidade (CAP Theorem)**
Sistemas distribuídos não conseguem garantir os dois ao mesmo tempo durante uma falha de rede. Bancos relacionais priorizam consistência. Muitos NoSQL priorizam disponibilidade.

**Performance vs Manutenibilidade**
Código extremamente otimizado tende a ser complexo e difícil de manter. A otimização prematura é raiz de todo mal — só otimize o que você mediu que é lento.

**Velocidade de entrega vs Qualidade**
Às vezes o negócio precisa de algo funcionando em 2 dias. A decisão de fazer "gambiarra controlada" agora e refatorar depois é legítima — desde que documentada.

### 1.2 A Regra do YAGNI (You Ain't Gonna Need It)

Não construa o que você acha que vai precisar no futuro. Construa o que você precisa agora. Sistemas over-engineered para requisitos imaginários são tão danosos quanto sistemas mal feitos.

### 1.3 A Regra dos 3 Antes de Abstrair

Antes de criar uma abstração (uma função genérica, um componente reutilizável, uma classe base), espere ter 3 casos de uso reais para ela. Abstração prematura é tão problemática quanto código duplicado.

### 1.4 Make it Work → Make it Right → Make it Fast

Esta é a ordem correta:
1. **Faça funcionar** — código feio que funciona é melhor que código bonito que não funciona
2. **Faça certo** — refatore para clareza, separação de responsabilidades, testes
3. **Faça rápido** — só se necessário, e sempre com base em métricas reais

---

## 2. Frontend em Profundidade

### 2.1 Como o Browser Funciona (o que acontece quando você digita uma URL)

Entender isso é fundamental para qualquer otimização de frontend.

```
1. DNS Lookup         → "taskflow.com" vira "192.168.1.1"
2. TCP Handshake      → Conexão estabelecida com o servidor
3. TLS Handshake      → Criptografia negociada (HTTPS)
4. HTTP Request       → GET /index.html
5. HTML Parse         → Browser lê HTML, encontra CSS e JS
6. Subresource Fetch  → Baixa CSS, JS, fontes, imagens
7. DOM Construction   → HTML vira árvore de objetos (DOM)
8. CSSOM Construction → CSS vira árvore de estilos
9. Render Tree        → DOM + CSSOM combinados
10. Layout            → Calcular posição/tamanho de cada elemento
11. Paint             → Desenhar pixels na tela
12. Composite         → Combinar camadas (GPU)
```

**Por que isso importa?** Cada etapa pode ser um gargalo. Arquivos CSS grandes bloqueiam o render. JS na tag `<head>` sem `defer` bloqueia o parse do HTML. Muitas requisições HTTP causam waterfall.

### 2.2 Componentização e Reusabilidade

A ideia central do React é dividir a UI em peças independentes e reutilizáveis. Mas existem tipos de componentes:

**Componentes de Apresentação (Dumb)** — só recebem props e renderizam UI. Sem lógica de negócio. Testáveis e reutilizáveis.

**Componentes de Container (Smart)** — buscam dados, gerenciam estado, passam para componentes de apresentação. Têm lógica.

```jsx
// Componente de apresentação — puro, testável, reutilizável
function TaskCard({ title, status, assignee, onComplete }) {
  return (
    <div className={`card card--${status}`}>
      <h3>{title}</h3>
      <span>{assignee}</span>
      <button onClick={onComplete}>Completar</button>
    </div>
  );
}

// Componente container — busca dados, orquestra
function ProjectTaskList({ projectId }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.getTasks(projectId),
  });

  const mutation = useCompleteTask();

  if (isLoading) return <Skeleton />;

  return tasks.map(task => (
    <TaskCard
      key={task.id}
      {...task}
      onComplete={() => mutation.mutate(task.id)}
    />
  ));
}
```

### 2.3 Gerenciamento de Estado — A Decisão mais Importante

Estado é qualquer dado que, quando muda, faz a UI re-renderizar. Saber **onde colocar o estado** é uma das habilidades mais críticas.

**Os 4 tipos de estado no frontend:**

| Tipo | O que é | Onde guardar |
|---|---|---|
| **Estado de UI** | Modal aberto, tab ativa, loading | `useState`, `useReducer` local |
| **Estado de servidor** | Dados da API, cache | React Query, SWR |
| **Estado global de app** | Usuário logado, tema, carrinho | Zustand, Jotai, Context |
| **Estado de URL** | Filtros, página, busca | `useSearchParams`, React Router |

```tsx
// ERRADO — colocar dados do servidor em useState
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers);
}, []);
// Problemas: sem cache, sem loading state, sem error state, sem refetch automático

// CORRETO — usar React Query para dados do servidor
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.getUsers(),
  staleTime: 5 * 60 * 1000, // considera fresco por 5 min
});
// React Query gerencia: cache, loading, error, refetch, invalidação
```

**Regra de ouro de co-location:** Mantenha o estado o mais próximo possível de quem o usa. Só eleve o estado quando dois componentes precisam compartilhá-lo.

### 2.4 React Query — Por Que é Indispensável

React Query (TanStack Query) resolve o problema mais difícil do frontend moderno: **sincronizar estado do servidor com o cliente**.

```tsx
// Buscar dados
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['project', projectId],     // chave única para o cache
  queryFn: () => api.getProject(projectId),
  staleTime: 1000 * 60,                 // 1 min até considerar "stale"
  gcTime: 1000 * 60 * 5,               // 5 min até remover do cache
  retry: 3,                             // 3 tentativas em caso de erro
});

// Mutations — criar/atualizar/deletar
const createTask = useMutation({
  mutationFn: (data) => api.createTask(data),
  onSuccess: () => {
    // Invalida o cache de tasks — React Query refetch automaticamente
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('Tarefa criada!');
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

// Otimistic updates — atualiza a UI antes da resposta do servidor
const completeTask = useMutation({
  mutationFn: (taskId) => api.completeTask(taskId),
  onMutate: async (taskId) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] });
    const previous = queryClient.getQueryData(['tasks']);

    // Atualiza o cache imediatamente (UI parece instantânea)
    queryClient.setQueryData(['tasks'], (old) =>
      old.map(t => t.id === taskId ? { ...t, status: 'done' } : t)
    );

    return { previous }; // para rollback em caso de erro
  },
  onError: (err, taskId, context) => {
    queryClient.setQueryData(['tasks'], context.previous); // rollback
  },
});
```

### 2.5 Hooks Essenciais — Quando e Por Quê

**`useState`** — estado local simples.

**`useReducer`** — quando o estado tem múltiplos sub-valores ou lógicas complexas de transição:
```tsx
type Action =
  | { type: 'SET_LOADING' }
  | { type: 'SET_DATA'; payload: Task[] }
  | { type: 'SET_ERROR'; payload: string };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: true, error: null };
    case 'SET_DATA':    return { loading: false, error: null, data: action.payload };
    case 'SET_ERROR':   return { loading: false, error: action.payload, data: [] };
  }
}
```

**`useEffect`** — sincronizar com sistemas externos (não para buscar dados!):
```tsx
// CERTO — sincronizar com localStorage
useEffect(() => {
  localStorage.setItem('theme', theme);
}, [theme]);

// CERTO — event listener com cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize); // SEMPRE cleanup
}, []);

// ERRADO — buscar dados em useEffect (use React Query)
useEffect(() => {
  fetch('/api/data').then(...)
}, []);
```

**`useMemo`** — memoizar resultado de cálculo caro. Só use quando o cálculo é realmente custoso:
```tsx
// Só recalcula se tasks ou filter mudar
const filteredTasks = useMemo(
  () => tasks.filter(t => t.status === filter).sort(byDate),
  [tasks, filter]
);
```

**`useCallback`** — memoizar função para evitar re-render de componentes filhos:
```tsx
// Sem useCallback: nova referência a cada render → filho sempre re-renderiza
// Com useCallback: mesma referência enquanto deps não mudam
const handleDelete = useCallback((id) => {
  deleteTask(id);
}, []); // deps vazias = função criada uma vez
```

**`useRef`** — referenciar elemento DOM ou guardar valor sem causar re-render:
```tsx
const inputRef = useRef(null);

// Focar o input programaticamente
useEffect(() => {
  inputRef.current?.focus();
}, []);

// Guardar o timer sem causar re-render
const timerRef = useRef(null);
timerRef.current = setTimeout(...);
```

### 2.6 Custom Hooks — Extraindo Lógica Reutilizável

Custom hooks são a forma de reutilizar lógica stateful entre componentes. Se você está copiando lógica de useEffect entre componentes, é hora de extrair um hook.

```tsx
// Hook de debounce — evita chamadas excessivas durante digitação
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Uso
function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500); // só busca 500ms depois de parar de digitar

  useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });
}
```

### 2.7 Roteamento com React Router v6

```tsx
// App.tsx — definição de rotas
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rotas protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// PrivateRoute — redireciona se não autenticado
function PrivateRoute() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```

**Parâmetros de URL e query string:**
```tsx
// Parâmetro de rota
const { id } = useParams(); // /projects/:id

// Query string — filtros, paginação
const [searchParams, setSearchParams] = useSearchParams();
const status = searchParams.get('status') ?? 'all'; // /projects?status=active

// Navegar programaticamente
const navigate = useNavigate();
navigate(`/projects/${id}`);
navigate(-1); // voltar
```

### 2.8 Formulários com React Hook Form + Zod

Formulários são onde a maioria dos devs perde mais tempo. React Hook Form + Zod resolve isso:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>; // TypeScript infere o tipo!

function LoginForm() {
  const {
    register,       // registra o input no form
    handleSubmit,   // wrapper que valida antes de chamar sua função
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // data já está validado e tipado
    await authService.login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
```

### 2.9 Performance — O Que Realmente Importa

**O problema do re-render:** Em React, quando um componente re-renderiza, todos os filhos também re-renderizam por padrão. Isso é geralmente ok — o React é rápido. Só otimize quando medir que é um problema.

```tsx
// React.memo — evita re-render se as props não mudaram
const TaskCard = React.memo(function TaskCard({ task, onComplete }) {
  console.log('TaskCard render', task.id); // ver quando renderiza
  return <div>...</div>;
});

// Problema: se onComplete for criado inline, muda a cada render do pai
// Solução: useCallback no pai
```

**Code Splitting — não envie o que o usuário não precisa:**
```tsx
// Sem code splitting: todo o código é baixado no primeiro acesso
// Com code splitting: o chunk do Dashboard só é baixado quando necessário
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Virtualização — listas longas:**
Se você renderizar 10.000 itens no DOM, o browser vai sofrer. Use virtualização: só renderiza os itens visíveis na tela.
```bash
npm install @tanstack/react-virtual
```

---

## 3. Backend em Profundidade

### 3.1 Como uma Requisição HTTP Percorre o Backend

```
Request: POST /api/tasks
         Authorization: Bearer eyJhbGc...
         Body: { "title": "Nova tarefa", "projectId": "abc123" }

┌─────────────────────────────────────────────────────┐
│ 1. Router                                           │
│    app.post('/api/tasks', authMiddleware, controller)│
│                                                     │
│ 2. Middleware de Autenticação                       │
│    - Verifica JWT → extrai userId → req.user = {...} │
│                                                     │
│ 3. Middleware de Validação                          │
│    - Zod valida o body → erro 400 se inválido       │
│                                                     │
│ 4. Controller                                       │
│    - Extrai dados do req                            │
│    - Chama o Service                                │
│    - Retorna res.json(...)                          │
│                                                     │
│ 5. Service (lógica de negócio)                      │
│    - Verifica permissões                            │
│    - Chama o Repository                             │
│                                                     │
│ 6. Repository (acesso a dados)                      │
│    - Executa query no banco via Prisma              │
│                                                     │
│ 7. Error Handler Middleware                         │
│    - Captura erros não tratados → resposta uniforme │
└─────────────────────────────────────────────────────┘
```

### 3.2 Express com TypeScript — A Arquitetura Correta

**`src/app.ts` — entry point:**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { taskRoutes } from './routes/task.routes';
import { env } from './lib/env';

const app = express();

// Middlewares globais (ordem importa!)
app.use(helmet());                         // headers de segurança
app.use(cors({ origin: env.CORS_ORIGIN })); // CORS
app.use(express.json());                   // parse JSON body
app.use(express.urlencoded({ extended: true }));

// Health check — load balancers verificam isso
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Error handler — SEMPRE no final
app.use(errorHandler);

app.listen(env.PORT, () => console.info(`Server on :${env.PORT}`));
```

**Erros customizados — tratamento centralizado:**
```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Não autorizado', 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('Sem permissão para esta ação', 403, 'FORBIDDEN');
  }
}
```

```typescript
// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Erros de validação do Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.flatten().fieldErrors,
    });
  }

  // Erros conhecidos da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Erro desconhecido — não vaze detalhes internos
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
```

### 3.3 Validação com Zod — Por Que é Essencial

Nunca confie em dados que vêm do cliente. Valide tudo no backend.

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schemas de validação
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.coerce.date().min(new Date()).optional(), // coerce: string → Date
});

// Middleware de validação reutilizável
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // dados limpos e tipados
    next();
  };
}

// Uso na rota
router.post('/tasks', authMiddleware, validate(createTaskSchema), taskController.create);
```

### 3.4 Autenticação JWT — Fluxo Completo

```typescript
// auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';

const SALT_ROUNDS = 12; // quanto maior, mais seguro e mais lento

export async function register(email: string, password: string) {
  // Nunca guarde senha em texto puro — sempre hash
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  return userRepo.create({ email, password: hashedPassword });
}

export async function login(email: string, password: string) {
  const user = await userRepo.findByEmail(email);

  // Mesmo erro para email e senha incorretos — não dar dica ao atacante
  if (!user) throw new UnauthorizedError();

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw new UnauthorizedError();

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '15m' }  // access token de vida curta
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }   // refresh token de vida longa
  );

  // Guarda refresh token no banco (para poder invalidar)
  await userRepo.updateRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
}
```

```typescript
// auth.middleware.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    // jwt.verify lança erro se token inválido ou expirado
    throw new UnauthorizedError();
  }
}
```

### 3.5 API REST — Design de Qualidade

**Boas práticas de design:**
```
# Recursos como substantivos, não verbos
✅ GET    /projects
✅ POST   /projects
✅ GET    /projects/:id
✅ PATCH  /projects/:id      ← PATCH para atualização parcial
✅ PUT    /projects/:id      ← PUT para substituição completa
✅ DELETE /projects/:id

❌ GET    /getProjects
❌ POST   /createProject
❌ POST   /deleteProject/123

# Recursos aninhados — quando faz sentido
✅ GET  /projects/:id/tasks        ← tasks de um projeto específico
✅ POST /projects/:id/tasks        ← criar task nesse projeto

# Não aninhe mais de 2 níveis — fica ilegível
❌ /users/:id/projects/:id/tasks/:id/comments

# Filtros, ordenação e paginação via query string
✅ GET /tasks?status=pending&sort=dueDate&order=asc&page=1&limit=20

# Versionamento
✅ /api/v1/projects
```

**Resposta padronizada:**
```typescript
// Sucesso
{ "data": { "id": "...", "title": "..." } }

// Lista com paginação
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Erro
{
  "error": "Projeto não encontrado",
  "code": "NOT_FOUND"
}
```

### 3.6 Prisma — ORM Moderno

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  projects  Project[]
  tasks     Task[]    @relation("AssignedTasks")
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Foreign keys
  projectId   String
  assigneeId  String?

  // Relations
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee    User?      @relation("AssignedTasks", fields: [assigneeId], references: [id])
}

enum TaskStatus { PENDING IN_PROGRESS REVIEW DONE }
enum Priority   { LOW MEDIUM HIGH URGENT }
```

```typescript
// Queries Prisma — exemplos práticos
const prisma = new PrismaClient();

// SELECT com filtros, ordenação e paginação
const tasks = await prisma.task.findMany({
  where: {
    projectId,
    status: { not: 'DONE' },
    dueDate: { lte: new Date() }, // vencidas
  },
  include: {
    assignee: { select: { id: true, name: true, email: true } }, // só os campos necessários
    project: true,
  },
  orderBy: { dueDate: 'asc' },
  skip: (page - 1) * limit,
  take: limit,
});

// Transaction — operações atômicas (ou tudo ou nada)
const result = await prisma.$transaction(async (tx) => {
  const task = await tx.task.update({
    where: { id: taskId },
    data: { status: 'DONE' },
  });

  await tx.project.update({
    where: { id: task.projectId },
    data: { completedTasks: { increment: 1 } },
  });

  return task;
});
```

### 3.7 WebSockets — Comunicação em Tempo Real

HTTP é sempre iniciado pelo cliente. Mas e quando o servidor precisa enviar dados? (notificações, chat, updates em tempo real)

**WebSocket** é uma conexão persistente e bidirecional.

```
HTTP (request-response):
Cliente ──── GET /messages ───► Servidor
         ◄── 200 OK ───────────

WebSocket (full-duplex):
Cliente ──── CONNECT ──────────► Servidor
         ◄────────── message ───
         ──── message ─────────►
         ◄────────── message ───
```

```typescript
// Backend com Socket.io
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGIN }
});

io.use((socket, next) => {
  // Autenticar via token
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.user.id;

  // Entrar em "sala" do projeto
  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
  });

  // Quando task é atualizada
  socket.on('task:update', async (data) => {
    const task = await taskService.update(data);

    // Emite para todos na sala do projeto
    io.to(`project:${task.projectId}`).emit('task:updated', task);
  });

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
});
```

```tsx
// Frontend com Socket.io
import { io } from 'socket.io-client';

const socket = io(API_URL, {
  auth: { token: localStorage.getItem('accessToken') },
});

// Hook para tasks em tempo real
function useRealtimeTasks(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.emit('join:project', projectId);

    socket.on('task:updated', (task) => {
      // Atualiza o cache do React Query sem precisar refetch
      queryClient.setQueryData(['tasks', projectId], (old: Task[]) =>
        old.map(t => t.id === task.id ? task : t)
      );
    });

    return () => socket.off('task:updated');
  }, [projectId]);
}
```

---

## 4. Banco de Dados em Profundidade

### 4.1 Índices — A Otimização mais Importante

Um índice é como o índice de um livro: sem ele, buscar por "João" em um banco de 1 milhão de usuários lê linha por linha. Com um índice no campo `email`, encontra instantaneamente.

```sql
-- Sem índice: Full Table Scan — lê todas as 1M linhas
SELECT * FROM users WHERE email = 'joao@email.com';

-- Com índice: Index Lookup — O(log n)
CREATE INDEX idx_users_email ON users(email);
```

**Quando criar índices:**
- Colunas usadas frequentemente em `WHERE`
- Colunas de foreign key (Prisma cria automaticamente)
- Colunas usadas em `ORDER BY`
- Colunas em queries de JOIN

**Índice composto — quando a ordem importa:**
```sql
-- Para queries que filtram por projectId E status
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);

-- Funciona para:
WHERE project_id = 'x'
WHERE project_id = 'x' AND status = 'pending'

-- NÃO funciona eficientemente para:
WHERE status = 'pending' -- sem projectId na frente
```

**Custo dos índices:** Índices aceleram leitura, mas tornam escrita mais lenta (o índice precisa ser atualizado a cada INSERT/UPDATE/DELETE). Não indexe tudo.

### 4.2 O Problema N+1 — O Vilão de Performance mais Comum

```typescript
// N+1: 1 query para buscar projetos + N queries para buscar tasks de cada um
const projects = await prisma.project.findMany(); // 1 query

for (const project of projects) {
  project.tasks = await prisma.task.findMany({ // N queries!
    where: { projectId: project.id }
  });
}
// Se tiver 100 projetos = 101 queries!

// Solução: usar include (Prisma faz JOIN eficiente)
const projects = await prisma.project.findMany({
  include: { tasks: true } // 1 ou 2 queries, não N+1
});
```

### 4.3 Transações e ACID

**ACID** é o conjunto de propriedades que garantem integridade dos dados:

- **Atomicity:** Tudo ou nada. Se uma operação falha, tudo é revertido.
- **Consistency:** O banco sempre vai de um estado válido para outro.
- **Isolation:** Transações concorrentes não interferem uma na outra.
- **Durability:** Dados commitados sobrevivem a falhas de sistema.

```typescript
// Sem transação — PERIGOSO
await db.account.update({ where: { id: from }, data: { balance: { decrement: 100 } } });
// CRASH AQUI — conta debitada mas não creditada!
await db.account.update({ where: { id: to }, data: { balance: { increment: 100 } } });

// Com transação — seguro
await prisma.$transaction(async (tx) => {
  const sender = await tx.account.findUnique({ where: { id: from } });
  if (sender.balance < 100) throw new Error('Saldo insuficiente');

  await tx.account.update({ where: { id: from }, data: { balance: { decrement: 100 } } });
  await tx.account.update({ where: { id: to }, data: { balance: { increment: 100 } } });
  // Se qualquer linha acima falhar, NADA é commitado
});
```

### 4.4 Migrações — Controle de Versão do Schema

Migrações são a evolução do seu schema ao longo do tempo, rastreadas em arquivos versionados. Nunca altere o banco manualmente em produção.

```bash
# Criar migração após alterar o schema.prisma
npx prisma migrate dev --name add_task_priority

# Aplica em produção (sem prompts)
npx prisma migrate deploy
```

**Regras de ouro para migrações:**
1. **Nunca delete colunas diretamente** — marque como deprecated, migre os dados, então delete em uma migração futura
2. **Adicione defaults para novas colunas** obrigatórias (senão falha para dados existentes)
3. **Migrações são imutáveis** — nunca edite uma migração já aplicada

### 4.5 SQL vs NoSQL — A Decisão Correta

| Critério | SQL (PostgreSQL) | NoSQL (MongoDB) |
|---|---|---|
| **Estrutura dos dados** | Tabular, esquema fixo | Documentos, esquema flexível |
| **Relações** | Excelente (JOINs, FK) | Fraco (embed ou referências manuais) |
| **Consistência** | ACID nativo | Eventual por padrão |
| **Escala** | Vertical (máquina maior) | Horizontal (mais máquinas) |
| **Quando usar** | 90% dos casos | Logs, catálogos, dados variáveis |

**A verdade:** Para a maioria dos projetos, PostgreSQL é a escolha correta. Só considere NoSQL quando você tiver um problema específico que o SQL não resolve bem.

---

## 5. DevOps e Infraestrutura

### 5.1 Docker — Por Que Mudou Tudo

Antes do Docker, um novo dev gastava horas configurando o ambiente (versão do Node, banco de dados, variáveis...). Docker resolve isso: a aplicação e todas as dependências ficam empacotadas numa imagem portátil.

**Dockerfile multi-stage — para produção:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci                    # instala TODAS as deps (incluindo dev)

COPY . .
RUN npm run build             # compila TypeScript

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # só deps de produção (menor imagem)

COPY --from=builder /app/dist ./dist  # só o build compilado

# Não rode como root — segurança
USER node

EXPOSE 4000
CMD ["node", "dist/app.js"]
```

**Por que multi-stage?** A imagem final não inclui TypeScript, código-fonte, testes. Fica menor (~150MB vs ~600MB) e mais segura.

```bash
# Build da imagem
docker build -t taskflow-api:latest .

# Ver o tamanho
docker images taskflow-api

# Rodar localmente
docker run -p 4000:4000 --env-file .env taskflow-api:latest
```

### 5.2 Docker Compose — Orquestrando Múltiplos Containers

```yaml
# docker-compose.yml — desenvolvimento
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: taskflow_pass
      POSTGRES_DB: taskflow_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:  # outros serviços esperarão até o banco estar pronto
      test: ["CMD-SHELL", "pg_isready -U taskflow"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 5.3 CI/CD — O Pipeline Completo

**CI (Continuous Integration):** A cada push/PR, automaticamente garante que o código funciona.

**CD (Continuous Delivery):** Após o CI passar, faz deploy automático.

```
Developer → git push → GitHub Actions CI:
  1. npm ci
  2. tsc --noEmit (type check)
  3. eslint (lint)
  4. vitest (testes)
  5. docker build (build da imagem)

Se CI passar + merge na main → Deploy automático:
  1. Push da imagem para registry (ECR, GHCR)
  2. Deploy no Railway/Render/AWS ECS
  3. Prisma migrate deploy (migrations)
  4. Health check — verifica /health
  5. Notifica Slack se sucesso/falha
```

```yaml
# .github/workflows/deploy.yml — exemplo completo
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest

    services:
      postgres:                         # banco para testes
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Build Docker image
        run: docker build -t ${{ secrets.REGISTRY }}/taskflow-api:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_TOKEN }} | docker login ...
          docker push ${{ secrets.REGISTRY }}/taskflow-api:${{ github.sha }}

      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 5.4 Ambientes — Dev, Staging, Production

Todo projeto sério tem pelo menos 3 ambientes:

| Ambiente | Propósito | Deploy | Banco |
|---|---|---|---|
| **Development** | Desenvolvimento local | Manual / `npm run dev` | Docker local |
| **Staging** | Testes antes de produção | Automático em merge no `develop` | Banco isolado |
| **Production** | Usuários reais | Automático em merge no `main` | Banco de produção |

**Regras:**
- Nunca teste diretamente em produção
- Staging deve ser idêntico à produção (mesma infra, mesmas configs)
- Dados de produção nunca vão para staging (LGPD/GDPR)

### 5.5 Deploy — Onde Hospedar

**Para projetos pequenos/médios (recomendado começar aqui):**

| Serviço | Melhor para | Custo |
|---|---|---|
| **Railway** | Backend Node, banco PostgreSQL, tudo junto | ~$5-20/mês |
| **Render** | Backend + worker + cron jobs | Gratuito com limitações |
| **Vercel** | Frontend React/Next.js | Gratuito para projetos pessoais |
| **Fly.io** | Containers com controle de região | Pay-per-use |
| **Supabase** | Banco PostgreSQL + Auth + Storage gerenciado | Gratuito até certo ponto |

**Para projetos maiores (AWS):**

```
Load Balancer (ALB)
       ↓
ECS (containers) × N instâncias
       ↓
RDS (PostgreSQL gerenciado)
ElastiCache (Redis gerenciado)
S3 (arquivos estáticos)
CloudFront (CDN)
```

### 5.6 Monitoramento — Observabilidade na Prática

**Logging estruturado com Pino (muito melhor que console.log):**
```typescript
import pino from 'pino';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }  // output bonito em dev
    : undefined,                  // JSON puro em produção (para agregadores)
});

// Uso — sempre com contexto
logger.info({ userId: user.id, taskId: task.id }, 'Task created');
logger.error({ error: err.message, stack: err.stack }, 'Failed to send email');
```

**Métricas de saúde — o que monitorar:**
- Taxa de erros 5xx (meta: < 0.1%)
- Latência p50/p95/p99 (meta p95: < 500ms)
- Disponibilidade (uptime) (meta: 99.9%)
- Uso de CPU e memória
- Conexões ativas ao banco

**Alertas:** Configure alertas no Datadog/Grafana/New Relic para:
- Taxa de erro sobe > 1%
- p95 latência > 1s
- CPU > 80% por mais de 5 minutos
- Disco > 85%

---

## 6. System Design — Como Sistemas Escalam

### 6.1 Do Monolito ao Distribuído

Começar com um monolito é quase sempre a escolha certa. Um monolito bem estruturado escala muito antes de você precisar de microserviços.

```
Monolito:                    Microserviços:
┌───────────────────┐        ┌──────────┐  ┌──────────┐
│  Frontend         │        │  Auth    │  │  Tasks   │
│  Backend          │        │ Service  │  │ Service  │
│  Worker           │        └────┬─────┘  └────┬─────┘
│  Cron Jobs        │             │              │
│  Tudo junto       │        ┌────▼──────────────▼─────┐
└───────────────────┘        │    Message Bus (Kafka)   │
                             └──────────────────────────┘

Monolito:
✅ Simples de desenvolver e fazer deploy
✅ Sem latência de rede entre serviços
✅ Transações simples
❌ Um bug pode derrubar tudo
❌ Escala o sistema inteiro

Microserviços:
✅ Escala componentes individualmente
✅ Falha isolada
✅ Times independentes
❌ Complexidade de rede, auth entre serviços, debugging
❌ Só faz sentido com múltiplos times grandes
```

### 6.2 Escalabilidade Horizontal vs Vertical

**Vertical (scale up):** Máquina maior. Simples, mas tem limite físico e é caro.

**Horizontal (scale out):** Mais máquinas iguais atrás de um load balancer. Teoricamente infinito, mas requer que a aplicação seja stateless.

```
Load Balancer
  /    |    \
API   API   API   ← mesma aplicação, múltiplas instâncias
  \    |    /
   PostgreSQL    ← banco ainda é único (pode ser um gargalo)
   Redis cache   ← sessões/cache compartilhados entre instâncias
```

**Para escalar horizontalmente, sua app precisa ser stateless:** nenhuma instância guarda estado em memória que as outras não têm. Sessões vão para Redis, arquivos vão para S3.

### 6.3 Cache — O Multiplicador de Performance

```
Sem cache:
Cliente → API → Banco (100ms) → API → Cliente

Com cache:
Cliente → API → Redis (1ms) → API → Cliente

Se não está no Redis:
Cliente → API → Redis MISS → Banco (100ms) → Redis (salva) → API → Cliente
                                        (próxima chamada vai direto do Redis!)
```

**Cache de banco (Redis):** Para queries caras e frequentes
**CDN:** Para assets estáticos (imagens, CSS, JS) próximos ao usuário geograficamente
**Cache HTTP:** Headers `Cache-Control` — browser guarda a resposta

**Invalidação de cache** — o problema mais difícil:
```typescript
// Quando criar/atualizar um projeto, invalida o cache desse projeto
async function updateProject(id: string, data: UpdateProjectDto) {
  const project = await prisma.project.update({ where: { id }, data });

  // Invalida cache
  await redis.del(`project:${id}`);
  await redis.del(`user:${project.userId}:projects`); // lista do usuário também mudou

  return project;
}
```

### 6.4 Message Queues — Desacoplamento e Resiliência

Filas desacoplam o produtor do consumidor. O produtor enfileira um job e segue em frente. O consumidor processa no próprio tempo.

```
SEM FILA:
POST /orders → [cria pedido] → [envia email] → [atualiza estoque] → [gera PDF] → 200 OK
                                                                              (5 segundos!)

COM FILA:
POST /orders → [cria pedido] → [enfileira job] → 201 Created (50ms!)
                                          ↓
                                    Worker: [envia email]
                                    Worker: [atualiza estoque]
                                    Worker: [gera PDF]
                                    (acontece em background, independente)
```

**Casos de uso:** envio de email, processamento de imagem, geração de relatório, notificações push, webhooks.

**BullMQ (Node.js + Redis):**
```typescript
import { Queue, Worker } from 'bullmq';

// Produtor — adiciona job
const emailQueue = new Queue('emails', { connection: redis });

await emailQueue.add('welcome-email', {
  to: user.email,
  name: user.name,
}, {
  attempts: 3,     // tenta 3 vezes em caso de falha
  backoff: { type: 'exponential', delay: 2000 }, // espera 2s, 4s, 8s entre tentativas
});

// Consumidor — processa em background
const worker = new Worker('emails', async (job) => {
  await sendEmail(job.data); // se falhar, BullMQ recoloca na fila
}, { connection: redis });
```

---

## 7. Segurança

### 7.1 OWASP Top 10 — As Vulnerabilidades mais Comuns

**1. SQL/NoSQL Injection**
```typescript
// ❌ VULNERÁVEL — concatenação de string
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Atacante envia: ' OR '1'='1 → retorna todos os usuários!

// ✅ SEGURO — parâmetros preparados
const user = await prisma.user.findFirst({ where: { email } });
// Prisma usa parâmetros automaticamente
```

**2. Broken Authentication**
- JWT secret fraco (use 256 bits aleatórios: `openssl rand -base64 32`)
- Tokens sem expiração
- Senhas sem hash (ou MD5/SHA1)

**3. XSS (Cross-Site Scripting)**
```tsx
// ❌ PERIGOSO
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ SEGURO — React escapa automaticamente
<div>{userContent}</div>

// Se precisar de HTML, use DOMPurify
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

**4. CSRF (Cross-Site Request Forgery)**
```typescript
// Proteção com cookies SameSite
res.cookie('refreshToken', token, {
  httpOnly: true,    // JS não consegue ler
  secure: true,      // só HTTPS
  sameSite: 'strict', // não enviado em requests cross-site
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

**5. Rate Limiting — proteção contra brute force e DDoS**
```typescript
import rateLimit from 'express-rate-limit';

// Limite geral
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP por janela
}));

// Limite mais restrito para autenticação
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // só 10 tentativas de login por 15 min
  message: 'Muitas tentativas. Tente novamente em 15 minutos.',
}));
```

**6. Sensitive Data Exposure**
- Nunca retorne campos sensíveis (password, tokens) nas respostas
- Use HTTPS em tudo
- Logs não devem conter dados pessoais ou senhas

**7. Security Headers (Helmet.js)**
```typescript
import helmet from 'helmet';
app.use(helmet()); // adiciona automaticamente:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Content-Security-Policy: ...
// Strict-Transport-Security: max-age=31536000
```

### 7.2 LGPD/GDPR — O Que Todo Dev Precisa Saber

Se sua aplicação coleta dados de usuários brasileiros, a LGPD se aplica.

**Princípios básicos:**
- **Coleta mínima:** Só colete dados necessários para o serviço
- **Consentimento:** Usuário deve consentir com o uso dos dados
- **Transparência:** Explique o que você faz com os dados (política de privacidade)
- **Direito ao esquecimento:** Usuário pode pedir exclusão de todos os dados
- **Segurança:** Dados devem ser protegidos

**Na prática:**
```typescript
// Endpoint de exclusão de conta (obrigatório pela LGPD)
router.delete('/me', authMiddleware, async (req, res) => {
  await userService.deleteAccount(req.user.id);
  // Apaga ou anonimiza todos os dados do usuário
  res.json({ message: 'Conta excluída com sucesso' });
});
```

---

## 8. Testes

### 8.1 A Pirâmide de Testes

```
          /\
         /  \   E2E / Integration (Playwright)
        /    \   — poucos, lentos, testam o sistema completo
       /──────\
      /        \  Integration Tests
     /          \  — moderados, testam módulos juntos
    /────────────\
   /              \  Unit Tests (Vitest / Jest)
  /                \  — muitos, rápidos, testam funções isoladas
 /──────────────────\
```

**Regra prática:** 70% unit, 20% integration, 10% E2E.

### 8.2 Unit Tests com Vitest

```typescript
// taskService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTask } from './task.service';
import { taskRepo } from './task.repository';

// Mock do repository — não queremos tocar o banco em unit tests
vi.mock('./task.repository');

describe('createTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar uma task e retornar o objeto criado', async () => {
    const mockTask = { id: '1', title: 'Teste', status: 'PENDING' };
    vi.mocked(taskRepo.create).mockResolvedValue(mockTask);

    const result = await createTask({
      title: 'Teste',
      projectId: 'proj-1',
      userId: 'user-1',
    });

    expect(result).toEqual(mockTask);
    expect(taskRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Teste' })
    );
  });

  it('deve lançar erro se título estiver vazio', async () => {
    await expect(
      createTask({ title: '', projectId: 'proj-1', userId: 'user-1' })
    ).rejects.toThrow('Título é obrigatório');
  });
});
```

### 8.3 Integration Tests — Testando a API Completa

```typescript
// tasks.test.ts — testa o endpoint real
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('POST /api/tasks', () => {
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    // Criar usuário e fazer login
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '12345678' });

    const { body } = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: '12345678' });

    token = body.accessToken;
    projectId = body.user.defaultProjectId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@test.com' } });
    await prisma.$disconnect();
  });

  it('deve criar uma task com dados válidos', async () => {
    const { status, body } = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test task', projectId });

    expect(status).toBe(201);
    expect(body.data.title).toBe('Test task');
  });

  it('deve retornar 401 sem token', async () => {
    const { status } = await request(app).post('/api/tasks').send({ title: 'Test' });
    expect(status).toBe(401);
  });

  it('deve retornar 400 com dados inválidos', async () => {
    const { status, body } = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' }); // título vazio

    expect(status).toBe(400);
    expect(body.details.title).toBeDefined();
  });
});
```

### 8.4 E2E com Playwright

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('deve fazer login e redirecionar para o dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name=email]', 'user@test.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Meus Projetos');
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name=email]', 'wrong@test.com');
    await page.fill('[name=password]', 'wrongpassword');
    await page.click('button[type=submit]');

    await expect(page.locator('[role=alert]')).toContainText('Credenciais inválidas');
    await expect(page).toHaveURL('/login'); // continua na página de login
  });
});
```

---

## 9. O Lado do Negócio

### 9.1 Ciclo de Desenvolvimento — Como o Time Funciona na Prática

```
Product Manager → Define o que →  "Quero que usuários possam comentar em tasks"
Designer       → Define o como →  Mockups, fluxo de UX, componentes visuais
Tech Lead      → Estima esforço → "3 dias: API + frontend + testes"
Developer      → Implementa     → Branch, código, PR, code review, merge
QA             → Valida         → Testa em staging, reporta bugs
Deploy         → Vai a produção → CI/CD automático ou manual

CICLO ÁGIL (Scrum/Kanban):
Sprint Planning → Development → Review → Retrospective → repeat (2 semanas)
```

### 9.2 Como Escrever (e Ler) uma boa User Story / Ticket

**User Story:** "Como [tipo de usuário], quero [ação], para que [benefício]."

> "Como membro do projeto, quero comentar em tasks, para que a equipe possa discutir detalhes sem precisar de outra ferramenta."

**Um bom ticket de desenvolvimento contém:**
```
Título: [Feature] Adicionar comentários em tasks

Contexto:
  Usuários precisam discutir detalhes de uma task. Hoje usam Slack separado.

Critérios de Aceite (Definition of Done):
  ✅ Usuário autenticado pode criar comentário em uma task
  ✅ Comentário aparece em tempo real para outros membros do projeto
  ✅ Usuário pode editar/deletar apenas seus próprios comentários
  ✅ Markdown básico no corpo do comentário
  ✅ Testes de integração cobrindo casos principais

Fora de escopo:
  ❌ Menções (@user) — próximo ticket
  ❌ Reações (emoji) — próximo ticket

Notas técnicas:
  - Nova tabela: comments (id, task_id, user_id, content, created_at)
  - WebSocket: emitir 'comment:created' ao criar
  - Endpoint: POST /api/tasks/:id/comments
```

### 9.3 Code Review — Como Fazer e Receber

**Como revisor:**
- Verifique lógica de negócio antes de estilo
- Faça perguntas, não acusações: "Por que escolheu X? Já pensou em Y?"
- Aprove código que funciona, mesmo que não seja como você faria
- Priorize: segurança > correctness > performance > estilo

**Como quem recebe review:**
- Contextualize o PR: o que mudou e por quê
- Não é pessoal — é o código sendo revisado, não você
- Aprenda com o feedback, mas pode discordar com argumentos técnicos
- Responda todos os comentários antes de solicitar novo review

**Tamanho ideal de PR:** Menos de 400 linhas. PRs grandes raramente recebem boa revisão.

### 9.4 Documentação Técnica — O que Documentar

**Documenta:**
- **Por quê**, não o quê (o código já diz o quê)
- Decisões de arquitetura e seus trade-offs (Architecture Decision Records — ADR)
- Como rodar localmente (README)
- Contratos de API (Swagger/OpenAPI)
- Fluxos complexos de negócio

**Não documenta:**
- Código óbvio (`// incrementa i de 1 em 1` → `i++`)
- Documentação que vai ficar desatualizada

**OpenAPI/Swagger — documentação de API:**
```typescript
// Usando Swagger UI + swagger-jsdoc
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Cria uma nova task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskDto'
 *     responses:
 *       201:
 *         description: Task criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.post('/', authMiddleware, validate(createTaskSchema), taskController.create);
```

### 9.5 Débito Técnico — Reconhecer e Gerenciar

Débito técnico são atalhos tomados agora que criam trabalho futuro. Não é inerentemente ruim — às vezes é a decisão correta. O problema é não reconhecer e não pagar a dívida.

**Tipos:**
- **Proposital:** "Vou hardcodar esse valor por agora, crio ticket para corrigir depois"
- **Acidental:** "Não sabia de uma forma melhor quando escrevi isso"
- **Bit rot:** "Funcionava, mas o contexto mudou e agora está errado"

**Como gerenciar:**
1. Nomeie o débito — crie um ticket quando identificar
2. Priorize junto com features — débito técnico vai à backlog
3. Use a regra do boy scout: "deixe o código melhor do que encontrou"

### 9.6 Comunicação com Não-Técnicos

Um sênior não é só bom em código — é bom em traduzir técnico para negócio.

**Evite:**
> "Preciso de 2 semanas para refatorar o módulo de auth porque o acoplamento alto está causando alta complexidade ciclomática."

**Prefira:**
> "Precisamos de 2 semanas para melhorar a parte de login. Hoje, qualquer alteração nela tem alto risco de criar bugs em outros lugares. Esse investimento vai acelerar as próximas features que dependem disso."

---

## 10. Ferramentas e Ecossistema — O Mapa Completo

### Frontend

| Categoria | Ferramenta | Por que usar |
|---|---|---|
| **Framework UI** | React 18 | Mercado dominante, ecossistema enorme |
| **Build tool** | Vite | Mais rápido que Webpack/CRA |
| **Linguagem** | TypeScript | Segurança de tipos, refactoring seguro |
| **Estilo** | Tailwind CSS | Sem sair do HTML, consistente |
| **Componentes** | shadcn/ui + Radix | Acessível, customizável, sem CSS-in-JS |
| **Roteamento** | React Router v6 | Padrão do mercado |
| **Estado servidor** | TanStack Query | Cache, loading, refetch automático |
| **Estado global** | Zustand | Simples, sem boilerplate |
| **Forms** | React Hook Form + Zod | Performance, validação tipada |
| **HTTP** | Axios | Interceptors, instâncias configuráveis |
| **Realtime** | Socket.io-client | WebSockets com fallback |
| **Animação** | Framer Motion | Fluído e declarativo |
| **Icons** | Lucide React | Leve, customizável |
| **Testes unit** | Vitest + Testing Library | Rápido, integrado com Vite |
| **Testes E2E** | Playwright | Mais robusto que Cypress |

### Backend

| Categoria | Ferramenta | Por que usar |
|---|---|---|
| **Runtime** | Node.js 20 LTS | Ecossistema, async, mesmo TS do front |
| **Framework** | Express | Simples, flexível, mais usado |
| **Alternativa** | Fastify | 2-3x mais rápido que Express |
| **ORM** | Prisma | Tipagem perfeita, migrations, dev experience |
| **Validação** | Zod | TypeScript-first, reutilizável com frontend |
| **Auth** | JWT + bcryptjs | Stateless, simples |
| **Realtime** | Socket.io | WebSockets com rooms, namespaces |
| **Filas** | BullMQ | Redis-based, retry, dashboard |
| **Logger** | Pino | O mais rápido, JSON estruturado |
| **Testes** | Vitest + Supertest | Fast, moderno |
| **Docs API** | Swagger/OpenAPI | Padrão de mercado |

### Banco de Dados

| Categoria | Ferramenta | Por que usar |
|---|---|---|
| **SQL** | PostgreSQL | O melhor banco open-source |
| **Cache** | Redis | Ultra-rápido, estruturas de dados ricas |
| **Search** | Elasticsearch / Algolia | Full-text search |
| **Migrations** | Prisma Migrate | Integrado com o ORM |

### DevOps

| Categoria | Ferramenta | Por que usar |
|---|---|---|
| **Containers** | Docker + Compose | Portabilidade, ambiente igual em qualquer máquina |
| **CI/CD** | GitHub Actions | Integrado com GitHub, gratuito para OSS |
| **Deploy simples** | Railway / Render | Fácil, barato, CI integrado |
| **Deploy avançado** | AWS ECS / GCP Cloud Run | Controle total, escalável |
| **Frontend deploy** | Vercel | CDN global, preview por PR |
| **IaC** | Terraform | Infra como código, versionável |
| **Secrets** | GitHub Secrets / Doppler | Gerenciar variáveis por ambiente |
| **Monitoramento** | Datadog / Grafana + Prometheus | Métricas, dashboards, alertas |
| **Erros** | Sentry | Rastreamento de erros em produção |
| **Uptime** | BetterUptime / UptimeRobot | Alerta quando o serviço cai |

### Comunicação e Gestão

| Categoria | Ferramenta |
|---|---|
| **Chat** | Slack / Discord |
| **Kanban/Scrum** | Linear / Jira / Notion |
| **Docs** | Notion / Confluence |
| **Design** | Figma |
| **API Testing** | Insomnia / Bruno (open-source) |
| **DB GUI** | TablePlus / Prisma Studio |
| **Git GUI** | GitLens (VS Code extension) |

---

*Este guia é um mapa — não um substituto para a prática. Construir projetos reais, ler código de outros devs sêniors e participar de code reviews são os aceleradores mais efetivos dessa jornada.*
