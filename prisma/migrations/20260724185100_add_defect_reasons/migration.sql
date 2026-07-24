-- CreateTable
CREATE TABLE "DefectReason" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefectReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DefectReasonToDefectReport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DefectReasonToDefectReport_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefectReason_label_key" ON "DefectReason"("label");

-- CreateIndex
CREATE INDEX "_DefectReasonToDefectReport_B_index" ON "_DefectReasonToDefectReport"("B");

-- AddForeignKey
ALTER TABLE "_DefectReasonToDefectReport" ADD CONSTRAINT "_DefectReasonToDefectReport_A_fkey" FOREIGN KEY ("A") REFERENCES "DefectReason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DefectReasonToDefectReport" ADD CONSTRAINT "_DefectReasonToDefectReport_B_fkey" FOREIGN KEY ("B") REFERENCES "DefectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
