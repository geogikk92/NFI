/*
  Warnings:

  - You are about to drop the `ContentSnippet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Page` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ContentSnippet";

-- DropTable
DROP TABLE "Page";

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bg" TEXT,
    "de" TEXT,
    "en" TEXT,
    "draftBg" TEXT,
    "draftDe" TEXT,
    "draftEn" TEXT,
    "hasDraft" BOOLEAN NOT NULL DEFAULT false,
    "baseHash" TEXT,
    "publishedAt" TIMESTAMP(3),
    "draftUpdatedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_key_key" ON "ContentBlock"("key");
