-- AlterTable
ALTER TABLE "DefectPhoto" ADD COLUMN     "createdBy" TEXT;

-- CreateTable
CREATE TABLE "DefectNote" (
    "id" TEXT NOT NULL,
    "defectReportId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectEdit" (
    "id" TEXT NOT NULL,
    "defectReportId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectEdit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DefectNote" ADD CONSTRAINT "DefectNote_defectReportId_fkey" FOREIGN KEY ("defectReportId") REFERENCES "DefectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectEdit" ADD CONSTRAINT "DefectEdit_defectReportId_fkey" FOREIGN KEY ("defectReportId") REFERENCES "DefectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
