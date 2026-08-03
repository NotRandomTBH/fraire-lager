// Hilfsfunktionen für reine Datums-Felder (type="date"-Inputs), die keine
// Uhrzeit tragen. new Date("YYYY-MM-DD") interpretiert das Datum als UTC-
// Mitternacht, was in der Anzeige (Schweizer Zeitzone) zu einer falschen
// Uhrzeit wie "02:00" führt. Wir verankern solche Daten stattdessen auf
// UTC-Mittag, damit das Kalenderdatum in jeder realistischen Zeitzone stabil
// bleibt, und formatieren sie in der UI ohne Uhrzeit.

export function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnlyInput(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}
