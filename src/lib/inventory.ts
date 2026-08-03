import { prisma } from "@/lib/prisma";
import { adjustInventory, correctInventoryLevel, isShopifyConfigured } from "@/lib/shopify";
import { stockExitItemLabel } from "@/lib/labels";

export async function listSizesWithVariants() {
  return prisma.size.findMany({
    orderBy: { order: "asc" },
    include: { shopifyVariants: { orderBy: { packSize: "asc" } } },
  });
}

export async function getAlerts() {
  const sizes = await prisma.size.findMany({ orderBy: { order: "asc" } });
  return sizes.filter((s) => s.looseStock < s.reorderThreshold);
}

export async function receiveStock(input: {
  sizeId: string;
  quantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }

  await prisma.$transaction([
    prisma.size.update({
      where: { id: input.sizeId },
      data: { looseStock: { increment: input.quantity } },
    }),
    prisma.stockMovement.create({
      data: {
        sizeId: input.sizeId,
        type: "RECEIVE",
        quantityDelta: input.quantity,
        note: input.note,
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export async function packStock(input: {
  sizeId: string;
  packSize: number;
  packQuantity: number;
  createdBy?: string;
  pushToShopify?: boolean;
}) {
  if (input.packQuantity <= 0) {
    throw new Error("Anzahl Packungen muss grösser als 0 sein.");
  }

  const size = await prisma.size.findUniqueOrThrow({ where: { id: input.sizeId } });
  const unitsNeeded = input.packSize * input.packQuantity;

  if (size.looseStock < unitsNeeded) {
    throw new Error(
      `Nicht genug lose Teile auf Lager: ${size.looseStock} vorhanden, ${unitsNeeded} benötigt.`,
    );
  }

  const packaging = await prisma.packagingStock.findUnique({
    where: { packSize: input.packSize },
  });
  if (!packaging || packaging.quantity < input.packQuantity) {
    throw new Error(
      `Nicht genug ${input.packSize}er-Verpackungsmaterial: ${packaging?.quantity ?? 0} vorhanden, ${input.packQuantity} benötigt.`,
    );
  }

  await prisma.$transaction([
    prisma.size.update({
      where: { id: input.sizeId },
      data: { looseStock: { decrement: unitsNeeded } },
    }),
    prisma.stockMovement.create({
      data: {
        sizeId: input.sizeId,
        type: "PACK",
        quantityDelta: -unitsNeeded,
        packSize: input.packSize,
        packQuantity: input.packQuantity,
        createdBy: input.createdBy,
      },
    }),
    prisma.packagingStock.update({
      where: { packSize: input.packSize },
      data: { quantity: { decrement: input.packQuantity } },
    }),
    prisma.packagingMovement.create({
      data: {
        packSize: input.packSize,
        type: "USED",
        quantityDelta: -input.packQuantity,
        note: `Verpackt: Grösse ${size.label}`,
        createdBy: input.createdBy,
      },
    }),
  ]);

  if (input.pushToShopify && isShopifyConfigured()) {
    const variant = await prisma.shopifyVariant.findUnique({
      where: { sizeId_packSize: { sizeId: input.sizeId, packSize: input.packSize } },
    });
    const config = await prisma.shopifyConfig.findUnique({ where: { id: "singleton" } });

    if (variant?.shopifyInventoryItemId && config?.locationId) {
      await adjustInventory(
        variant.shopifyInventoryItemId,
        config.locationId,
        input.packQuantity,
      );
      await prisma.shopifyVariant.update({
        where: { id: variant.id },
        data: { packStock: { increment: input.packQuantity } },
      });
    }
  }
}

// Korrigiert den Shopify-Packungsbestand einer verknüpften Variante direkt aus
// dem Tool auf einen absoluten Wert (z.B. nach einer Inventur), statt dafür
// ins Shopify-Admin wechseln zu müssen.
export async function correctShopifyVariantStock(input: { variantId: string; newQuantity: number }) {
  if (input.newQuantity < 0) {
    throw new Error("Bestand darf nicht negativ sein.");
  }

  const variant = await prisma.shopifyVariant.findUniqueOrThrow({
    where: { id: input.variantId },
    include: { size: true },
  });
  if (!variant.shopifyInventoryItemId) {
    throw new Error("Diese Kombination ist noch nicht mit Shopify verknüpft.");
  }

  const config = await prisma.shopifyConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.locationId) {
    throw new Error("Keine Shopify-Location konfiguriert (Einstellungen).");
  }

  const { previous } = await correctInventoryLevel(
    variant.shopifyInventoryItemId,
    config.locationId,
    input.newQuantity,
  );

  await prisma.shopifyVariant.update({
    where: { id: variant.id },
    data: { packStock: input.newQuantity },
  });

  return { sizeLabel: variant.size.label, packSize: variant.packSize, previous, newQuantity: input.newQuantity };
}

export async function adjustLooseStock(input: {
  sizeId: string;
  newQuantity: number;
  note?: string;
  createdBy?: string;
}) {
  const size = await prisma.size.findUniqueOrThrow({ where: { id: input.sizeId } });
  const delta = input.newQuantity - size.looseStock;
  if (delta === 0) return;

  await prisma.$transaction([
    prisma.size.update({
      where: { id: input.sizeId },
      data: { looseStock: input.newQuantity },
    }),
    prisma.stockMovement.create({
      data: {
        sizeId: input.sizeId,
        type: "ADJUST",
        quantityDelta: delta,
        note: input.note,
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export type DefectItemType = "UNTERHOSE" | "VERPACKUNG" | "KARTON";

export async function recordDefect(input: {
  itemType?: DefectItemType;
  sizeId?: string;
  packSize?: number;
  quantity: number;
  note?: string;
  createdBy?: string;
  photoDataUrls?: string[];
  reasonIds?: string[];
}) {
  if (input.quantity <= 0) {
    throw new Error("Defekt-Menge muss grösser als 0 sein.");
  }
  const itemType = input.itemType ?? "UNTERHOSE";
  if (itemType === "UNTERHOSE" && !input.sizeId) {
    throw new Error("Grösse ist erforderlich.");
  }
  if (itemType === "VERPACKUNG" && !input.packSize) {
    throw new Error("Packgrösse ist erforderlich.");
  }

  await prisma.defectReport.create({
    data: {
      itemType,
      sizeId: itemType === "UNTERHOSE" ? input.sizeId : null,
      packSize: itemType === "VERPACKUNG" ? input.packSize : null,
      quantity: input.quantity,
      note: input.note,
      createdBy: input.createdBy,
      photos: {
        create: (input.photoDataUrls ?? []).map((dataUrl) => ({ dataUrl })),
      },
      reasons: {
        connect: (input.reasonIds ?? []).map((id) => ({ id })),
      },
    },
  });
}

export async function listDefectReports(limit = 50) {
  return prisma.defectReport.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      size: true,
      photos: true,
      reasons: true,
      notes: { orderBy: { createdAt: "asc" } },
      edits: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getDefectReportsForExport(ids: string[]) {
  return prisma.defectReport.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
    include: { size: true, reasons: true },
  });
}

export async function listDefectReasons() {
  return prisma.defectReason.findMany({ orderBy: { label: "asc" } });
}

export async function addDefectPhotos(input: {
  reportId: string;
  photoDataUrls: string[];
  createdBy?: string;
}) {
  if (input.photoDataUrls.length === 0) return;
  await prisma.defectPhoto.createMany({
    data: input.photoDataUrls.map((dataUrl) => ({
      defectReportId: input.reportId,
      dataUrl,
      createdBy: input.createdBy,
    })),
  });
}

export async function addDefectNote(input: {
  reportId: string;
  text: string;
  createdBy?: string;
}) {
  const text = input.text.trim();
  if (!text) throw new Error("Bemerkung darf nicht leer sein.");
  await prisma.defectNote.create({
    data: { defectReportId: input.reportId, text, createdBy: input.createdBy },
  });
}

// Ändert Menge und/oder Notiz eines bestehenden Defekt-Eintrags. Verlangt eine
// Begründung und protokolliert jede geänderte Feld für Feld (Audit-Trail),
// damit nichts unbemerkt überschrieben wird.
export async function editDefectReport(input: {
  reportId: string;
  newQuantity?: number;
  newNote?: string;
  reason: string;
  createdBy?: string;
}) {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Begründung ist erforderlich, um einen Defekt zu bearbeiten.");

  const report = await prisma.defectReport.findUniqueOrThrow({
    where: { id: input.reportId },
  });

  const edits: { field: string; oldValue: string; newValue: string }[] = [];
  const data: { quantity?: number; note?: string } = {};

  if (input.newQuantity !== undefined && input.newQuantity !== report.quantity) {
    if (input.newQuantity <= 0) throw new Error("Menge muss grösser als 0 sein.");
    edits.push({
      field: "quantity",
      oldValue: String(report.quantity),
      newValue: String(input.newQuantity),
    });
    data.quantity = input.newQuantity;
  }

  if (input.newNote !== undefined && input.newNote !== (report.note ?? "")) {
    edits.push({
      field: "note",
      oldValue: report.note ?? "",
      newValue: input.newNote,
    });
    data.note = input.newNote;
  }

  if (edits.length === 0) return;

  await prisma.$transaction([
    prisma.defectReport.update({ where: { id: input.reportId }, data }),
    prisma.defectEdit.createMany({
      data: edits.map((e) => ({
        defectReportId: input.reportId,
        field: e.field,
        oldValue: e.oldValue,
        newValue: e.newValue,
        reason,
        createdBy: input.createdBy,
      })),
    }),
  ]);
}

export async function createDefectReason(label: string) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Bezeichnung darf nicht leer sein.");
  return prisma.defectReason.upsert({
    where: { label: trimmed },
    update: {},
    create: { label: trimmed },
  });
}

export async function listMovements(limit = 50) {
  return prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { size: true },
  });
}

export async function listPackagingStock() {
  return prisma.packagingStock.findMany({ orderBy: { packSize: "asc" } });
}

export async function receivePackagingStock(input: {
  packSize: number;
  quantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }

  await prisma.$transaction([
    prisma.packagingStock.upsert({
      where: { packSize: input.packSize },
      update: { quantity: { increment: input.quantity } },
      create: { packSize: input.packSize, quantity: input.quantity },
    }),
    prisma.packagingMovement.create({
      data: {
        packSize: input.packSize,
        type: "RECEIVE",
        quantityDelta: input.quantity,
        note: input.note,
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export async function adjustPackagingStock(input: {
  packSize: number;
  newQuantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.newQuantity < 0) {
    throw new Error("Bestand darf nicht negativ sein.");
  }

  const packaging = await prisma.packagingStock.findUnique({ where: { packSize: input.packSize } });
  const current = packaging?.quantity ?? 0;
  const delta = input.newQuantity - current;
  if (delta === 0) return;

  await prisma.$transaction([
    prisma.packagingStock.upsert({
      where: { packSize: input.packSize },
      update: { quantity: input.newQuantity },
      create: { packSize: input.packSize, quantity: input.newQuantity },
    }),
    prisma.packagingMovement.create({
      data: {
        packSize: input.packSize,
        type: "ADJUST",
        quantityDelta: delta,
        note: input.note,
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export async function listPackagingMovements(limit = 30) {
  return prisma.packagingMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getCartonStock() {
  const stock = await prisma.cartonStock.findUnique({ where: { id: "singleton" } });
  return stock?.quantity ?? 0;
}

export async function receiveCartonStock(input: {
  quantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }

  await prisma.$transaction([
    prisma.cartonStock.upsert({
      where: { id: "singleton" },
      update: { quantity: { increment: input.quantity } },
      create: { id: "singleton", quantity: input.quantity },
    }),
    prisma.cartonMovement.create({
      data: {
        type: "RECEIVE",
        quantityDelta: input.quantity,
        note: input.note,
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export async function adjustCartonStock(input: {
  newQuantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.newQuantity < 0) {
    throw new Error("Bestand darf nicht negativ sein.");
  }

  const current = await prisma.cartonStock.findUnique({ where: { id: "singleton" } });
  const delta = input.newQuantity - (current?.quantity ?? 0);
  if (delta === 0) return;

  await prisma.$transaction([
    prisma.cartonStock.upsert({
      where: { id: "singleton" },
      update: { quantity: input.newQuantity },
      create: { id: "singleton", quantity: input.newQuantity },
    }),
    prisma.cartonMovement.create({
      data: {
        type: "ADJUST",
        quantityDelta: delta,
        note: input.note,
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export async function listCartonMovements(limit = 30) {
  return prisma.cartonMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getBestSellers(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [grouped, sizes] = await Promise.all([
    prisma.dailySales.groupBy({
      by: ["sizeId", "packSize"],
      where: { date: { gte: since } },
      _sum: { packsSold: true },
      orderBy: { _sum: { packsSold: "desc" } },
    }),
    prisma.size.findMany(),
  ]);
  const sizeLabelById = new Map(sizes.map((s) => [s.id, s.label]));

  return grouped.map((g) => ({
    sizeLabel: sizeLabelById.get(g.sizeId) ?? "?",
    packSize: g.packSize,
    unitsSold: g._sum.packsSold ?? 0,
  }));
}

export type StockExitItemType = "UNTERHOSE" | "VERPACKUNGSMATERIAL" | "KARTON" | "SHOPIFY";

// Warenausgang ausserhalb des normalen Shopify-Verkaufs (Muster, Geschenke,
// Ersatzlieferungen, ...) – für Unterhosen (lose oder verpackt),
// Verpackungsmaterial, Versandkartons oder direkt den Shopify-Bestand einer
// Variante (ohne das Hauptlager anzurühren). Reduziert jeweils den passenden
// lokalen Bestand und bei verpackten Unterhosen optional auch den echten
// Shopify-Bestand.
export async function recordStockExit(input: {
  itemType?: StockExitItemType;
  sizeId?: string | null;
  packSize?: number | null;
  quantity: number;
  reason: string;
  recipient?: string;
  date: Date;
  createdBy?: string;
  pushToShopify?: boolean;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Begründung ist erforderlich.");
  }
  const itemType = input.itemType ?? "UNTERHOSE";

  if (itemType === "KARTON") {
    const current = await prisma.cartonStock.findUnique({ where: { id: "singleton" } });
    const available = current?.quantity ?? 0;
    if (available < input.quantity) {
      throw new Error(
        `Nicht genug Versandkartons vorhanden: ${available} vorhanden, ${input.quantity} benötigt.`,
      );
    }

    await prisma.$transaction([
      prisma.cartonStock.update({
        where: { id: "singleton" },
        data: { quantity: { decrement: input.quantity } },
      }),
      prisma.stockExit.create({
        data: {
          itemType: "KARTON",
          quantity: input.quantity,
          reason,
          recipient: input.recipient,
          date: input.date,
          createdBy: input.createdBy,
        },
      }),
    ]);
    return;
  }

  if (itemType === "VERPACKUNGSMATERIAL") {
    if (!input.packSize) {
      throw new Error("Packgrösse ist erforderlich.");
    }
    const packaging = await prisma.packagingStock.findUnique({ where: { packSize: input.packSize } });
    const available = packaging?.quantity ?? 0;
    if (available < input.quantity) {
      throw new Error(
        `Nicht genug ${input.packSize}er-Verpackungsmaterial vorhanden: ${available} vorhanden, ${input.quantity} benötigt.`,
      );
    }

    await prisma.$transaction([
      prisma.packagingStock.update({
        where: { packSize: input.packSize },
        data: { quantity: { decrement: input.quantity } },
      }),
      prisma.stockExit.create({
        data: {
          itemType: "VERPACKUNGSMATERIAL",
          packSize: input.packSize,
          quantity: input.quantity,
          reason,
          recipient: input.recipient,
          date: input.date,
          createdBy: input.createdBy,
        },
      }),
    ]);
    return;
  }

  if (itemType === "SHOPIFY") {
    if (!input.sizeId || !input.packSize) {
      throw new Error("Grösse und Packgrösse sind erforderlich.");
    }
    if (!isShopifyConfigured()) {
      throw new Error("Shopify ist nicht konfiguriert.");
    }
    const variant = await prisma.shopifyVariant.findUnique({
      where: { sizeId_packSize: { sizeId: input.sizeId, packSize: input.packSize } },
      include: { size: true },
    });
    if (!variant?.shopifyInventoryItemId) {
      throw new Error("Diese Grösse/Packgrösse-Kombination ist nicht mit Shopify verknüpft.");
    }
    if (variant.packStock < input.quantity) {
      throw new Error(
        `Nicht genug ${input.packSize}er-Packungen im Shopify-Bestand: ${variant.packStock} vorhanden, ${input.quantity} benötigt.`,
      );
    }
    const config = await prisma.shopifyConfig.findUnique({ where: { id: "singleton" } });
    if (!config?.locationId) {
      throw new Error("Keine Shopify-Location konfiguriert (Einstellungen).");
    }

    await prisma.$transaction([
      prisma.shopifyVariant.update({
        where: { id: variant.id },
        data: { packStock: { decrement: input.quantity } },
      }),
      prisma.stockExit.create({
        data: {
          itemType: "SHOPIFY",
          sizeId: input.sizeId,
          packSize: input.packSize,
          quantity: input.quantity,
          reason,
          recipient: input.recipient,
          date: input.date,
          createdBy: input.createdBy,
          pushedToShopify: true,
        },
      }),
    ]);

    await adjustInventory(variant.shopifyInventoryItemId, config.locationId, -input.quantity);
    return;
  }

  // itemType === "UNTERHOSE"
  if (!input.sizeId) {
    throw new Error("Grösse ist erforderlich.");
  }
  const size = await prisma.size.findUniqueOrThrow({ where: { id: input.sizeId } });

  if (!input.packSize) {
    if (size.looseStock < input.quantity) {
      throw new Error(
        `Nicht genug lose Teile auf Lager: ${size.looseStock} vorhanden, ${input.quantity} benötigt.`,
      );
    }

    await prisma.$transaction([
      prisma.size.update({
        where: { id: input.sizeId },
        data: { looseStock: { decrement: input.quantity } },
      }),
      prisma.stockExit.create({
        data: {
          itemType: "UNTERHOSE",
          sizeId: input.sizeId,
          packSize: null,
          quantity: input.quantity,
          reason,
          recipient: input.recipient,
          date: input.date,
          createdBy: input.createdBy,
        },
      }),
    ]);
    return;
  }

  const variant = await prisma.shopifyVariant.findUnique({
    where: { sizeId_packSize: { sizeId: input.sizeId, packSize: input.packSize } },
  });
  if (!variant) {
    throw new Error("Diese Grösse/Packgrösse-Kombination existiert nicht.");
  }
  if (variant.packStock < input.quantity) {
    throw new Error(
      `Nicht genug ${input.packSize}er-Packungen vorhanden: ${variant.packStock} vorhanden, ${input.quantity} benötigt.`,
    );
  }

  const wantsShopifyPush =
    Boolean(input.pushToShopify) && isShopifyConfigured() && Boolean(variant.shopifyInventoryItemId);

  await prisma.$transaction([
    prisma.shopifyVariant.update({
      where: { id: variant.id },
      data: { packStock: { decrement: input.quantity } },
    }),
    prisma.stockExit.create({
      data: {
        itemType: "UNTERHOSE",
        sizeId: input.sizeId,
        packSize: input.packSize,
        quantity: input.quantity,
        reason,
        recipient: input.recipient,
        date: input.date,
        createdBy: input.createdBy,
        pushedToShopify: wantsShopifyPush,
      },
    }),
  ]);

  if (wantsShopifyPush) {
    const config = await prisma.shopifyConfig.findUnique({ where: { id: "singleton" } });
    if (variant.shopifyInventoryItemId && config?.locationId) {
      await adjustInventory(variant.shopifyInventoryItemId, config.locationId, -input.quantity);
    }
  }
}

export async function listStockExits(limit = 100) {
  return prisma.stockExit.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: { size: true },
  });
}

export async function getStockExitsForExport(ids: string[]) {
  return prisma.stockExit.findMany({
    where: { id: { in: ids } },
    orderBy: { date: "asc" },
    include: { size: true },
  });
}

export async function addStockExitNote(input: {
  stockExitId: string;
  text: string;
  createdBy?: string;
}) {
  const text = input.text.trim();
  if (!text) throw new Error("Notiz darf nicht leer sein.");
  await prisma.stockExitNote.create({
    data: { stockExitId: input.stockExitId, text, createdBy: input.createdBy },
  });
}

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  RECEIVE: "Wareneingang",
  PACK: "Verpackt",
  ADJUST: "Korrektur",
  TRANSFER_OUT: "Übernahme (Maxims Lager)",
};

const PACKAGING_TYPE_LABEL: Record<string, string> = {
  RECEIVE: "Wareneingang",
  USED: "Verbraucht (beim Verpacken)",
  EXIT: "Austrag",
  ADJUST: "Korrektur",
  TRANSFER_OUT: "Übernahme (Maxims Lager)",
};

const CARTON_TYPE_LABEL: Record<string, string> = {
  RECEIVE: "Wareneingang",
  EXIT: "Austrag",
  ADJUST: "Korrektur",
};

const MAXLAGER_TYPE_LABEL: Record<string, string> = {
  TRANSFER_IN: "Übernahme vom Hauptlager",
  SALE: "Verkauf",
  ADJUST: "Korrektur",
};

export type UnifiedMovement = {
  id: string;
  date: Date;
  dateOnly: boolean; // true = date trägt keine echte Uhrzeit (frei gewähltes Datum, z.B. Austrag), keine Uhrzeit anzeigen
  category: "Unterhosen" | "Verpackung" | "Karton" | "Maxims Lager" | "Warenausgang";
  typeLabel: string;
  quantityDelta: number;
  details: string;
  createdBy: string | null;
  exitId?: string; // nur bei Austrägen gesetzt (für PDF-Export-Auswahl)
  notes?: { id: string; text: string; createdBy: string | null; createdAt: Date }[];
};

// Vereinigt Wareneingang/Verpackt/Korrektur (StockMovement), Austräge
// (StockExit) sowie Verpackungsmaterial- und Karton-Bewegungen zu einem
// einzigen chronologischen Bewegungsprotokoll ("Bewegungen").
export async function listAllMovements(limit = 150): Promise<UnifiedMovement[]> {
  const [
    stockMovements,
    stockExits,
    packagingMovements,
    cartonMovements,
    maxLagerMovements,
    maxLagerPackagingMovements,
    maxLagerSales,
  ] = await Promise.all([
    prisma.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { size: true } }),
    prisma.stockExit.findMany({
      orderBy: { date: "desc" },
      take: limit,
      include: { size: true, notes: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.packagingMovement.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.cartonMovement.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.maxLagerMovement.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { size: true } }),
    prisma.maxLagerPackagingMovement.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.maxLagerSale.findMany({ orderBy: { date: "desc" }, take: limit, include: { size: true } }),
  ]);

  const unified: UnifiedMovement[] = [];

  for (const m of stockMovements) {
    unified.push({
      id: `stock-${m.id}`,
      date: m.createdAt,
      dateOnly: false,
      category: "Unterhosen",
      typeLabel: MOVEMENT_TYPE_LABEL[m.type] ?? m.type,
      quantityDelta: m.quantityDelta,
      details:
        m.type === "PACK" && m.packSize && m.packQuantity
          ? `${m.size.label}: ${m.packQuantity}× ${m.packSize}er Pack`
          : `${m.size.label}${m.note ? `: ${m.note}` : ""}`,
      createdBy: m.createdBy,
    });
  }

  for (const e of stockExits) {
    const label = stockExitItemLabel(e);
    unified.push({
      id: `exit-${e.id}`,
      date: e.date,
      dateOnly: true,
      category: "Warenausgang",
      typeLabel: "Austrag",
      quantityDelta: -e.quantity,
      details: `${label} · ${e.reason}${e.recipient ? ` · ${e.recipient}` : ""}`,
      createdBy: e.createdBy,
      exitId: e.id,
      notes: e.notes,
    });
  }

  for (const p of packagingMovements) {
    const details =
      p.type === "USED" && p.note
        ? `${p.packSize}er-Verpackung – ${p.note.replace(/^Verpackt: /, "")}`
        : `${p.packSize}er${p.note ? `: ${p.note}` : ""}`;
    unified.push({
      id: `packaging-${p.id}`,
      date: p.createdAt,
      dateOnly: false,
      category: "Verpackung",
      typeLabel: PACKAGING_TYPE_LABEL[p.type] ?? p.type,
      quantityDelta: p.quantityDelta,
      details,
      createdBy: p.createdBy,
    });
  }

  for (const c of cartonMovements) {
    unified.push({
      id: `carton-${c.id}`,
      date: c.createdAt,
      dateOnly: false,
      category: "Karton",
      typeLabel: CARTON_TYPE_LABEL[c.type] ?? c.type,
      quantityDelta: c.quantityDelta,
      details: c.note ?? "",
      createdBy: c.createdBy,
    });
  }

  for (const m of maxLagerMovements) {
    unified.push({
      id: `maxlager-stock-${m.id}`,
      date: m.createdAt,
      dateOnly: false,
      category: "Maxims Lager",
      typeLabel: MAXLAGER_TYPE_LABEL[m.type] ?? m.type,
      quantityDelta: m.quantityDelta,
      details: `${m.size.label} (lose)${m.note ? `: ${m.note}` : ""}`,
      createdBy: m.createdBy,
    });
  }

  for (const p of maxLagerPackagingMovements) {
    unified.push({
      id: `maxlager-packaging-${p.id}`,
      date: p.createdAt,
      dateOnly: false,
      category: "Maxims Lager",
      typeLabel: MAXLAGER_TYPE_LABEL[p.type] ?? p.type,
      quantityDelta: p.quantityDelta,
      details: `${p.packSize}er Verpackung${p.note ? `: ${p.note}` : ""}`,
      createdBy: p.createdBy,
    });
  }

  for (const s of maxLagerSales) {
    unified.push({
      id: `maxlager-sale-${s.id}`,
      date: s.date,
      dateOnly: true,
      category: "Maxims Lager",
      typeLabel: "Verkauf",
      quantityDelta: -(s.packSize * s.quantity),
      details: `Grösse ${s.size.label} (${s.packSize}er-Packung)${s.recipient ? ` · ${s.recipient}` : ""}${
        s.pushedToShopify ? " · Shopify +" + s.quantity : ""
      }`,
      createdBy: s.createdBy,
    });
  }

  unified.sort((a, b) => b.date.getTime() - a.date.getTime());
  return unified.slice(0, limit);
}
