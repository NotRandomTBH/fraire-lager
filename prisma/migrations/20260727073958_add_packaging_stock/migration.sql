-- CreateEnum
CREATE TYPE "PackagingMovementType" AS ENUM ('RECEIVE', 'USED');

-- CreateTable
CREATE TABLE "PackagingStock" (
    "id" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingMovement" (
    "id" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "type" "PackagingMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagingMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagingStock_packSize_key" ON "PackagingStock"("packSize");
