-- CreateTable
CREATE TABLE "etf_portfolios" (
    "id" TEXT NOT NULL,
    "etfSymbol" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "etf_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_analyses" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "market_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "etf_portfolios_userId_idx" ON "etf_portfolios"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "etf_portfolios_userId_etfSymbol_key" ON "etf_portfolios"("userId", "etfSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "market_analyses_userId_key" ON "market_analyses"("userId");

-- AddForeignKey
ALTER TABLE "etf_portfolios" ADD CONSTRAINT "etf_portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_analyses" ADD CONSTRAINT "market_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
