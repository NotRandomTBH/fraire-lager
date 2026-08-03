import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDateOnlyInput, todayDateInputValue } from "./date";

describe("todayDateInputValue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("liefert das lokale Datum im YYYY-MM-DD-Format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 23, 30)); // 5. März 2026, 23:30 lokal
    expect(todayDateInputValue()).toBe("2026-03-05");
  });

  it("füllt Monat und Tag mit führender Null auf", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 9, 0, 0)); // 9. Januar 2026, 00:00 lokal
    expect(todayDateInputValue()).toBe("2026-01-09");
  });

  it("bleibt beim lokalen Kalendertag, auch wenn die UTC-Zeit bereits am nächsten Tag ist", () => {
    // z.B. 23:30 in einer UTC+2-Zone entspricht 21:30 UTC am selben Tag,
    // aber Zeiten näher an Mitternacht könnten mit toISOString() (immer UTC)
    // fälschlich auf den Folgetag rutschen. todayDateInputValue() muss sich an
    // den LOKALEN Komponenten orientieren, nicht an toISOString().
    vi.useFakeTimers();
    const localMidnight = new Date(2026, 5, 15, 0, 5);
    vi.setSystemTime(localMidnight);
    expect(todayDateInputValue()).toBe("2026-06-15");
  });
});

describe("parseDateOnlyInput", () => {
  it("verankert das Datum auf UTC-Mittag, damit es in jeder Zeitzone am richtigen Kalendertag bleibt", () => {
    const result = parseDateOnlyInput("2026-08-03");
    expect(result.toISOString()).toBe("2026-08-03T12:00:00.000Z");
    expect(result.getUTCHours()).toBe(12);
  });

  it("erzeugt für aufeinanderfolgende Tage unterschiedliche, aufsteigende Daten", () => {
    const a = parseDateOnlyInput("2026-01-01");
    const b = parseDateOnlyInput("2026-01-02");
    expect(b.getTime()).toBeGreaterThan(a.getTime());
  });
});
