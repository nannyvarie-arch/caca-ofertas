-- CreateTable
CREATE TABLE "Ebook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT,
    "description" TEXT,
    "themeId" TEXT NOT NULL DEFAULT 'editorial',
    "coverConfig" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbookAsset" (
    "id" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'upload',
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbookAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ebook_userId_updatedAt_idx" ON "Ebook"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "EbookAsset_ebookId_idx" ON "EbookAsset"("ebookId");

-- AddForeignKey
ALTER TABLE "Ebook" ADD CONSTRAINT "Ebook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EbookAsset" ADD CONSTRAINT "EbookAsset_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
