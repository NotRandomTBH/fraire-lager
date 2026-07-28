-- CreateTable
CREATE TABLE "StockExit" (
    "id" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "packSize" INTEGER,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "recipient" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "pushedToShopify" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockExit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockExit" ADD CONSTRAINT "StockExit_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
