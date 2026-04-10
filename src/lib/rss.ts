// ─── RSS Feed Utility ─────────────────────────────────────────────────────────
// Fetches and parses financial RSS feeds to get market news.
// Uses fast-xml-parser + native fetch (Node 18+). Zero external API keys needed.

import { XMLParser } from 'fast-xml-parser'

export interface NewsItem {
  title: string
  source: string
  url: string
  publishedAt: string
  relevanceTags: string[]
}

// RSS feed sources — all free, no API key required
// Using multiple sources so that if one fails, others still provide data
const RSS_FEEDS = [
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', source: 'MarketWatch' },
  { url: 'https://finance.yahoo.com/rss/headline?s=SPY', source: 'Yahoo Finance' },
  { url: 'https://finance.yahoo.com/rss/headline?s=GLD', source: 'Yahoo Finance' },
  { url: 'https://www.investing.com/rss/news_285.rss', source: 'Investing.com' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters' },
]

// Maps keywords in headlines to ETF tickers for relevance tagging
const RELEVANCE_MAP: Array<{ keywords: string[]; tags: string[] }> = [
  { keywords: ['gold', 'ouro', 'bullion', 'precious metal', 'xau'], tags: ['GLD', 'IAU'] },
  { keywords: ['oil', 'crude', 'petroleum', 'petróleo', 'opec', 'brent', 'wti', 'energy'], tags: ['USO', 'XLE'] },
  { keywords: ['bitcoin', 'btc', 'crypto', 'cryptocurrency', 'criptomoeda'], tags: ['BITO', 'GBTC'] },
  { keywords: ['s&p', 's&p 500', 'sp500', 'dow jones', 'wall street', 'stocks', 'equities', 'bolsa'], tags: ['SPY'] },
  { keywords: ['nasdaq', 'tech', 'technology', 'tecnologia', 'ai', 'artificial intelligence'], tags: ['QQQ'] },
  { keywords: ['brazil', 'brasil', 'ibovespa', 'bovespa', 'ibov'], tags: ['EWZ'] },
  { keywords: ['bond', 'treasury', 'yield', 'fed', 'interest rate', 'taxa de juros', 'federal reserve'], tags: ['TLT'] },
  { keywords: ['global', 'world', 'emerging market', 'mercado emergente', 'etf'], tags: ['VT', 'VTI'] },
]

function getRelevanceTags(title: string): string[] {
  const lower = title.toLowerCase()
  const tags = new Set<string>()
  for (const entry of RELEVANCE_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      entry.tags.forEach((t) => tags.add(t))
    }
  }
  return Array.from(tags)
}

async function fetchFeed(feedUrl: string, source: string): Promise<NewsItem[]> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'DevSuite/1.0 (financial news aggregator)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return []

    const xml = await response.text()
    const parsed = parser.parse(xml)

    // Handle both RSS 2.0 and Atom formats
    const channel = parsed?.rss?.channel || parsed?.feed
    if (!channel) return []

    const rawItems: unknown[] = Array.isArray(channel.item)
      ? channel.item
      : channel.item
      ? [channel.item]
      : Array.isArray(channel.entry)
      ? channel.entry
      : channel.entry
      ? [channel.entry]
      : []

    return rawItems
      .slice(0, 15)
      .map((item: unknown) => {
        const i = item as Record<string, unknown>
        const title = String(i.title || '').replace(/<[^>]*>/g, '').trim()
        const url = String(i.link || i.url || i.id || '')
        const pubDate = String(i.pubDate || i.published || i.updated || '')
        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()

        return {
          title,
          source,
          url,
          publishedAt,
          relevanceTags: getRelevanceTags(title),
        } satisfies NewsItem
      })
      .filter((item) => item.title.length > 5)
  } catch {
    // Silently fail per feed — we have multiple sources
    return []
  }
}

// In-memory cache: { items, fetchedAt }
let newsCache: { items: NewsItem[]; fetchedAt: number } | null = null
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function fetchFinancialNews(): Promise<NewsItem[]> {
  const now = Date.now()
  if (newsCache && now - newsCache.fetchedAt < NEWS_CACHE_TTL_MS) {
    return newsCache.items
  }

  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.source))
  )

  const allItems = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  // Deduplicate by title similarity (simple prefix check)
  const seen = new Set<string>()
  const deduplicated = allItems.filter((item) => {
    const key = item.title.slice(0, 60).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const items = deduplicated.slice(0, 25)
  newsCache = { items, fetchedAt: now }
  return items
}
