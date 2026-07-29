/*
  Warnings:

  - You are about to drop the column `vatRate` on the `Product` table. All the data in the column will be lost.
  - Added the required column `vatCategory` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VatCategory" AS ENUM ('EDUCATION', 'ELECTRONIC', 'GOODS', 'TRANSLATION');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "vatRate",
ADD COLUMN     "vatCategory" "VatCategory" NOT NULL;
