-- CreateEnum
CREATE TYPE "CoverColor" AS ENUM ('INK', 'RED', 'GREEN', 'GOLD');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "coverBrand" TEXT,
ADD COLUMN     "coverColor" "CoverColor" NOT NULL DEFAULT 'INK',
ADD COLUMN     "coverEyebrow" TEXT,
ADD COLUMN     "coverMeta" TEXT,
ADD COLUMN     "coverTitle" TEXT;
