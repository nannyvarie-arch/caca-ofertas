-- FASE 11: classificação manual (1..5) e score de oportunidade (0..100) em SavedAd.
-- Ambas as colunas são NULLABLE, portanto seguras para dados já existentes.

-- AlterTable
ALTER TABLE "SavedAd" ADD COLUMN "classification" INTEGER;
ALTER TABLE "SavedAd" ADD COLUMN "score" INTEGER;

-- CreateIndex
CREATE INDEX "SavedAd_classification_idx" ON "SavedAd"("classification");

-- CreateIndex
CREATE INDEX "SavedAd_score_idx" ON "SavedAd"("score");
