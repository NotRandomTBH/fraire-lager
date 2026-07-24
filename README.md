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

Die App läuft auf **Vercel** (immer erreichbar unter einer festen URL) und
speichert alle Daten in einer **Neon-Postgres-Datenbank** – ein einziger
gemeinsamer Datenbestand, egal ob ihr die App unterwegs übers Handy oder
lokal auf einem Rechner öffnet.

## Login

Es gibt 3 Accounts: **Gianluca**, **Maurice**, **Maxim**. Start-Passwort für
alle: `willkommen2026`. Jede Person kann ihr Passwort unter
**Einstellungen → Eigenes Passwort ändern** selbst ändern (empfohlen, sobald
alle einmal drin waren).

## Lokale Entwicklung

```bash
npm install
npm run build   # einmalig, prüft dass alles kompiliert
npm run dev
```

Danach ist die App unter [http://localhost:3000](http://localhost:3000)
erreichbar. Sie verbindet sich dabei mit derselben Neon-Datenbank wie die
Live-Version auf Vercel (`DATABASE_URL` in `.env`) – lokale Test-Buchungen
landen also im echten Bestand. Zum Gefahrlosen Testen könnt ihr in Neon
jederzeit eine zweite, separate Datenbank/Branch anlegen und `.env` lokal
darauf zeigen lassen.

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

## Deployment (Vercel)

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden.
2. **Add New → Project** → Repo `NotRandomTBH/fraire-lager` importieren.
3. Unter **Environment Variables** setzen:
   - `DATABASE_URL` – der Neon-Connection-String (aus neon.tech, Projekt →
     Connection String)
   - optional `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN`
4. **Deploy** klicken.

Jeder `git push` auf `main` deployt danach automatisch neu.

## Technischer Aufbau

- Next.js (App Router) + TypeScript + Tailwind CSS
- Postgres (Neon, serverless) via Prisma (`prisma/schema.prisma`)
- Server Actions für alle Buchungen (`src/app/actions.ts`)
- Shopify Admin GraphQL API (`src/lib/shopify.ts`)

### Datenbank-Befehle

```bash
npx prisma studio          # Datenbank im Browser ansehen/bearbeiten
npx prisma migrate dev     # neue Migration nach Schema-Änderung
npx tsx prisma/seed.ts     # Grössen, Varianten-Platzhalter & Accounts neu anlegen
```
