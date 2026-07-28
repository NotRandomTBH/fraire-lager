import { prisma } from "@/lib/prisma";
import { adjustInventory, correctInventoryLevel, isShopifyConfigured } from "@/lib/shopify";

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

export async function recordDefect(input: {
  sizeId: string;
  quantity: number;
  note?: string;
  createdBy?: string;
  photoDataUrls?: string[];
  reasonIds?: string[];
}) {
  if (input.quantity <= 0) {
    throw new Error("Defekt-Menge muss grösser als 0 sein.");
  }

  await prisma.defectReport.create({
    data: {
      sizeId: input.sizeId,
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

export async function listPackagingMovements(limit = 30) {
  return prisma.packagingMovement.findMany({
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

// Warenausgang ausserhalb des normalen Shopify-Verkaufs (Muster, Geschenke,
// Ersatzlieferungen, ...). packSize null/0 = lose Teile austragen (reduziert
// looseStock direkt); packSize gesetzt = ganze Packungen austragen (reduziert
// den Packungs-Cache und optional den echten Shopify-Bestand).
export async function recordStockExit(input: {
  sizeId: string;
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
