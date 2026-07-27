/*
  Warnings:

  - You are about to drop the `SalesSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SalesSnapshot";

-- CreateTable
CREATE TABLE "DailySales" (
    "id" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "packsSold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReorderSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 80,
    "safetyBufferDays" INTEGER NOT NULL DEFAULT 14,
    "warningWindowDays" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "ReorderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailySales_sizeId_packSize_date_key" ON "DailySales"("sizeId", "packSize", "date");

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
