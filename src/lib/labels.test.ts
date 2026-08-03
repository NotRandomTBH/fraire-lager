import { describe, expect, it } from "vitest";
import { defectItemLabel, stockExitItemLabel } from "./labels";

describe("defectItemLabel", () => {
  it("zeigt Packgrösse für Verpackungsmaterial", () => {
    expect(defectItemLabel({ itemType: "VERPACKUNG", packSize: 3 })).toBe("Verpackung 3er");
  });

  it("zeigt festen Text für Versandkartons", () => {
    expect(defectItemLabel({ itemType: "KARTON" })).toBe("Versandkarton");
  });

  it("zeigt die Grösse für Unterhosen", () => {
    expect(defectItemLabel({ itemType: "UNTERHOSE", size: { label: "M" } })).toBe("Grösse M");
  });

  it("zeigt ein Fragezeichen, wenn die Grösse fehlt", () => {
    expect(defectItemLabel({ itemType: "UNTERHOSE" })).toBe("Grösse ?");
  });
});

describe("stockExitItemLabel", () => {
  it("zeigt Packgrösse für Verpackungsmaterial", () => {
    expect(stockExitItemLabel({ itemType: "VERPACKUNGSMATERIAL", packSize: 5 })).toBe(
      "Verpackungsmaterial 5er",
    );
  });

  it("zeigt festen Text für Versandkartons", () => {
    expect(stockExitItemLabel({ itemType: "KARTON" })).toBe("Versandkarton");
  });

  it("zeigt Shopify-Bestand mit Grösse und Packgrösse", () => {
    expect(
      stockExitItemLabel({ itemType: "SHOPIFY", size: { label: "L" }, packSize: 3 }),
    ).toBe("Shopify-Bestand Grösse L (3er)");
  });

  it("zeigt lose Unterhosen ohne Packgrösse", () => {
    expect(stockExitItemLabel({ itemType: "UNTERHOSE", size: { label: "S" } })).toBe(
      "Grösse S (lose)",
    );
  });

  it("zeigt verpackte Unterhosen mit Packgrösse", () => {
    expect(
      stockExitItemLabel({ itemType: "UNTERHOSE", size: { label: "S" }, packSize: 3 }),
    ).toBe("Grösse S (3er-Packung)");
  });
});
