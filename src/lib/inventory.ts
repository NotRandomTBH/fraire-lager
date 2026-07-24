import { prisma } from "@/lib/prisma";
import { adjustInventory, isShopifyConfigured } from "@/lib/shopify";

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

export async function getBestSellers(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.salesSnapshot.groupBy({
    by: ["sizeLabel", "packSize"],
    where: { periodEnd: { gte: since } },
    _sum: { unitsSold: true },
    orderBy: { _sum: { unitsSold: "desc" } },
  });

  return snapshots.map((s) => ({
    sizeLabel: s.sizeLabel,
    packSize: s.packSize,
    unitsSold: s._sum.unitsSold ?? 0,
  }));
}
