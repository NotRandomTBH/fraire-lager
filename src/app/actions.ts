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
  adjustLooseStock,
  createDefectReason,
  packStock,
  receiveStock,
  recordDefect,
} from "@/lib/inventory";
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
    const defectQuantity = Number(formData.get("defectQuantity") ?? 0);

    if (quantity <= 0 && defectQuantity <= 0) {
      throw new Error("Menge oder Defekt-Menge angeben.");
    }

    if (quantity > 0) {
      await receiveStock({
        sizeId,
        quantity,
        note: String(formData.get("note") ?? "") || undefined,
        createdBy: user.name,
      });
    }

    if (defectQuantity > 0) {
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
        sizeId,
        quantity: defectQuantity,
        note: String(formData.get("defectNote") ?? "") || undefined,
        createdBy: user.name,
        photoDataUrls,
        reasonIds,
      });
    }

    revalidatePath("/");
    revalidatePath("/bewegungen");
    revalidatePath("/defekte");
    return { ok: true, message: "Wareneingang gebucht." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function createDefectReasonAction(label: string) {
  await requireUser();
  const reason = await createDefectReason(label);
  revalidatePath("/wareneingang");
  return reason;
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
    return { ok: true, message: "Verpackt und Lager aktualisiert." };
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
    const count = await syncSales(30);
    revalidatePath("/");
    revalidatePath("/einstellungen");
    revalidatePath("/statistik");
    return { ok: true, message: `Sync abgeschlossen (${count} Varianten mit Verkäufen).` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
