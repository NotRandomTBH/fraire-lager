import { describe, expect, it } from "vitest";
import { calculateReorderStatus } from "./reorder-calc";

describe("calculateReorderStatus", () => {
  it("meldet Status ROT, wenn der Bestand unter den Bestellpunkt gefallen ist", () => {
    // Beispiel aus der Spec: Ø 3.2 Stück/Tag, 261 Stück Bestand, 80 Tage
    // Lieferzeit + 14 Tage Puffer -> Bestellpunkt 300.8, Bestand liegt darunter.
    const result = calculateReorderStatus({
      dailyRate: 3.2,
      currentStockUnits: 261,
      leadTimeDays: 80,
      safetyBufferDays: 14,
      warningWindowDays: 30,
    });

    expect(result.reorderPointUnits).toBeCloseTo(300.8, 5);
    expect(result.runwayDays).toBeCloseTo(81.5625, 4);
    expect(result.daysUntilMustOrder).toBeCloseTo(-12.4375, 4);
    expect(result.status).toBe("ROT");
    expect(result.suggestedOrderDate).not.toBeNull();
  });

  it("meldet Status GELB, wenn der Bestellpunkt innerhalb des Warnfensters liegt", () => {
    // dailyRate 2/Tag, Bestellpunkt = 2*(80+14) = 188. Bestand 400 -> daysUntilMustOrder
    // = (400-188)/2 = 106... das wäre GRUEN. Für GELB testen wir einen knapperen Fall:
    // Bestand 200 -> (200-188)/2 = 6 Tage, innerhalb warningWindowDays=30 -> GELB.
    const result = calculateReorderStatus({
      dailyRate: 2,
      currentStockUnits: 200,
      leadTimeDays: 80,
      safetyBufferDays: 14,
      warningWindowDays: 30,
    });

    expect(result.reorderPointUnits).toBe(188);
    expect(result.daysUntilMustOrder).toBeCloseTo(6, 5);
    expect(result.status).toBe("GELB");
  });

  it("meldet Status GRUEN, wenn genug Zeit bis zum Bestellpunkt bleibt", () => {
    const result = calculateReorderStatus({
      dailyRate: 2,
      currentStockUnits: 400,
      leadTimeDays: 80,
      safetyBufferDays: 14,
      warningWindowDays: 30,
    });

    expect(result.daysUntilMustOrder).toBeCloseTo(106, 5);
    expect(result.status).toBe("GRUEN");
  });

  it("meldet Status GRAU und kein Datum, wenn die Tagesrate 0 ist", () => {
    const result = calculateReorderStatus({
      dailyRate: 0,
      currentStockUnits: 181,
      leadTimeDays: 80,
      safetyBufferDays: 14,
      warningWindowDays: 30,
    });

    expect(result.status).toBe("GRAU");
    expect(result.daysUntilMustOrder).toBeNull();
    expect(result.runwayDays).toBeNull();
    expect(result.suggestedOrderDate).toBeNull();
  });

  it("behandelt genau den Bestellpunkt (daysUntilMustOrder === 0) als ROT", () => {
    const result = calculateReorderStatus({
      dailyRate: 1,
      currentStockUnits: 94, // == reorderPointUnits (1 * (80+14))
      leadTimeDays: 80,
      safetyBufferDays: 14,
      warningWindowDays: 30,
    });

    expect(result.daysUntilMustOrder).toBe(0);
    expect(result.status).toBe("ROT");
  });

  it("reale Zahlen aus dem Store: M mit ~3.25 Stück/Tag und 292 Stück Bestand", () => {
    const result = calculateReorderStatus({
      dailyRate: 3.25,
      currentStockUnits: 292,
      leadTimeDays: 80,
      safetyBufferDays: 14,
      warningWindowDays: 30,
    });

    // Bestellpunkt = 3.25 * 94 = 305.5 > 292 Stück Bestand -> bereits im ROT-Bereich
    expect(result.reorderPointUnits).toBeCloseTo(305.5, 5);
    expect(result.status).toBe("ROT");
  });
});
