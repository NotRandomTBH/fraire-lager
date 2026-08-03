# Lagerverwaltung

Web-App zur Verwaltung des Unterhosen-Lagers auf Ebene einzelner Teile
(Grössen S/M/L/XL), die intern zu Packungen (1er/3er/5er) für Shopify
verpackt werden. Mit Nachbestell-Alerts und optionalem Shopify-Abgleich
(Bestand & Verkaufszahlen).

## Was die App macht

Die Navigation ist in **Dashboard**, das Dropdown-Menü **Lager** (Wareneingang
Unterhosen/Verpackung, Warenausgang, Verpacken, Defekte erfassen, Maxims
Lager), **Bewegungen**, **Defekte**, **Statistik**, **Analytics** und
**Einstellungen** gegliedert.

- **Wareneingang Unterhosen**: neue lose Einzelteile pro Grösse einbuchen.
  Inkl. Bestandskorrektur für Inventuren.
- **Wareneingang Verpackung**: eigener Bestand für die 1er/3er/5er-
  Verpackungen (Beutel/Kartons) und für Versandkartons – beide
  grössenunabhängig nachfüllbar und für Inventurkorrekturen direkt auf einen
  tatsächlich gezählten Wert korrigierbar.
- **Defekte erfassen**: zentrale Stelle für Defekte an Unterhosen (mit
  Grösse), Verpackungsmaterial (mit Packgrösse) oder Versandkartons – Menge,
  vorbereitete Defekt-Art (mehrfach auswählbar, neue Arten direkt anlegbar),
  Notiz und Fotos. Zählt nicht zum verkaufbaren Bestand.
- **Defekte**: Protokoll aller erfassten Defekte (Unterhosen, Verpackungs-
  material, Versandkartons) mit Fotos, Menge, Defekt-Art(en), Notiz,
  Zeitpunkt und wer's erfasst hat. Fotos und Bemerkungen lassen sich
  jederzeit nachträglich hinzufügen; Menge/Notiz bearbeiten verlangt eine
  Begründung (protokolliert). Mehrere Einträge auswählen und als PDF (ohne
  Fotos) exportieren, z.B. für den Produzenten – das PDF hat eine zweite
  Seite auf Portugiesisch (feste Begriffe und vorbereitete Defekt-Arten
  übersetzt; frei getippte Notizen bleiben Deutsch).
- **Verpacken**: lose Teile zu einer Packung (1er/3er/5er) zusammenstellen –
  reduziert automatisch den losen Bestand und protokolliert die Bewegung.
  Ist die Packung mit Shopify verknüpft, wird deren Shopify-Bestand direkt
  um die verpackte Menge erhöht. Verbraucht dabei automatisch das passende
  Verpackungsmaterial (1er/3er/5er) – unabhängig von der Unterhosen-Grösse,
  Verpacken wird blockiert, wenn nicht genug davon da ist.
- **Warenausgang**: Unterhosen (lose oder verpackt), Verpackungsmaterial oder
  Versandkartons austragen, die nicht über Shopify verkauft wurden (Muster,
  Geschenke, Ersatzlieferungen, Verschleiss, ...) – mit Begründung, Empfänger
  und Datum. Reduziert den jeweiligen Bestand sofort; bei verpackten
  Unterhosen optional auch den echten Shopify-Bestand. Mehrere Positionen
  (auch unterschiedlicher Art) lassen sich vor dem Buchen sammeln und mit
  einer gemeinsamen Begründung/Empfänger/Datum als eine Buchung austragen.
  Zusätzliche Option "Shopify-Bestand": reduziert mit Begründung nur den
  echten Shopify-Bestand einer Grösse/Packgrösse-Kombination, ohne das
  Hauptlager anzurühren.
- **Maxims Lager**: zweites, kleineres Lager mit eigenem Bestand an losen
  Teilen (pro Grösse) und Verpackungsmaterial (pro Packgrösse), befüllt durch
  Übernahme vom Hauptlager (reduziert dort automatisch den Bestand). Von dort
  aus lässt sich eine Bestellung direkt verpacken & verschicken (Grösse +
  Packgrösse + Menge + Empfänger + Datum) – das verbraucht lose Teile und
  Verpackungsmaterial aus Maxims Lager und erhöht, falls die Kombination mit
  Shopify verknüpft ist, automatisch den Shopify-Bestand der Variante um die
  verkaufte Menge. Hintergrund: Shopify zieht bei Bestelleingang automatisch
  ab, aber wenn dann aus Maxims statt dem Hauptlager verschickt wird, hat das
  Hauptlager nichts hergegeben – die Erhöhung gleicht das aus. Inkl.
  Bestandskorrektur für Inventuren.
- **Bewegungen**: vereinheitlichtes Protokoll aller Bestandsbewegungen
  (Wareneingang, Verpackt, Korrektur, Austrag, Maxims Lager) über Unterhosen,
  Verpackungsmaterial und Versandkartons hinweg. Austräge lassen sich darin
  auswählen und als PDF exportieren, sowie nachträglich mit einer Notiz
  ergänzen (z.B. wenn sich nachträglich noch Details ergeben).
- **Dashboard**: aktueller Bestand pro Grösse, automatische Nachbestell-Ampel
  (Rot/Gelb/Grün/Grau) + Reichweite in Tagen pro Grösse und fürs
  Verpackungsmaterial, Gesamtstatus oben (schlechteste Grösse, da in einer
  MOQ-Charge zusammen bestellt wird), Versandkarton-Bestand, plus Bestseller
  der letzten 30 Tage.
- **Analytics**: pro Grösse ein Tagesverkaufs-Chart (45 Tage), Bestand-
  Aufschlüsselung (lose/verpackt), Bestellpunkt, Tage bis Bestellung nötig,
  vorgeschlagenes Bestelldatum und ein live berechneter Begründungstext.
  Warnt explizit bei "geringer Datenbasis" (< 14 Tage Verkaufshistorie).
  Verpackungsmaterial ebenfalls mit eigener Ampel (niedrigere Priorität).
- **Statistik**: verkaufte Packungen pro Grösse/Packungsgrösse (aus Shopify).
- **Einstellungen**: Parameter der automatischen Nachbestell-Prognose
  (Lieferzeit/Puffer/Warnfenster, Standard 80/14/30 Tage), Nachbestell-
  Schwellen pro Grösse als manueller Override, Shopify-Lagerort, Verknüpfung
  jeder Grösse×Packungsgrösse-Kombination mit der passenden Shopify-Variante
  (per SKU) inkl. direkter Bestandskorrektur (z.B. nach einer Inventur – ohne
  Umweg über das Shopify-Admin, die App holt vorher den echten Live-Wert und
  passt nur die Differenz an), eigenes Passwort ändern.
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

Shopify hat 2025 den alten "Custom App im Admin"-Weg abgeschafft. Neue Apps
laufen über das **Dev Dashboard** (dev.shopify.com) und nutzen den
**Client Credentials Grant** – die App holt sich damit bei jedem Shopify-Call
selbst einen frischen 24h-Token, es gibt keinen einzelnen langlebigen Token
mehr zu kopieren.

1. Auf [dev.shopify.com](https://dev.shopify.com) einloggen, App erstellen
   (z.B. "Lagerverwaltung").
2. Bei **API-Zugriff → Bereiche**: `read_products,read_inventory,write_inventory,read_orders`
   eintragen. Häkchen bei **"Alten Installations-Flow verwenden"** setzen.
3. Bei **Weiterleitungs-URLs** die Vercel-URL der App eintragen (z.B.
   `https://fraire-lager.vercel.app`).
4. Version veröffentlichen.
5. Die App auf dem Shop installieren – am zuverlässigsten über einen direkten
   Link statt den "App installieren"-Button auf der Übersichtsseite (der
   leitet sonst auf die App-URL um, ohne die Installation abzuschliessen):
   ```
   https://EUER-SHOP.myshopify.com/admin/oauth/authorize?client_id=CLIENT_ID&scope=read_products,read_inventory,write_inventory,read_orders&redirect_uri=https://EURE-VERCEL-URL
   ```
   (`CLIENT_ID` und die beiden URLs entsprechend ersetzen). Dort auf
   "App installieren" klicken.
6. Unter **Einstellungen** der Dev-Dashboard-App: **Client-ID** und
   **Client Secret** kopieren.
7. In `.env` eintragen:
   ```
   SHOPIFY_STORE_DOMAIN="eure-firma.myshopify.com"
   SHOPIFY_CLIENT_ID="..."
   SHOPIFY_CLIENT_SECRET="..."
   ```
8. Server neu starten.
9. Unter **Einstellungen** in der App: Lagerort auswählen, danach für jede
   der 12 Grösse/Packungsgrösse-Kombinationen die passende Shopify-SKU
   eintragen und verknüpfen.
10. Auf dem Dashboard "Mit Shopify synchronisieren" klicken, um aktuelle
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
   - optional `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`
4. **Deploy** klicken.

Jeder `git push` auf `main` deployt danach automatisch neu.

## Technischer Aufbau

- Next.js (App Router) + TypeScript + Tailwind CSS
- Postgres (Neon, serverless) via Prisma (`prisma/schema.prisma`)
- Server Actions für alle Buchungen (`src/app/actions.ts`)
- Shopify Admin GraphQL API (`src/lib/shopify.ts`) – `syncSales()` schreibt
  Tagesverkäufe pro Grösse+Packgrösse (`DailySales`), Grundlage für Bestseller
  UND die Nachbestell-Prognose
- Nachbestell-Formel als reine, testbare Funktion in `src/lib/reorder-calc.ts`
  (`calculateReorderStatus`), DB-Anbindung in `src/lib/reorder.ts`

### Tests

```bash
npm test   # Vitest – Formel-Tests für die Bestellpunkt-Berechnung
```

### Datenbank-Befehle

```bash
npx prisma studio          # Datenbank im Browser ansehen/bearbeiten
npx prisma migrate dev     # neue Migration nach Schema-Änderung
npx tsx prisma/seed.ts     # Grössen, Varianten-Platzhalter & Accounts neu anlegen
```
