# Lagerverwaltung

Web-App zur Verwaltung des Unterhosen-Lagers auf Ebene einzelner Teile
(Grössen S/M/L/XL), die intern zu Packungen (1er/3er/5er) für Shopify
verpackt werden. Mit Nachbestell-Alerts und optionalem Shopify-Abgleich
(Bestand & Verkaufszahlen).

## Was die App macht

- **Wareneingang**: neue lose Einzelteile pro Grösse einbuchen.
- **Verpacken**: lose Teile zu einer Packung (1er/3er/5er) zusammenstellen –
  reduziert automatisch den losen Bestand und protokolliert die Bewegung.
  Ist die Packung mit Shopify verknüpft, wird deren Shopify-Bestand direkt
  um die verpackte Menge erhöht.
- **Dashboard**: aktueller Bestand pro Grösse, Nachbestell-Alert sobald der
  lose Bestand unter die konfigurierte Schwelle fällt, sowie Bestseller der
  letzten 30 Tage.
- **Bewegungen**: vollständige Historie aller Buchungen.
- **Statistik**: verkaufte Packungen pro Grösse/Packungsgrösse (aus Shopify).
- **Einstellungen**: Nachbestell-Schwellen pro Grösse, Shopify-Lagerort,
  Verknüpfung jeder Grösse×Packungsgrösse-Kombination mit der passenden
  Shopify-Variante (per SKU), eigenes Passwort ändern.
- **Login**: jede Buchung wird automatisch der angemeldeten Person zugeordnet.

Daten liegen lokal in einer SQLite-Datei (`dev.db`), es braucht keine
externe Datenbank.

## Login

Es gibt 3 Accounts: **Gianluca**, **Maurice**, **Maxim**. Start-Passwort für
alle: `willkommen2026`. Jede Person kann ihr Passwort unter
**Einstellungen → Eigenes Passwort ändern** selbst ändern (empfohlen, sobald
alle einmal drin waren).

## Setup

```bash
npm install
npm run build   # einmalig, prüft dass alles kompiliert
npm run dev
```

Danach ist die App unter [http://localhost:3000](http://localhost:3000)
erreichbar. Läuft der Rechner im selben WLAN wie eure Kolleg:innen, ist sie
auch über die im Terminal angezeigte "Network"-Adresse (z.B.
`http://192.168.1.16:3000`) erreichbar – so können mehrere Personen
gleichzeitig arbeiten, ohne dass jede/r einen eigenen Server braucht.

Für den Dauerbetrieb (statt `npm run dev` im Terminal offen zu lassen):

```bash
npm run build
npm run start
```

### Hinweis zum Ordnernamen

Der Ordnername `Lager:fraire` enthält einen Doppelpunkt. Auf macOS/Linux ist
`:` das Trennzeichen in der `PATH`-Umgebungsvariable – das bricht normalerweise
Befehle wie `next dev`, die intern über `PATH` aufgelöst werden. Die
`npm`-Skripte in `package.json` sind deshalb so angepasst, dass sie `next`
direkt über einen relativen Pfad statt über `PATH` aufrufen; `npm run dev` /
`build` / `start` funktionieren dadurch normal. Falls ihr den Ordner trotzdem
umbenennt (z.B. zu `Lager-fraire`), funktioniert auch die ursprüngliche
Variante ohne diese Anpassung.

## Shopify-Anbindung einrichten

1. Im Shopify Admin unter **Einstellungen → Apps und Vertriebskanäle →
   Apps entwickeln** eine Custom App erstellen.
2. Admin-API-Berechtigungen `read_products`, `read_inventory`,
   `write_inventory` und `read_orders` aktivieren.
3. Admin-API-Access-Token generieren.
4. In `.env` eintragen:
   ```
   SHOPIFY_STORE_DOMAIN="eure-firma.myshopify.com"
   SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_..."
   ```
5. Server neu starten.
6. Unter **Einstellungen** in der App: Lagerort auswählen, danach für jede
   der 12 Grösse/Packungsgrösse-Kombinationen die passende Shopify-SKU
   eintragen und verknüpfen.
7. Auf dem Dashboard "Mit Shopify synchronisieren" klicken, um aktuelle
   Packungsbestände und Verkaufszahlen (letzte 30 Tage) zu holen.

Ohne Shopify-Konfiguration funktionieren Wareneingang, Verpacken (lokal),
Bestandskorrektur, Bewegungshistorie und Nachbestell-Alerts bereits normal –
nur der Shopify-Bestandsabgleich und die Verkaufsstatistik bleiben leer.

## Technischer Aufbau

- Next.js (App Router) + TypeScript + Tailwind CSS
- SQLite via Prisma (`prisma/schema.prisma`)
- Server Actions für alle Buchungen (`src/app/actions.ts`)
- Shopify Admin GraphQL API (`src/lib/shopify.ts`)

### Datenbank-Befehle

```bash
npx prisma studio          # Datenbank im Browser ansehen/bearbeiten
npx prisma migrate dev     # neue Migration nach Schema-Änderung
npx tsx prisma/seed.ts     # Grössen & Varianten-Platzhalter neu anlegen
```
