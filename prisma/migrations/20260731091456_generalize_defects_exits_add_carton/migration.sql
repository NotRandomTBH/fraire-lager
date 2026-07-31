-- CreateEnum
CREATE TYPE "DefectItemType" AS ENUM ('UNTERHOSE', 'VERPACKUNG', 'KARTON');

-- CreateEnum
CREATE TYPE "CartonMovementType" AS ENUM ('RECEIVE', 'EXIT', 'ADJUST');

-- CreateEnum
CREATE TYPE "StockExitItemType" AS ENUM ('UNTERHOSE', 'VERPACKUNGSMATERIAL', 'KARTON');

-- AlterEnum
ALTER TYPE "PackagingMovementType" ADD VALUE 'EXIT';

-- DropForeignKey
ALTER TABLE "DefectReport" DROP CONSTRAINT "DefectReport_sizeId_fkey";

-- DropForeignKey
ALTER TABLE "StockExit" DROP CONSTRAINT "StockExit_sizeId_fkey";

-- AlterTable
ALTER TABLE "DefectReport" ADD COLUMN     "itemType" "DefectItemType" NOT NULL DEFAULT 'UNTERHOSE',
ADD COLUMN     "packSize" INTEGER,
ALTER COLUMN "sizeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StockExit" ADD COLUMN     "itemType" "StockExitItemType" NOT NULL DEFAULT 'UNTERHOSE',
ALTER COLUMN "sizeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CartonStock" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartonStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartonMovement" (
    "id" TEXT NOT NULL,
    "type" "CartonMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartonMovement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExit" ADD CONSTRAINT "StockExit_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;
