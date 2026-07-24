-- CreateTable
CREATE TABLE "Size" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "looseStock" INTEGER NOT NULL DEFAULT 0,
    "reorderThreshold" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sizeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "packSize" INTEGER,
    "packQuantity" INTEGER,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopifyVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sizeId" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "shopifyInventoryItemId" TEXT,
    "sku" TEXT,
    "title" TEXT,
    "packStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopifyVariant_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopifyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "shopDomain" TEXT,
    "locationId" TEXT,
    "lastInventorySync" DATETIME,
    "lastSalesSync" DATETIME
);

-- CreateTable
CREATE TABLE "SalesSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyVariantId" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Size_label_key" ON "Size"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyVariant_sizeId_packSize_key" ON "ShopifyVariant"("sizeId", "packSize");
