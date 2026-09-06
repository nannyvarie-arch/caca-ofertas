-- CreateTable
CREATE TABLE "TrackedOffer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adLibraryId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "adCountCurrent" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCountSnapshot" (
    "id" TEXT NOT NULL,
    "trackedOfferId" TEXT NOT NULL,
    "adCount" INTEGER NOT NULL,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "newCreatives" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaTranscript" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "sourceRef" TEXT,
    "fileName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt',
    "text" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "usedToday" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClonedPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'sales',
    "title" TEXT,
    "structure" JSONB NOT NULL DEFAULT '{}',
    "assets" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClonedPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwipeDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwipeCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwipeCollectionItem" (
    "collectionId" TEXT NOT NULL,
    "savedAdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeCollectionItem_pkey" PRIMARY KEY ("collectionId","savedAdId")
);

-- CreateIndex
CREATE INDEX "TrackedOffer_userId_idx" ON "TrackedOffer"("userId");

-- CreateIndex
CREATE INDEX "TrackedOffer_status_idx" ON "TrackedOffer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedOffer_userId_adLibraryId_key" ON "TrackedOffer"("userId", "adLibraryId");

-- CreateIndex
CREATE INDEX "AdCountSnapshot_trackedOfferId_takenAt_idx" ON "AdCountSnapshot"("trackedOfferId", "takenAt" DESC);

-- CreateIndex
CREATE INDEX "MediaTranscript_userId_createdAt_idx" ON "MediaTranscript"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AnalysisQuota_userId_idx" ON "AnalysisQuota"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisQuota_userId_domain_date_key" ON "AnalysisQuota"("userId", "domain", "date");

-- CreateIndex
CREATE INDEX "ClonedPage_userId_createdAt_idx" ON "ClonedPage"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SwipeDecision_userId_createdAt_idx" ON "SwipeDecision"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SwipeDecision_userId_adId_key" ON "SwipeDecision"("userId", "adId");

-- CreateIndex
CREATE INDEX "SwipeCollection_userId_idx" ON "SwipeCollection"("userId");

-- AddForeignKey
ALTER TABLE "TrackedOffer" ADD CONSTRAINT "TrackedOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCountSnapshot" ADD CONSTRAINT "AdCountSnapshot_trackedOfferId_fkey" FOREIGN KEY ("trackedOfferId") REFERENCES "TrackedOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaTranscript" ADD CONSTRAINT "MediaTranscript_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisQuota" ADD CONSTRAINT "AnalysisQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClonedPage" ADD CONSTRAINT "ClonedPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeDecision" ADD CONSTRAINT "SwipeDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeCollection" ADD CONSTRAINT "SwipeCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeCollectionItem" ADD CONSTRAINT "SwipeCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "SwipeCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeCollectionItem" ADD CONSTRAINT "SwipeCollectionItem_savedAdId_fkey" FOREIGN KEY ("savedAdId") REFERENCES "SavedAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;
