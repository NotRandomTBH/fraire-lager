import { prisma } from "@/lib/prisma";
import { fetchLocations, isShopifyConfigured } from "@/lib/shopify";
import { ThresholdForm } from "@/components/ThresholdForm";
import { VariantLinkForm } from "@/components/VariantLinkForm";
import { LocationForm } from "@/components/LocationForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function EinstellungenPage() {
  const configured = isShopifyConfigured();
  const [sizes, config] = await Promise.all([
    prisma.size.findMany({
      orderBy: { order: "asc" },
      include: { shopifyVariants: { orderBy: { packSize: "asc" } } },
    }),
    prisma.shopifyConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  let locations: { id: string; name: string }[] = [];
  let locationError: string | null = null;
  if (configured) {
    try {
      locations = await fetchLocations();
    } catch (e) {
      locationError = (e as Error).message;
    }
  }

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">Einstellungen</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Eigenes Passwort ändern</h2>
        <ChangePasswordForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Nachbestell-Schwellen</h2>
        <p className="text-sm text-neutral-600">
          Alert erscheint auf dem Dashboard, sobald der lose Bestand einer Grösse
          unter diesen Wert fällt.
        </p>
        <div className="space-y-2">
          {sizes.map((s) => (
            <ThresholdForm key={s.id} sizeId={s.id} label={s.label} value={s.reorderThreshold} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Shopify-Verbindung</h2>
        {!configured ? (
          <p className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            In <code className="rounded bg-neutral-100 px-1">.env</code> die Variablen{" "}
            <code className="rounded bg-neutral-100 px-1">SHOPIFY_STORE_DOMAIN</code> und{" "}
            <code className="rounded bg-neutral-100 px-1">SHOPIFY_ADMIN_ACCESS_TOKEN</code>{" "}
            setzen (Custom App im Shopify Admin → Admin API Access Token) und den Server
            neu starten.
          </p>
        ) : (
          <>
            {locationError && (
              <p className="text-sm text-red-600">{locationError}</p>
            )}
            <LocationForm locations={locations} currentLocationId={config?.locationId ?? ""} />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Shopify-Varianten verknüpfen</h2>
        <p className="text-sm text-neutral-600">
          Jede Kombination aus Grösse und Packungsgrösse mit der passenden Shopify-SKU
          verknüpfen, damit Verpacken & Sync funktionieren.
        </p>
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-2">Grösse</th>
                <th className="px-4 py-2">Pack</th>
                <th className="px-4 py-2">Verknüpft mit</th>
                <th className="px-4 py-2">SKU eingeben</th>
              </tr>
            </thead>
            <tbody>
              {sizes.flatMap((s) =>
                s.shopifyVariants.map((v) => (
                  <tr key={v.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 font-medium">{s.label}</td>
                    <td className="px-4 py-2">{v.packSize}er</td>
                    <td className="px-4 py-2 text-neutral-600">
                      {v.shopifyVariantId ? (v.title ?? v.sku) : "– nicht verknüpft –"}
                    </td>
                    <td className="px-4 py-2">
                      <VariantLinkForm variantId={v.id} disabled={!configured} />
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
