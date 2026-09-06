-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "adLibraryId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "advertiserName" TEXT,
    "primaryDomain" TEXT,
    "funnelUrl" TEXT,
    "adLibraryUrl" TEXT,
    "niche" TEXT,
    "subniche" TEXT,
    "country" TEXT,
    "language" TEXT,
    "mediaType" TEXT,
    "isLowTicket" BOOLEAN NOT NULL DEFAULT false,
    "lowTicketSignals" JSONB NOT NULL DEFAULT '[]',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'coletando',
    "qualification" TEXT,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferSnapshot" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "activeAds" INTEGER NOT NULL DEFAULT 0,
    "totalAds" INTEGER NOT NULL DEFAULT 0,
    "creativeCount" INTEGER NOT NULL DEFAULT 0,
    "runningDays" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMiningRun" (
    "id" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "keywordsUsed" JSONB NOT NULL DEFAULT '[]',
    "adsFound" INTEGER NOT NULL DEFAULT 0,
    "offersUpserted" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMiningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "niche" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_niche_idx" ON "Offer"("niche");

-- CreateIndex
CREATE INDEX "Offer_isLowTicket_idx" ON "Offer"("isLowTicket");

-- CreateIndex
CREATE INDEX "Offer_lastRunDate_idx" ON "Offer"("lastRunDate");

-- CreateIndex
CREATE INDEX "Offer_lastSeenAt_idx" ON "Offer"("lastSeenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_adLibraryId_key" ON "Offer"("adLibraryId");

-- CreateIndex
CREATE INDEX "OfferSnapshot_offerId_takenAt_idx" ON "OfferSnapshot"("offerId", "takenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMiningRun_runDate_key" ON "DailyMiningRun"("runDate");

-- CreateIndex
CREATE INDEX "DailyMiningRun_runDate_idx" ON "DailyMiningRun"("runDate" DESC);

-- CreateIndex
CREATE INDEX "KeywordFavorite_userId_idx" ON "KeywordFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordFavorite_userId_keyword_key" ON "KeywordFavorite"("userId", "keyword");

-- AddForeignKey
ALTER TABLE "OfferSnapshot" ADD CONSTRAINT "OfferSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordFavorite" ADD CONSTRAINT "KeywordFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
