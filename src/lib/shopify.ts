import { prisma } from "@/lib/prisma";

const API_VERSION = "2025-01";

function getCredentials() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!domain || !clientId || !clientSecret) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID und SHOPIFY_CLIENT_SECRET sind nicht gesetzt (.env prüfen).",
    );
  }
  return { domain, clientId, clientSecret };
}

export function isShopifyConfigured() {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      process.env.SHOPIFY_CLIENT_ID &&
      process.env.SHOPIFY_CLIENT_SECRET,
  );
}

// Holt per Client Credentials Grant einen frischen Admin-API-Token (gültig 24h).
// Kein statischer Token nötig – die App besorgt sich bei jedem Aufruf selbst einen.
async function getAccessToken(domain: string, clientId: string, clientSecret: string) {
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify Token-Fehler: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function shopifyGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { domain, clientId, clientSecret } = getCredentials();
  const token = await getAccessToken(domain, clientId, clientSecret);

  const res = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Shopify API Fehler: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL Fehler: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

export async function fetchLocations() {
  const data = await shopifyGraphQL<{
    locations: { nodes: { id: string; name: string }[] };
  }>(`query { locations(first: 20) { nodes { id name } } }`);
  return data.locations.nodes;
}

export async function lookupVariantBySku(sku: string) {
  const data = await shopifyGraphQL<{
    productVariants: {
      nodes: {
        id: string;
        title: string;
        sku: string;
        inventoryItem: { id: string };
        product: { title: string };
      }[];
    };
  }>(
    `query($query: String!) {
      productVariants(first: 1, query: $query) {
        nodes {
          id
          title
          sku
          inventoryItem { id }
          product { title }
        }
      }
    }`,
    { query: `sku:${sku}` },
  );
  return data.productVariants.nodes[0] ?? null;
}

// Passt den Shopify-Bestand einer Packungs-Variante um `delta` Packungen an
// (positiv = mehr Packungen verfügbar, z.B. nach dem Verpacken).
export async function adjustInventory(
  inventoryItemId: string,
  locationId: string,
  delta: number,
) {
  if (delta === 0) return;
  await shopifyGraphQL(
    `mutation($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        userErrors { field message }
      }
    }`,
    {
      input: {
        reason: "correction",
        name: "available",
        changes: [
          {
            inventoryItemId,
            locationId,
            delta,
          },
        ],
      },
    },
  );
}

// Fragt den tatsächlich aktuellen ("live") verfügbaren Bestand einer
// Inventory-Item-ID an einer Location direkt bei Shopify ab (nicht aus dem
// lokalen Cache).
export async function fetchLiveInventoryLevel(inventoryItemId: string, locationId: string) {
  const data = await shopifyGraphQL<{
    inventoryItem: {
      inventoryLevel: { quantities: { name: string; quantity: number }[] } | null;
    } | null;
  }>(
    `query($id: ID!, $locationId: ID!) {
      inventoryItem(id: $id) {
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) { name quantity }
        }
      }
    }`,
    { id: inventoryItemId, locationId },
  );

  return (
    data.inventoryItem?.inventoryLevel?.quantities.find((q) => q.name === "available")
      ?.quantity ?? 0
  );
}

export async function syncInventoryLevels() {
  const config = await prisma.shopifyConfig.findUnique({
    where: { id: "singleton" },
  });
  if (!config?.locationId) {
    throw new Error("Keine Shopify-Location konfiguriert (Einstellungen).");
  }

  const variants = await prisma.shopifyVariant.findMany({
    where: { shopifyInventoryItemId: { not: null } },
  });

  for (const variant of variants) {
    const available = await fetchLiveInventoryLevel(
      variant.shopifyInventoryItemId!,
      config.locationId,
    );

    await prisma.shopifyVariant.update({
      where: { id: variant.id },
      data: { packStock: available },
    });
  }

  await prisma.shopifyConfig.update({
    where: { id: "singleton" },
    data: { lastInventorySync: new Date() },
  });
}

// Korrigiert den Shopify-Bestand einer Variante auf einen absoluten Wert
// (z.B. nach einer Inventur oder wenn er durch manuelle Änderungen in Shopify
// nicht mehr stimmt). Holt zuerst den echten Live-Wert, damit das Delta exakt
// stimmt und nicht auf einem eventuell veralteten Cache-Wert basiert.
export async function correctInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  newQuantity: number,
) {
  const live = await fetchLiveInventoryLevel(inventoryItemId, locationId);
  const delta = newQuantity - live;
  if (delta !== 0) {
    await adjustInventory(inventoryItemId, locationId, delta);
  }
  return { previous: live, newQuantity };
}

const AUTO_SYNC_MIN_INTERVAL_MS = 60_000;

// Wird beim Öffnen des Dashboards aufgerufen: aktualisiert den Shopify-Packungsbestand
// automatisch im Hintergrund, aber höchstens einmal pro Minute (kein Sync bei jedem
// Reload) und schlägt niemals laut fehl – der Dashboard-Aufruf soll nicht daran scheitern.
export async function syncInventoryLevelsIfStale() {
  if (!isShopifyConfigured()) return;

  try {
    const config = await prisma.shopifyConfig.findUnique({ where: { id: "singleton" } });
    if (!config?.locationId) return;

    const isStale =
      !config.lastInventorySync ||
      Date.now() - config.lastInventorySync.getTime() > AUTO_SYNC_MIN_INTERVAL_MS;
    if (!isStale) return;

    await syncInventoryLevels();
  } catch (e) {
    console.error("Auto-Sync Shopify-Bestand fehlgeschlagen:", e);
  }
}

// Holt Bestellungen der letzten `days` Tage und aggregiert verkaufte Packungen
// pro Grösse+Packgrösse+Tag (Tagesgranularität, für 7d/30d-Durchschnitte und
// den Tagesverlauf-Chart). Standard 60 Tage, damit auch der 30-Tage-Schnitt
// noch etwas Vorlauf hat.
export async function syncSales(days = 60) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const variants = await prisma.shopifyVariant.findMany({
    where: { shopifyVariantId: { not: "" } },
  });
  const variantMap = new Map(variants.map((v) => [v.shopifyVariantId, v]));

  type DayBucket = { sizeId: string; packSize: number; date: Date; packsSold: number };
  const byDay = new Map<string, DayBucket>();

  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const data: {
      orders: {
        pageInfo: { hasNextPage: boolean };
        edges: {
          cursor: string;
          node: {
            createdAt: string;
            lineItems: {
              nodes: { quantity: number; variant: { id: string } | null }[];
            };
          };
        }[];
      };
    } = await shopifyGraphQL(
      `query($query: String!, $after: String) {
        orders(first: 100, after: $after, query: $query) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              createdAt
              lineItems(first: 50) {
                nodes { quantity variant { id } }
              }
            }
          }
        }
      }`,
      { query: `created_at:>=${since.toISOString()}`, after: cursor },
    );

    for (const edge of data.orders.edges) {
      const day = new Date(edge.node.createdAt);
      day.setUTCHours(0, 0, 0, 0);

      for (const li of edge.node.lineItems.nodes) {
        if (!li.variant) continue;
        const variant = variantMap.get(li.variant.id);
        if (!variant) continue;

        const key = `${variant.sizeId}|${variant.packSize}|${day.getTime()}`;
        const existing = byDay.get(key);
        if (existing) {
          existing.packsSold += li.quantity;
        } else {
          byDay.set(key, {
            sizeId: variant.sizeId,
            packSize: variant.packSize,
            date: day,
            packsSold: li.quantity,
          });
        }
      }
      cursor = edge.cursor;
    }
    hasNext = data.orders.pageInfo.hasNextPage;
  }

  // Der abgefragte Zeitraum wird komplett neu berechnet – alte Tage darin
  // vorher löschen, sonst würden sich die Werte bei jedem erneuten Sync
  // aufaddieren statt den aktuellen Stand widerzuspiegeln.
  await prisma.dailySales.deleteMany({ where: { date: { gte: since } } });

  for (const bucket of byDay.values()) {
    await prisma.dailySales.upsert({
      where: {
        sizeId_packSize_date: {
          sizeId: bucket.sizeId,
          packSize: bucket.packSize,
          date: bucket.date,
        },
      },
      update: { packsSold: bucket.packsSold },
      create: bucket,
    });
  }

  await prisma.shopifyConfig.update({
    where: { id: "singleton" },
    data: { lastSalesSync: new Date() },
  });

  return byDay.size;
}
