-- CreateTable
CREATE TABLE "StockExitNote" (
    "id" TEXT NOT NULL,
    "stockExitId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockExitNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockExitNote" ADD CONSTRAINT "StockExitNote_stockExitId_fkey" FOREIGN KEY ("stockExitId") REFERENCES "StockExit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
