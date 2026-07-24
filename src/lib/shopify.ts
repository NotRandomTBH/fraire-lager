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
      { id: variant.shopifyInventoryItemId, locationId: config.locationId },
    );

    const available =
      data.inventoryItem?.inventoryLevel?.quantities.find(
        (q) => q.name === "available",
      )?.quantity ?? 0;

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

// Holt Bestellungen der letzten `days` Tage und aggregiert verkaufte Menge pro Variante.
export async function syncSales(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const variants = await prisma.shopifyVariant.findMany({
    where: { shopifyVariantId: { not: "" } },
  });
  const variantMap = new Map(variants.map((v) => [v.shopifyVariantId, v]));

  const sold = new Map<string, number>();
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const data: {
      orders: {
        pageInfo: { hasNextPage: boolean };
        edges: {
          cursor: string;
          node: {
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
      for (const li of edge.node.lineItems.nodes) {
        if (!li.variant) continue;
        if (!variantMap.has(li.variant.id)) continue;
        sold.set(li.variant.id, (sold.get(li.variant.id) ?? 0) + li.quantity);
      }
      cursor = edge.cursor;
    }
    hasNext = data.orders.pageInfo.hasNextPage;
  }

  const periodEnd = new Date();

  // Jeder Sync berechnet das rollierende 30-Tage-Fenster neu von Grund auf –
  // alte Snapshots vorher löschen, sonst würden sich die Summen bei jedem
  // erneuten Sync aufaddieren statt den aktuellen Stand widerzuspiegeln.
  await prisma.salesSnapshot.deleteMany({});

  for (const [shopifyVariantId, unitsSold] of sold.entries()) {
    const variant = variantMap.get(shopifyVariantId)!;
    const size = await prisma.size.findUnique({ where: { id: variant.sizeId } });
    if (!size) continue;
    await prisma.salesSnapshot.create({
      data: {
        shopifyVariantId,
        sizeLabel: size.label,
        packSize: variant.packSize,
        unitsSold,
        periodStart: since,
        periodEnd,
      },
    });
  }

  await prisma.shopifyConfig.update({
    where: { id: "singleton" },
    data: { lastSalesSync: new Date() },
  });

  return sold.size;
}
