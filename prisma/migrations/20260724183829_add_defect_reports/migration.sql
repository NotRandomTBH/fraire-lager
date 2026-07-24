-- CreateTable
CREATE TABLE "DefectReport" (
    "id" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectPhoto" (
    "id" TEXT NOT NULL,
    "defectReportId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectPhoto" ADD CONSTRAINT "DefectPhoto_defectReportId_fkey" FOREIGN KEY ("defectReportId") REFERENCES "DefectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
