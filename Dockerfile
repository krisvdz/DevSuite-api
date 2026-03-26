# ═══════════════════════════════════════════════════════════════════════════
# DOCKERFILE — Instruções para construir a imagem Docker da API
# ═══════════════════════════════════════════════════════════════════════════
#
# 📚 CONCEITO: Docker e Containers
#
# Um container é uma unidade isolada que empacota aplicação + dependências +
# configurações de sistema. É como uma VM, mas muito mais leve pois compartilha
# o kernel do host.
#
# Benefícios:
# - "Works on my machine" → funciona em QUALQUER lugar que tenha Docker
# - Isolamento: aplicações não interferem entre si
# - Consistência: dev/staging/produção usam o mesmo ambiente
# - Deploy simples: uma imagem = um artifact
#
# 📚 CONCEITO: Multi-stage Build
#
# Construímos em múltiplas etapas para reduzir o tamanho da imagem final.
# A imagem de desenvolvimento tem TypeScript, tsx, etc.
# A imagem de produção tem apenas o JavaScript compilado + runtime Node.
# Resultado: imagem de prod muito menor (~200MB vs ~800MB)

# ═══════════════════════════════════════════════════════════════════════════
# STAGE 1: Base — configurações compartilhadas
# ═══════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS base

# alpine = versão mínima do Linux (~5MB vs ~200MB do debian)
# Ideal para produção: menos superfície de ataque

WORKDIR /app

# Copia arquivos de dependências separadamente do código
# 📚 CONCEITO: Layer Caching do Docker
# Docker constrói imagens em camadas (layers). Se um arquivo não mudou,
# a camada é reutilizada do cache (muito mais rápido!).
# Por isso copiamos package.json ANTES do código — as dependências
# raramente mudam, então o npm install fica em cache entre builds.
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# ═══════════════════════════════════════════════════════════════════════════
# STAGE 2: Development — com devDependencies (TypeScript, tsx, etc.)
# ═══════════════════════════════════════════════════════════════════════════
FROM base AS development

ENV NODE_ENV=development

RUN npm ci  # ci = install limpo baseado no package-lock.json (mais confiável que npm install)

COPY . .

# Gera o Prisma Client
RUN npm run db:generate

EXPOSE 4000

CMD ["npm", "run", "dev"]

# ═══════════════════════════════════════════════════════════════════════════
# STAGE 3: Builder — compila TypeScript para JavaScript
# ═══════════════════════════════════════════════════════════════════════════
FROM base AS builder

RUN npm ci

COPY . .

RUN npm run db:generate
RUN npm run build  # tsc → gera pasta dist/

# ═══════════════════════════════════════════════════════════════════════════
# STAGE 4: Production — imagem mínima apenas com o necessário
# ═══════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Copia apenas dependências de produção (sem devDependencies)
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

RUN npm ci --only=production && npm run db:generate --if-present || true
RUN npm prune --production

# Copia o código compilado do stage builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 📚 Boa prática: não rode como root em produção!
# Cria usuário sem privilégios e usa ele
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

# 📚 CONCEITO: ENTRYPOINT vs CMD
# CMD: comando padrão, pode ser sobrescrito (docker run ... node other.js)
# ENTRYPOINT: comando fixo, não pode ser sobrescrito facilmente
# Aqui usamos CMD para flexibilidade
CMD ["node", "dist/app.js"]
