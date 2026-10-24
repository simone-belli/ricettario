import { describe, expect, it } from "vitest";
import { formatAmount, formatQuantity, portionsFor, scaleQuantity } from "./scaling";

describe("portionsFor", () => {
  it("counts a child as half an adult", () => {
    expect(portionsFor(2, 2)).toBe(3);
    expect(portionsFor(1, 1)).toBe(1.5);
    expect(portionsFor(0, 0)).toBe(0);
  });
});

describe("scaleQuantity", () => {
  it("multiplies linear ingredients", () => {
    expect(scaleQuantity({ quantity: 80, scaling: "linear" }, 3)).toBe(240);
  });

  it("rounds whole-unit ingredients, never below one", () => {
    expect(scaleQuantity({ quantity: 0.5, scaling: "rounded" }, 3)).toBe(2);
    expect(scaleQuantity({ quantity: 0.25, scaling: "rounded" }, 1)).toBe(1);
    expect(scaleQuantity({ quantity: 1, scaling: "rounded" }, 0)).toBe(0);
  });

  it("leaves fixed ingredients alone", () => {
    expect(scaleQuantity({ quantity: 1, scaling: "fixed" }, 5)).toBe(1);
  });

  it("keeps missing quantities missing", () => {
    expect(scaleQuantity({ quantity: null, scaling: "linear" }, 3)).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("rounds grams and millilitres", () => {
    expect(formatQuantity(243.4, "g")).toBe("245");
    expect(formatQuantity(37.6, "ml")).toBe("38");
    expect(formatQuantity(7.25, "g")).toBe("7.3");
  });

  it("shows spoons and counts in quarters", () => {
    expect(formatQuantity(1.5, "tbsp")).toBe("1½");
    expect(formatQuantity(0.26, "tsp")).toBe("¼");
    expect(formatQuantity(3, "")).toBe("3");
  });

  it("keeps two decimals for kilos and litres", () => {
    expect(formatQuantity(1.2345, "kg")).toBe("1.23");
  });
});

describe("formatAmount", () => {
  it("joins amount and unit", () => {
    expect(formatAmount(240, "g")).toBe("240 g");
    expect(formatAmount(2, "")).toBe("2");
    expect(formatAmount(null, "pinch")).toBe("pinch");
  });
});
