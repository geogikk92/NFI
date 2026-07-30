-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "summaryEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "FreeMaterial" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "titleEn" TEXT;
