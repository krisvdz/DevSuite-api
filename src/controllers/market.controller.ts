import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../lib/prisma'
import { env } from '../lib/env'
import { AppError } from '../middlewares/error.middleware'
import { fetchFinancialNews } from '../lib/rss'

// ─── Supported ETFs ───────────────────────────────────────────────────────────
const SUPPORTED_ETFS = ['SPY', 'QQQ', 'GLD', 'IAU', 'USO', 'XLE', 'BITO', 'GBTC', 'VT', 'VTI', 'EWZ', 'TLT'] as const

const ETF_NAMES: Record<string, string> = {
  SPY: 'SPDR S&P 500 ETF',
  QQQ: 'Invesco Nasdaq-100 ETF',
  GLD: 'SPDR Gold Shares',
  IAU: 'iShares Gold Trust',
  USO: 'United States Oil Fund',
  XLE: 'Energy Select Sector SPDR',
  BITO: 'ProShares Bitcoin ETF',
  GBTC: 'Grayscale Bitcoin Trust',
  VT: 'Vanguard Total World Stock ETF',
  VTI: 'Vanguard Total Stock Market ETF',
  EWZ: 'iShares MSCI Brazil ETF',
  TLT: 'iShares 20+ Year Treasury Bond ETF',
}

// ─── Validation Schemas ───────────────────────────────────────────────────────
const allocationSchema = z.object({
  etfSymbol: z.string().toUpperCase().refine(
    (s) => (SUPPORTED_ETFS as readonly string[]).includes(s),
    { message: `ETF deve ser um dos suportados: ${SUPPORTED_ETFS.join(', ')}` }
  ),
  percentage: z.number().min(0.1, 'Porcentagem mínima é 0.1%').max(100, 'Porcentagem máxima é 100%'),
})

const savePortfolioSchema = z.object({
  allocations: z
    .array(allocationSchema)
    .min(1, 'Adicione pelo menos 1 ETF')
    .max(12, 'Máximo de 12 ETFs por carteira')
    .refine(
      (items) => {
        const symbols = items.map((i) => i.etfSymbol)
        return new Set(symbols).size === symbols.length
      },
      { message: 'Não pode ter o mesmo ETF duas vezes na carteira' }
    )
    .refine(
      (items) => {
        const total = items.reduce((sum, i) => sum + i.percentage, 0)
        return Math.abs(total - 100) < 0.1
      },
      { message: 'A soma das porcentagens deve ser exatamente 100%' }
    ),
})

// ─── In-memory price cache ────────────────────────────────────────────────────
interface PriceData {
  symbol: string
  name: string
  price: number
  changePercent: number
  previousClose: number
  fetchedAt: string
}

let priceCache: { data: PriceData[]; fetchedAt: number } | null = null
const PRICE_CACHE_TTL_MS = 60 * 1000 // 1 minute

async function fetchYahooQuote(symbols: string): Promise<PriceData[]> {
  // Try v7 batch endpoint first
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose&formatted=false`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose&formatted=false`,
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) continue

      const json = await response.json() as {
        quoteResponse?: {
          result?: Array<{
            symbol: string
            regularMarketPrice?: number
            regularMarketChangePercent?: number
            regularMarketPreviousClose?: number
          }>
        }
      }

      const results = json?.quoteResponse?.result
      if (!results || results.length === 0) continue

      const fetchedAt = new Date().toISOString()
      return results.map((r) => ({
        symbol: r.symbol,
        name: ETF_NAMES[r.symbol] ?? r.symbol,
        price: r.regularMarketPrice ?? 0,
        changePercent: r.regularMarketChangePercent ?? 0,
        previousClose: r.regularMarketPreviousClose ?? 0,
        fetchedAt,
      }))
    } catch {
      // Try next URL
    }
  }

  throw new AppError(
    'Não foi possível buscar preços dos ETFs. O mercado pode estar fechado ou a fonte de dados indisponível.',
    502,
    'PRICES_FETCH_ERROR'
  )
}

async function fetchEtfPrices(): Promise<PriceData[]> {
  const now = Date.now()
  if (priceCache && now - priceCache.fetchedAt < PRICE_CACHE_TTL_MS) {
    return priceCache.data
  }

  const symbols = SUPPORTED_ETFS.join(',')
  const data = await fetchYahooQuote(symbols)
  priceCache = { data, fetchedAt: now }
  return data
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getPortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const allocations = await prisma.etfPortfolio.findMany({
      where: { userId },
      orderBy: { percentage: 'desc' },
    })
    return res.json({ data: allocations })
  } catch (error) {
    next(error)
  }
}

export async function savePortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { allocations } = savePortfolioSchema.parse(req.body)

    const saved = await prisma.$transaction(async (tx) => {
      await tx.etfPortfolio.deleteMany({ where: { userId } })
      await tx.etfPortfolio.createMany({
        data: allocations.map((a) => ({
          userId,
          etfSymbol: a.etfSymbol,
          percentage: a.percentage,
        })),
      })
      return tx.etfPortfolio.findMany({
        where: { userId },
        orderBy: { percentage: 'desc' },
      })
    })

    return res.json({ data: saved })
  } catch (error) {
    next(error)
  }
}

export async function getPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await fetchEtfPrices()
    const cachedUntil = priceCache
      ? new Date(priceCache.fetchedAt + PRICE_CACHE_TTL_MS).toISOString()
      : new Date().toISOString()
    return res.json({ data, cachedUntil })
  } catch (error) {
    next(error)
  }
}

export async function getNews(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await fetchFinancialNews()
    return res.json({ data: items })
  } catch (error) {
    next(error)
  }
}

export async function getAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const analysis = await prisma.marketAnalysis.findUnique({ where: { userId } })
    return res.json({ data: analysis })
  } catch (error) {
    next(error)
  }
}

export async function generateAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.ANTHROPIC_API_KEY) {
      throw new AppError(
        'ANTHROPIC_API_KEY não configurada. Adicione a chave no arquivo .env do servidor.',
        503,
        'ANTHROPIC_KEY_MISSING'
      )
    }

    const userId = req.user!.id

    // Fetch portfolio, prices, and news in parallel
    const [portfolio, prices, news] = await Promise.all([
      prisma.etfPortfolio.findMany({ where: { userId }, orderBy: { percentage: 'desc' } }),
      fetchEtfPrices(),
      fetchFinancialNews(),
    ])

    if (portfolio.length === 0) {
      throw new AppError('Configure sua carteira antes de gerar uma análise.', 400, 'EMPTY_PORTFOLIO')
    }

    // Filter prices to only the user's portfolio symbols
    const portfolioSymbols = new Set(portfolio.map((p) => p.etfSymbol))
    const relevantPrices = prices.filter((p) => portfolioSymbols.has(p.symbol))

    // Top 5 most recent news items
    const top5News = news.slice(0, 5)

    const portfolioText = portfolio
      .map((p) => `- ${p.etfSymbol} (${ETF_NAMES[p.etfSymbol] ?? p.etfSymbol}): ${p.percentage}% da carteira`)
      .join('\n')

    const pricesText = relevantPrices
      .map((p) => {
        const sign = p.changePercent >= 0 ? '+' : ''
        return `- ${p.symbol}: $${p.price.toFixed(2)} (${sign}${p.changePercent.toFixed(2)}% hoje)`
      })
      .join('\n')

    const newsText = top5News
      .map((n, i) => `${i + 1}. [${n.source}] ${n.title}`)
      .join('\n')

    const systemPrompt = `Você é um analista financeiro especializado em ETFs globais. Sua função é analisar a carteira do usuário com base nos preços atuais dos ativos e nas últimas notícias do mercado financeiro. Você sempre responde em português brasileiro. Você retorna APENAS JSON válido, sem markdown, sem blocos de código, sem texto adicional.`

    const userPrompt = `Analise a carteira de ETFs abaixo e forneça recomendações de ação para cada ativo.

## Carteira do Usuário
${portfolioText}

## Preços Atuais
${pricesText}

## Notícias Recentes (top 5)
${newsText}

## Formato de Resposta (JSON estrito, sem markdown)
{
  "summary": "Parágrafo de 3-4 linhas resumindo o cenário de mercado atual e o impacto geral na carteira do usuário",
  "actions": [
    {
      "symbol": "TICKER",
      "action": "COMPRAR",
      "justification": "Justificativa em 1-2 frases em português",
      "confidence": "ALTA"
    }
  ]
}

Regras:
- action deve ser exatamente "COMPRAR", "VENDER" ou "MANTER"
- confidence deve ser exatamente "ALTA", "MEDIA" ou "BAIXA"
- Inclua APENAS os ETFs que constam na carteira do usuário
- Baseie as recomendações nas notícias e nos movimentos de preço`

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let analysisContent: unknown
    try {
      // Remove possible markdown code blocks just in case
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysisContent = JSON.parse(cleaned)
    } catch {
      throw new AppError('Falha ao processar resposta da IA. Tente novamente.', 502, 'AI_PARSE_ERROR')
    }

    const stored = await prisma.marketAnalysis.upsert({
      where: { userId },
      update: { content: analysisContent as object, createdAt: new Date() },
      create: { userId, content: analysisContent as object },
    })

    return res.json({ data: stored })
  } catch (error) {
    next(error)
  }
}

// Export supported ETFs list for frontend use
export { SUPPORTED_ETFS, ETF_NAMES }
