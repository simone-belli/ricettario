import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { RecipeDraftSchema, type RecipeDraft } from "@/lib/recipe";

const MODEL = "claude-sonnet-5-5";

const SYSTEM_PROMPT = `You turn family recipes into a structured format for a recipe app used by one household.

Input arrives as one of: text the cook typed or dictated (often informal, with dictation mistakes), photos of handwritten or printed notebook pages, or the content of a recipe web page.

Rules:
- Keep the recipe's own language for the title, ingredient names, notes and steps. Do not translate.
- Record only what the source says. Don't invent ingredients or steps; you may fix obvious dictation or spelling errors.
- Use metric units: g, kg, ml, l, tsp, tbsp. Convert cups, ounces, pounds, sticks and fluid ounces to metric, and °F to °C inside steps. Keep count units as they are (clove, slice, sprig, pinch...). Use an empty unit for plain counts such as "3 eggs".
- Choose the recipe kind:
  - "portion" for dishes served per person (pasta, soups, mains, salads). Store every quantity PER ONE ADULT PORTION: divide the source amounts by the number of servings it states (for a range like "4-6", use the first number). If the source states no servings, estimate a sensible number from the amounts and add a short note saying the per-person amounts were estimated.
  - "batch" for things made as a fixed amount (cakes, bread, biscuits, jams, sauces made in a jar). Keep quantities for one batch as written, and describe the yield in batch_yield (e.g. "1 cake, 24 cm tin").
- Choose each ingredient's scaling mode: "linear" for most ingredients; "rounded" for things that only come whole (eggs, whole onions, lemons when used whole); "fixed" for amounts that shouldn't grow with the number of people (a pinch, "to taste", a bay leaf for the pot, a baking tin).
- An ingredient with no amount ("salt to taste", "oil for frying") gets quantity null and scaling "fixed", with the wording in the note.
- Steps: one instruction each, in order, without numbering. Merge fragments that belong together.
- If a photo is hard to read, give your best reading and mention uncertain parts in notes.`;

export type ParseInput =
  | { type: "text"; text: string }
  | { type: "page"; url: string; content: string }
  | { type: "photos"; images: { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string }[] };

export class ParseError extends Error {}

function buildContent(input: ParseInput): Anthropic.Beta.BetaContentBlockParam[] {
  switch (input.type) {
    case "text":
      return [{ type: "text", text: `The cook typed or dictated this recipe:\n\n${input.text}` }];
    case "page":
      return [{ type: "text", text: `This recipe comes from ${input.url}.\n\n${input.content}` }];
    case "photos":
      return [
        ...input.images.map(
          (image): Anthropic.Beta.BetaContentBlockParam => ({
            type: "image",
            source: { type: "base64", media_type: image.mediaType, data: image.data },
          }),
        ),
        {
          type: "text",
          text:
            input.images.length > 1
              ? `These ${input.images.length} photos are pages of one recipe, in order. Transcribe and structure it.`
              : "This photo shows a recipe. Transcribe and structure it.",
        },
      ];
  }
}

let client: Anthropic | undefined;

export async function parseRecipe(input: ParseInput): Promise<RecipeDraft> {
  client ??= new Anthropic();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Retry on Anthropic's recommended fallback model if a safety classifier declines.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(RecipeDraftSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildContent(input) }],
  });

  if (response.stop_reason === "refusal") {
    throw new ParseError("The AI declined to read this recipe. Try typing it in instead.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ParseError("The recipe couldn't be read completely. Try again, or split it into smaller parts.");
  }
  return response.parsed_output;
}
