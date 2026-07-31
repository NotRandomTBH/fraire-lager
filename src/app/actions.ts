"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import {
  addDefectNote,
  addDefectPhotos,
  adjustCartonStock,
  adjustLooseStock,
  adjustPackagingStock,
  correctShopifyVariantStock,
  createDefectReason,
  editDefectReport,
  getDefectReportsForExport,
  getStockExitsForExport,
  packStock,
  receiveCartonStock,
  receivePackagingStock,
  receiveStock,
  recordDefect,
  recordStockExit,
  type DefectItemType,
  type StockExitItemType,
} from "@/lib/inventory";
import { defectItemLabel } from "@/lib/labels";
import { buildDefectReportsPdf, buildStockExitsPdf } from "@/lib/pdf";
import { updateReorderSettings } from "@/lib/reorder";
import {
  isShopifyConfigured,
  lookupVariantBySku,
  syncInventoryLevels,
  syncSales,
} from "@/lib/shopify";

export type ActionState = { ok: boolean; message: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nicht angemeldet.");
  return user;
}

export async function receiveStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const sizeId = String(formData.get("sizeId"));
    const quantity = Number(formData.get("quantity") ?? 0);

    if (quantity <= 0) {
      throw new Error("Menge angeben.");
    }

    await receiveStock({
      sizeId,
      quantity,
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });

    revalidatePath("/");
    revalidatePath("/bewegungen");
    return { ok: true, message: "Wareneingang gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// Zentrale Defekt-Erfassung für Unterhosen, Verpackungsmaterial oder
// Versandkartons (eigene Seite "Defekte erfassen" im Lager-Menü, nicht mehr
// an den Wareneingangs-Buchungsvorgang gekoppelt).
export async function recordDefectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const itemType = (String(formData.get("itemType") ?? "UNTERHOSE") as DefectItemType);
    const sizeIdRaw = String(formData.get("sizeId") ?? "");
    const packSizeRaw = String(formData.get("packSize") ?? "");
    const quantity = Number(formData.get("quantity") ?? 0);

    const photosRaw = String(formData.get("defectPhotos") ?? "[]");
    let photoDataUrls: string[] = [];
    try {
      photoDataUrls = JSON.parse(photosRaw);
    } catch {
      photoDataUrls = [];
    }

    const reasonsRaw = String(formData.get("defectReasonIds") ?? "[]");
    let reasonIds: string[] = [];
    try {
      reasonIds = JSON.parse(reasonsRaw);
    } catch {
      reasonIds = [];
    }

    await recordDefect({
      itemType,
      sizeId: sizeIdRaw || undefined,
      packSize: packSizeRaw ? Number(packSizeRaw) : undefined,
      quantity,
      note: String(formData.get("defectNote") ?? "") || undefined,
      createdBy: user.name,
      photoDataUrls,
      reasonIds,
    });

    revalidatePath("/defekte-erfassen");
    revalidatePath("/defekte");
    return { ok: true, message: "Defekt erfasst." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function addDefectPhotosAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const reportId = String(formData.get("reportId"));
    let photoDataUrls: string[] = [];
    try {
      photoDataUrls = JSON.parse(String(formData.get("photos") ?? "[]"));
    } catch {
      photoDataUrls = [];
    }
    if (photoDataUrls.length === 0) {
      throw new Error("Kein Foto ausgewählt.");
    }
    await addDefectPhotos({ reportId, photoDataUrls, createdBy: user.name });
    revalidatePath("/defekte");
    return { ok: true, message: "Foto(s) hinzugefügt." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function addDefectNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await addDefectNote({
      reportId: String(formData.get("reportId")),
      text: String(formData.get("text") ?? ""),
      createdBy: user.name,
    });
    revalidatePath("/defekte");
    return { ok: true, message: "Bemerkung hinzugefügt." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function editDefectReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const newQuantityRaw = formData.get("newQuantity");
    await editDefectReport({
      reportId: String(formData.get("reportId")),
      newQuantity: newQuantityRaw ? Number(newQuantityRaw) : undefined,
      newNote: formData.has("newNote") ? String(formData.get("newNote")) : undefined,
      reason: String(formData.get("reason") ?? ""),
      createdBy: user.name,
    });
    revalidatePath("/defekte");
    return { ok: true, message: "Änderung gespeichert." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function createDefectReasonAction(label: string) {
  await requireUser();
  const reason = await createDefectReason(label);
  revalidatePath("/defekte-erfassen");
  return reason;
}

export async function generateDefectPdfAction(reportIds: string[]) {
  await requireUser();
  if (reportIds.length === 0) {
    throw new Error("Keine Defekte ausgewählt.");
  }

  const reports = await getDefectReportsForExport(reportIds);
  const bytes = await buildDefectReportsPdf(
    reports.map((r) => ({
      itemLabel: defectItemLabel(r),
      quantity: r.quantity,
      reasons: r.reasons.map((reason) => reason.label),
      note: r.note,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
    })),
  );

  return {
    base64: Buffer.from(bytes).toString("base64"),
    filename: `defekte-protokoll-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

export async function recordStockExitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const itemType = (String(formData.get("itemType") ?? "UNTERHOSE") as StockExitItemType);
    const sizeIdRaw = String(formData.get("sizeId") ?? "");
    const packSizeRaw = String(formData.get("packSize") ?? "");
    const dateRaw = String(formData.get("date") ?? "");

    await recordStockExit({
      itemType,
      sizeId: sizeIdRaw || null,
      packSize: packSizeRaw ? Number(packSizeRaw) : null,
      quantity: Number(formData.get("quantity")),
      reason: String(formData.get("reason") ?? ""),
      recipient: String(formData.get("recipient") ?? "") || undefined,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      createdBy: user.name,
      pushToShopify: formData.get("pushToShopify") === "on",
    });

    revalidatePath("/");
    revalidatePath("/warenausgang");
    revalidatePath("/bewegungen");
    return { ok: true, message: "Austrag gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function generateStockExitsPdfAction(exitIds: string[]) {
  await requireUser();
  if (exitIds.length === 0) {
    throw new Error("Keine Einträge ausgewählt.");
  }

  const exits = await getStockExitsForExport(exitIds);
  const bytes = await buildStockExitsPdf(
    exits.map((e) => ({
      itemType: e.itemType,
      sizeLabel: e.size?.label ?? null,
      packSize: e.packSize,
      quantity: e.quantity,
      reason: e.reason,
      recipient: e.recipient,
      date: e.date,
      createdBy: e.createdBy,
    })),
  );

  return {
    base64: Buffer.from(bytes).toString("base64"),
    filename: `austraege-protokoll-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

export async function packStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await packStock({
      sizeId: String(formData.get("sizeId")),
      packSize: Number(formData.get("packSize")),
      packQuantity: Number(formData.get("packQuantity")),
      createdBy: user.name,
      pushToShopify: formData.get("pushToShopify") === "on",
    });
    revalidatePath("/");
    revalidatePath("/bewegungen");
    revalidatePath("/verpacken");
    revalidatePath("/wareneingang/verpackung");
    return { ok: true, message: "Verpackt und Lager aktualisiert." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function receivePackagingStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await receivePackagingStock({
      packSize: Number(formData.get("packSize")),
      quantity: Number(formData.get("quantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/wareneingang/verpackung");
    revalidatePath("/verpacken");
    revalidatePath("/");
    return { ok: true, message: "Verpackungsmaterial gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function adjustPackagingStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await adjustPackagingStock({
      packSize: Number(formData.get("packSize")),
      newQuantity: Number(formData.get("newQuantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/");
    revalidatePath("/wareneingang/verpackung");
    revalidatePath("/verpacken");
    return { ok: true, message: "Korrektur gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function receiveCartonStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await receiveCartonStock({
      quantity: Number(formData.get("quantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/wareneingang/verpackung");
    revalidatePath("/");
    return { ok: true, message: "Kartons gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function adjustCartonStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await adjustCartonStock({
      newQuantity: Number(formData.get("newQuantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/wareneingang/verpackung");
    revalidatePath("/");
    return { ok: true, message: "Korrektur gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function updateReorderSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
    const leadTimeDays = Number(formData.get("leadTimeDays"));
    const safetyBufferDays = Number(formData.get("safetyBufferDays"));
    const warningWindowDays = Number(formData.get("warningWindowDays"));

    if ([leadTimeDays, safetyBufferDays, warningWindowDays].some((n) => !Number.isFinite(n) || n < 0)) {
      throw new Error("Alle Werte müssen gültige, nicht-negative Zahlen sein.");
    }

    await updateReorderSettings({ leadTimeDays, safetyBufferDays, warningWindowDays });
    revalidatePath("/");
    revalidatePath("/analytics");
    revalidatePath("/einstellungen");
    return { ok: true, message: "Bestellpunkt-Parameter gespeichert." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function adjustStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await adjustLooseStock({
      sizeId: String(formData.get("sizeId")),
      newQuantity: Number(formData.get("newQuantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/");
    revalidatePath("/bewegungen");
    return { ok: true, message: "Korrektur gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");

    if (newPassword.length < 6) {
      throw new Error("Neues Passwort muss mindestens 6 Zeichen haben.");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new Error("Aktuelles Passwort ist falsch.");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return { ok: true, message: "Passwort geändert." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function updateThresholdAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await prisma.size.update({
      where: { id: String(formData.get("sizeId")) },
      data: { reorderThreshold: Number(formData.get("reorderThreshold")) },
    });
    revalidatePath("/");
    revalidatePath("/einstellungen");
    return { ok: true, message: "Schwellenwert gespeichert." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function linkShopifyVariantAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    if (!isShopifyConfigured()) {
      throw new Error(
        "Shopify ist nicht konfiguriert (SHOPIFY_STORE_DOMAIN / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in .env setzen).",
      );
    }
    const sku = String(formData.get("sku") ?? "").trim();
    const variantId = String(formData.get("variantId"));
    if (!sku) throw new Error("SKU angeben.");

    const found = await lookupVariantBySku(sku);
    if (!found) throw new Error(`Keine Shopify-Variante mit SKU "${sku}" gefunden.`);

    await prisma.shopifyVariant.update({
      where: { id: variantId },
      data: {
        shopifyVariantId: found.id,
        shopifyInventoryItemId: found.inventoryItem.id,
        sku: found.sku,
        title: `${found.product.title} – ${found.title}`,
      },
    });
    revalidatePath("/einstellungen");
    return { ok: true, message: `Verknüpft mit "${found.product.title} – ${found.title}".` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function correctShopifyStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
    if (!isShopifyConfigured()) {
      throw new Error(
        "Shopify ist nicht konfiguriert (SHOPIFY_STORE_DOMAIN / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in .env setzen).",
      );
    }
    const result = await correctShopifyVariantStock({
      variantId: String(formData.get("variantId")),
      newQuantity: Number(formData.get("newQuantity")),
    });
    revalidatePath("/");
    revalidatePath("/einstellungen");
    return {
      ok: true,
      message: `${result.sizeLabel} ${result.packSize}er: ${result.previous} → ${result.newQuantity} korrigiert.`,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function saveLocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const locationId = String(formData.get("locationId"));
    await prisma.shopifyConfig.upsert({
      where: { id: "singleton" },
      update: { locationId },
      create: { id: "singleton", locationId },
    });
    revalidatePath("/einstellungen");
    return { ok: true, message: "Standort gespeichert." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function syncShopifyAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    if (!isShopifyConfigured()) {
      throw new Error(
        "Shopify ist nicht konfiguriert (SHOPIFY_STORE_DOMAIN / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET in .env setzen).",
      );
    }
    await syncInventoryLevels();
    const count = await syncSales();
    revalidatePath("/");
    revalidatePath("/einstellungen");
    revalidatePath("/statistik");
    revalidatePath("/analytics");
    return { ok: true, message: `Sync abgeschlossen (${count} Tages-Einträge aktualisiert).` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
