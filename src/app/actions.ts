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
  addStockExitNote,
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
import { parseDateOnlyInput } from "@/lib/date";
import { defectItemLabel } from "@/lib/labels";
import {
  adjustMaxLagerPackagingStock,
  adjustMaxLagerStock,
  recordMaxLagerSale,
  transferLooseToMaxLager,
  transferPackagingToMaxLager,
} from "@/lib/maxlager";
import { buildDefectReportsPdf, buildStockExitsPdf } from "@/lib/pdf";
import { updateReorderSettings } from "@/lib/reorder";
import {
  isShopifyConfigured,
  lookupVariantBySku,
  syncInventoryLevels,
  syncSales,
} from "@/lib/shopify";

export type ActionState = { ok: boolean; message: string };

// Eigene Fehlerklasse statt eines generischen Error, damit toActionState()
// diesen Fall zuverlässig erkennen kann (nicht nur an der Nachricht).
class AuthRequiredError extends Error {
  constructor() {
    super("Nicht angemeldet.");
    this.name = "AuthRequiredError";
  }
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthRequiredError();
  return user;
}

// Zentrale Fehlerbehandlung für alle Actions: Ist die Session abgelaufen oder
// ungültig geworden (z.B. ein lange offener Tab), leitet das direkt zur
// Login-Seite um, statt nur eine Fehlermeldung neben einer veralteten
// "angemeldet"-Ansicht anzuzeigen – das hat zuvor verwirrend gewirkt, weil
// die Kopfzeile noch den Namen zeigte, obwohl die Session serverseitig schon
// weg war.
function toActionState(e: unknown): ActionState {
  if (e instanceof AuthRequiredError) {
    redirect("/login");
  }
  return { ok: false, message: (e as Error).message };
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    const itemsRaw = String(formData.get("items") ?? "[]");
    let items: {
      itemType: StockExitItemType;
      sizeId: string | null;
      packSize: number | null;
      quantity: number;
    }[] = [];
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      items = [];
    }
    if (items.length === 0) {
      throw new Error("Keine Position zum Austragen.");
    }

    const reason = String(formData.get("reason") ?? "");
    const recipient = String(formData.get("recipient") ?? "") || undefined;
    const dateRaw = String(formData.get("date") ?? "");
    const date = dateRaw ? parseDateOnlyInput(dateRaw) : new Date();
    const pushToShopify = formData.get("pushToShopify") === "on";

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await recordStockExit({
          itemType: item.itemType,
          sizeId: item.sizeId,
          packSize: item.packSize,
          quantity: item.quantity,
          reason,
          recipient,
          date,
          createdBy: user.name,
          pushToShopify,
        });
      } catch (e) {
        const doneMsg = i > 0 ? ` ${i} vorherige Position(en) wurden bereits gebucht.` : "";
        throw new Error(`Position ${i + 1} von ${items.length}: ${(e as Error).message}${doneMsg}`);
      }
    }

    revalidatePath("/");
    revalidatePath("/warenausgang");
    revalidatePath("/bewegungen");
    return {
      ok: true,
      message: items.length === 1 ? "Austrag gebucht." : `${items.length} Austräge gebucht.`,
    };
  } catch (e) {
    return toActionState(e);
  }
}

export async function addStockExitNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await addStockExitNote({
      stockExitId: String(formData.get("stockExitId")),
      text: String(formData.get("text") ?? ""),
      createdBy: user.name,
    });
    revalidatePath("/bewegungen");
    return { ok: true, message: "Notiz hinzugefügt." };
  } catch (e) {
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
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
    return toActionState(e);
  }
}

export async function transferLooseToMaxLagerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await transferLooseToMaxLager({
      sizeId: String(formData.get("sizeId")),
      quantity: Number(formData.get("quantity")),
      createdBy: user.name,
    });
    revalidatePath("/maxims-lager");
    revalidatePath("/wareneingang/unterhosen");
    revalidatePath("/bewegungen");
    revalidatePath("/");
    return { ok: true, message: "Übernommen." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function transferPackagingToMaxLagerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await transferPackagingToMaxLager({
      packSize: Number(formData.get("packSize")),
      quantity: Number(formData.get("quantity")),
      createdBy: user.name,
    });
    revalidatePath("/maxims-lager");
    revalidatePath("/wareneingang/verpackung");
    revalidatePath("/bewegungen");
    revalidatePath("/");
    return { ok: true, message: "Übernommen." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function adjustMaxLagerStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await adjustMaxLagerStock({
      sizeId: String(formData.get("sizeId")),
      newQuantity: Number(formData.get("newQuantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/maxims-lager");
    revalidatePath("/bewegungen");
    return { ok: true, message: "Korrektur gebucht." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function adjustMaxLagerPackagingStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    await adjustMaxLagerPackagingStock({
      packSize: Number(formData.get("packSize")),
      newQuantity: Number(formData.get("newQuantity")),
      note: String(formData.get("note") ?? "") || undefined,
      createdBy: user.name,
    });
    revalidatePath("/maxims-lager");
    revalidatePath("/bewegungen");
    return { ok: true, message: "Korrektur gebucht." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function recordMaxLagerSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const dateRaw = String(formData.get("date") ?? "");
    await recordMaxLagerSale({
      sizeId: String(formData.get("sizeId")),
      packSize: Number(formData.get("packSize")),
      quantity: Number(formData.get("quantity")),
      recipient: String(formData.get("recipient") ?? "") || undefined,
      note: String(formData.get("note") ?? "") || undefined,
      date: dateRaw ? parseDateOnlyInput(dateRaw) : new Date(),
      createdBy: user.name,
    });
    revalidatePath("/maxims-lager");
    revalidatePath("/bewegungen");
    revalidatePath("/");
    return { ok: true, message: "Verkauf gebucht." };
  } catch (e) {
    return toActionState(e);
  }
}
