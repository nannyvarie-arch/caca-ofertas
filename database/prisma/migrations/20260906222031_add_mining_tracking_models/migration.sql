-- CreateTable
CREATE TABLE "MiningSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'manual',
    "niche" TEXT,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiningSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedAdId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "niche" TEXT,
    "maxResults" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultsFound" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiningJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiningSearch_userId_createdAt_idx" ON "MiningSearch"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackingEvent_savedAdId_createdAt_idx" ON "TrackingEvent"("savedAdId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackingEvent_userId_idx" ON "TrackingEvent"("userId");

-- CreateIndex
CREATE INDEX "MiningJob_userId_createdAt_idx" ON "MiningJob"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MiningSearch" ADD CONSTRAINT "MiningSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_savedAdId_fkey" FOREIGN KEY ("savedAdId") REFERENCES "SavedAd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiningJob" ADD CONSTRAINT "MiningJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
