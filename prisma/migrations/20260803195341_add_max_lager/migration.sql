-- CreateEnum
CREATE TYPE "MaxLagerMovementType" AS ENUM ('TRANSFER_IN', 'SALE', 'ADJUST');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'TRANSFER_OUT';

-- AlterEnum
ALTER TYPE "PackagingMovementType" ADD VALUE 'TRANSFER_OUT';

-- CreateTable
CREATE TABLE "MaxLagerStock" (
    "id" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaxLagerStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxLagerMovement" (
    "id" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "type" "MaxLagerMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxLagerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxLagerPackagingStock" (
    "id" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaxLagerPackagingStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxLagerPackagingMovement" (
    "id" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "type" "MaxLagerMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxLagerPackagingMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaxLagerSale" (
    "id" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recipient" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "pushedToShopify" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxLagerSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaxLagerStock_sizeId_key" ON "MaxLagerStock"("sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "MaxLagerPackagingStock_packSize_key" ON "MaxLagerPackagingStock"("packSize");

-- AddForeignKey
ALTER TABLE "MaxLagerStock" ADD CONSTRAINT "MaxLagerStock_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaxLagerMovement" ADD CONSTRAINT "MaxLagerMovement_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaxLagerSale" ADD CONSTRAINT "MaxLagerSale_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
