import { prisma } from "@/lib/prisma";
import { adjustInventory, isShopifyConfigured } from "@/lib/shopify";

// Zweites, kleineres Lager (bei Maxim) mit eigenem losem Bestand pro Grösse
// und eigenem Verpackungsmaterial-Bestand, befüllt per Übernahme vom
// Hauptlager. Verkäufe/Versand direkt aus Maxims Lager erhöhen den
// Shopify-Bestand der betroffenen Variante um die verkaufte Menge, weil
// Shopify beim Bestelleingang bereits automatisch reduziert hat, ohne dass
// das Hauptlager dafür etwas hergegeben hätte.

export async function listMaxLagerStock() {
  const [sizes, stock] = await Promise.all([
    prisma.size.findMany({ orderBy: { order: "asc" } }),
    prisma.maxLagerStock.findMany(),
  ]);
  const quantityBySizeId = new Map(stock.map((s) => [s.sizeId, s.quantity]));
  return sizes.map((s) => ({
    sizeId: s.id,
    sizeLabel: s.label,
    quantity: quantityBySizeId.get(s.id) ?? 0,
  }));
}

export async function listMaxLagerPackagingStock() {
  const stock = await prisma.maxLagerPackagingStock.findMany({ orderBy: { packSize: "asc" } });
  const byPackSize = new Map(stock.map((s) => [s.packSize, s.quantity]));
  return [1, 3, 5].map((packSize) => ({ packSize, quantity: byPackSize.get(packSize) ?? 0 }));
}

// Übernimmt lose Teile einer Grösse vom Hauptlager zu Maxims Lager.
export async function transferLooseToMaxLager(input: {
  sizeId: string;
  quantity: number;
  createdBy?: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }

  const size = await prisma.size.findUniqueOrThrow({ where: { id: input.sizeId } });
  if (size.looseStock < input.quantity) {
    throw new Error(
      `Nicht genug lose Teile im Hauptlager: ${size.looseStock} vorhanden, ${input.quantity} benötigt.`,
    );
  }

  await prisma.$transaction([
    prisma.size.update({
      where: { id: input.sizeId },
      data: { looseStock: { decrement: input.quantity } },
    }),
    prisma.stockMovement.create({
      data: {
        sizeId: input.sizeId,
        type: "TRANSFER_OUT",
        quantityDelta: -input.quantity,
        note: "Übernahme zu Maxims Lager",
        createdBy: input.createdBy,
      },
    }),
    prisma.maxLagerStock.upsert({
      where: { sizeId: input.sizeId },
      update: { quantity: { increment: input.quantity } },
      create: { sizeId: input.sizeId, quantity: input.quantity },
    }),
    prisma.maxLagerMovement.create({
      data: {
        sizeId: input.sizeId,
        type: "TRANSFER_IN",
        quantityDelta: input.quantity,
        note: "Übernahme vom Hauptlager",
        createdBy: input.createdBy,
      },
    }),
  ]);
}

// Übernimmt Verpackungsmaterial einer Packgrösse vom Hauptlager zu Maxims Lager.
export async function transferPackagingToMaxLager(input: {
  packSize: number;
  quantity: number;
  createdBy?: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }

  const packaging = await prisma.packagingStock.findUnique({ where: { packSize: input.packSize } });
  const available = packaging?.quantity ?? 0;
  if (available < input.quantity) {
    throw new Error(
      `Nicht genug ${input.packSize}er-Verpackungsmaterial im Hauptlager: ${available} vorhanden, ${input.quantity} benötigt.`,
    );
  }

  await prisma.$transaction([
    prisma.packagingStock.update({
      where: { packSize: input.packSize },
      data: { quantity: { decrement: input.quantity } },
    }),
    prisma.packagingMovement.create({
      data: {
        packSize: input.packSize,
        type: "TRANSFER_OUT",
        quantityDelta: -input.quantity,
        note: "Übernahme zu Maxims Lager",
        createdBy: input.createdBy,
      },
    }),
    prisma.maxLagerPackagingStock.upsert({
      where: { packSize: input.packSize },
      update: { quantity: { increment: input.quantity } },
      create: { packSize: input.packSize, quantity: input.quantity },
    }),
    prisma.maxLagerPackagingMovement.create({
      data: {
        packSize: input.packSize,
        type: "TRANSFER_IN",
        quantityDelta: input.quantity,
        note: "Übernahme vom Hauptlager",
        createdBy: input.createdBy,
      },
    }),
  ]);
}

export async function adjustMaxLagerStock(input: {
  sizeId: string;
  newQuantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.newQuantity < 0) {
    throw new Error("Bestand darf nicht negativ sein.");
  }

  const current = await prisma.maxLagerStock.findUnique({ where: { sizeId: input.sizeId } });
  const delta = input.newQuantity - (current?.quantity ?? 0);
  if (delta === 0) return;

  await prisma.$transaction([
    prisma.maxLagerStock.upsert({
      where: { sizeId: input.sizeId },
      update: { quantity: input.newQuantity },
      create: { sizeId: input.sizeId, quantity: input.newQuantity },
    }),
    prisma.maxLagerMovement.create({
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

export async function adjustMaxLagerPackagingStock(input: {
  packSize: number;
  newQuantity: number;
  note?: string;
  createdBy?: string;
}) {
  if (input.newQuantity < 0) {
    throw new Error("Bestand darf nicht negativ sein.");
  }

  const current = await prisma.maxLagerPackagingStock.findUnique({ where: { packSize: input.packSize } });
  const delta = input.newQuantity - (current?.quantity ?? 0);
  if (delta === 0) return;

  await prisma.$transaction([
    prisma.maxLagerPackagingStock.upsert({
      where: { packSize: input.packSize },
      update: { quantity: input.newQuantity },
      create: { packSize: input.packSize, quantity: input.newQuantity },
    }),
    prisma.maxLagerPackagingMovement.create({
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

// Verkauf/Versand direkt aus Maxims Lager: verbraucht lose Teile + das
// passende Verpackungsmaterial aus Maxims Lager und erhöht danach den
// Shopify-Bestand der Variante um die verkaufte Menge (siehe Modul-Kommentar).
export async function recordMaxLagerSale(input: {
  sizeId: string;
  packSize: number;
  quantity: number;
  recipient?: string;
  note?: string;
  date: Date;
  createdBy?: string;
}) {
  if (input.quantity <= 0) {
    throw new Error("Menge muss grösser als 0 sein.");
  }

  const size = await prisma.size.findUniqueOrThrow({ where: { id: input.sizeId } });
  const looseStock = await prisma.maxLagerStock.findUnique({ where: { sizeId: input.sizeId } });
  const packagingStock = await prisma.maxLagerPackagingStock.findUnique({
    where: { packSize: input.packSize },
  });

  const unitsNeeded = input.packSize * input.quantity;
  const looseAvailable = looseStock?.quantity ?? 0;
  const packagingAvailable = packagingStock?.quantity ?? 0;

  if (looseAvailable < unitsNeeded) {
    throw new Error(
      `Nicht genug lose Teile (${size.label}) in Maxims Lager: ${looseAvailable} vorhanden, ${unitsNeeded} benötigt.`,
    );
  }
  if (packagingAvailable < input.quantity) {
    throw new Error(
      `Nicht genug ${input.packSize}er-Verpackungsmaterial in Maxims Lager: ${packagingAvailable} vorhanden, ${input.quantity} benötigt.`,
    );
  }

  const variant = await prisma.shopifyVariant.findUnique({
    where: { sizeId_packSize: { sizeId: input.sizeId, packSize: input.packSize } },
  });
  const config = await prisma.shopifyConfig.findUnique({ where: { id: "singleton" } });
  const wantsShopifyPush =
    isShopifyConfigured() && Boolean(variant?.shopifyInventoryItemId) && Boolean(config?.locationId);

  // Nur EIN Datensatz pro Verkaufsereignis (MaxLagerSale) – keine zusätzlichen
  // MaxLagerMovement/-PackagingMovement-Einträge, sonst erscheint derselbe
  // Verkauf doppelt in der vereinheitlichten Bewegungen-Liste.
  await prisma.$transaction([
    prisma.maxLagerStock.update({
      where: { sizeId: input.sizeId },
      data: { quantity: { decrement: unitsNeeded } },
    }),
    prisma.maxLagerPackagingStock.update({
      where: { packSize: input.packSize },
      data: { quantity: { decrement: input.quantity } },
    }),
    prisma.maxLagerSale.create({
      data: {
        sizeId: input.sizeId,
        packSize: input.packSize,
        quantity: input.quantity,
        recipient: input.recipient,
        note: input.note,
        date: input.date,
        createdBy: input.createdBy,
        pushedToShopify: wantsShopifyPush,
      },
    }),
    ...(variant
      ? [
          prisma.shopifyVariant.update({
            where: { id: variant.id },
            data: { packStock: { increment: input.quantity } },
          }),
        ]
      : []),
  ]);

  if (wantsShopifyPush && variant?.shopifyInventoryItemId && config?.locationId) {
    await adjustInventory(variant.shopifyInventoryItemId, config.locationId, input.quantity);
  }
}

export async function listMaxLagerSales(limit = 50) {
  return prisma.maxLagerSale.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: { size: true },
  });
}
