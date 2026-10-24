import type { Ingredient } from "./recipe";

/** A child eats half an adult portion. */
export function portionsFor(adults: number, children: number): number {
  return adults + 0.5 * children;
}

export const BATCH_MULTIPLIERS = [0.5, 1, 1.5, 2, 3] as const;

/**
 * The quantity to show for an ingredient once the recipe is scaled by `factor`
 * (portions for portion recipes, the multiplier for batch recipes).
 */
export function scaleQuantity(ingredient: Pick<Ingredient, "quantity" | "scaling">, factor: number): number | null {
  const { quantity, scaling } = ingredient;
  if (quantity === null) return null;
  switch (scaling) {
    case "fixed":
      return quantity;
    case "rounded": {
      const scaled = quantity * factor;
      if (scaled <= 0) return 0;
      return Math.max(1, Math.round(scaled));
    }
    case "linear":
      return quantity * factor;
  }
}

const WEIGHT_VOLUME_UNITS = new Set(["g", "ml"]);
const LARGE_UNITS = new Set(["kg", "l"]);

const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

function trimDecimals(value: number, places: number): string {
  return String(Number(value.toFixed(places)));
}

function toQuarters(value: number): string {
  const quarters = Math.round(value * 4) / 4;
  if (quarters === 0) return trimDecimals(value, 2);
  const whole = Math.floor(quarters);
  const fraction = FRACTIONS[quarters - whole];
  if (!fraction) return String(whole);
  return whole === 0 ? fraction : `${whole}${fraction}`;
}

/** Rounds a quantity to something sensible to read while cooking. */
export function formatQuantity(value: number, unit: string): string {
  const u = unit.trim().toLowerCase();
  if (WEIGHT_VOLUME_UNITS.has(u)) {
    if (value >= 100) return String(Math.round(value / 5) * 5);
    if (value >= 10) return String(Math.round(value));
    return trimDecimals(value, 1);
  }
  if (LARGE_UNITS.has(u)) return trimDecimals(value, 2);
  return toQuarters(value);
}

/** e.g. "450 g", "1½ tbsp", "3" (eggs), or "" when there is no amount. */
export function formatAmount(quantity: number | null, unit: string): string {
  if (quantity === null) return unit.trim();
  const amount = formatQuantity(quantity, unit);
  return unit.trim() ? `${amount} ${unit.trim()}` : amount;
}

export function formatFactor(value: number): string {
  return toQuarters(value);
}
