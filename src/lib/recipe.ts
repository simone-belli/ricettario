import { z } from "zod";

export const ScalingModeSchema = z.enum(["linear", "rounded", "fixed"]);
export type ScalingMode = z.infer<typeof ScalingModeSchema>;

export const RecipeKindSchema = z.enum(["portion", "batch"]);
export type RecipeKind = z.infer<typeof RecipeKindSchema>;

export const IngredientSchema = z.object({
  name: z.string().describe("Ingredient name, e.g. 'plain flour'"),
  quantity: z
    .number()
    .nullable()
    .describe(
      "Amount per adult portion (portion recipes) or per batch (batch recipes). null when there is no amount, e.g. 'salt to taste'.",
    ),
  unit: z
    .string()
    .describe(
      "Metric or count unit: g, kg, ml, l, tsp, tbsp, clove, slice, pinch, ... Empty string for plain counts like '3 eggs'.",
    ),
  scaling: ScalingModeSchema.describe(
    "linear: multiply by portions (most ingredients). rounded: multiply then round to whole units (eggs, whole onions). fixed: never scales (a pinch of salt, a baking tin, 'to taste').",
  ),
  note: z
    .string()
    .describe("Short preparation note, e.g. 'finely chopped'. Empty string if none."),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

/** The editable part of a recipe: what the AI produces and the review form edits. */
export const RecipeDraftSchema = z.object({
  title: z.string(),
  kind: RecipeKindSchema.describe(
    "portion: a dish served per person. batch: makes a fixed amount (a cake, a loaf, a tray of biscuits, a jar of sauce).",
  ),
  batch_yield: z
    .string()
    .describe("For batch recipes, what one batch makes, e.g. '1 cake, 24 cm tin'. Empty string for portion recipes."),
  notes: z.string().describe("Tips, variations, or who the recipe came from. Empty string if none."),
  tags: z.array(z.string()).describe("A few short lowercase tags, e.g. 'pasta', 'vegetarian', 'quick'."),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()).describe("Method steps in order, one instruction each, without numbering."),
});
export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;

export type Recipe = RecipeDraft & {
  id: string;
  source_url: string | null;
  source_text: string | null;
  photo_paths: string[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export function emptyDraft(): RecipeDraft {
  return {
    title: "",
    kind: "portion",
    batch_yield: "",
    notes: "",
    tags: [],
    ingredients: [],
    steps: [],
  };
}

export function emptyIngredient(): Ingredient {
  return { name: "", quantity: null, unit: "", scaling: "linear", note: "" };
}
