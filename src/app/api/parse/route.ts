import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ParseError, parseRecipe, type ParseInput } from "@/lib/parse/claude";
import { fetchRecipePage, PageFetchError } from "@/lib/parse/fetch-page";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createSupabaseServer } from "@/lib/supabase/server";

export const maxDuration = 120;

const RequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(50_000) }),
  z.object({ type: z.literal("url"), url: z.string().trim().min(1).max(2_000) }),
  z.object({ type: z.literal("photos"), paths: z.array(z.string().min(1)).min(1).max(6) }),
]);

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Turns typed text, a link, or uploaded photos into a recipe draft for review. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail("Not signed in", 401);

  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Nothing to read: add some text, a link or a photo.", 400);

  try {
    let input: ParseInput;
    let sourceUrl: string | null = null;

    switch (body.data.type) {
      case "text":
        input = { type: "text", text: body.data.text };
        break;
      case "url": {
        const page = await fetchRecipePage(body.data.url);
        sourceUrl = page.url;
        input = { type: "page", url: page.url, content: page.content };
        break;
      }
      case "photos": {
        // Downloaded as the signed-in user, so storage RLS still applies.
        const images = await Promise.all(
          body.data.paths.map(async (path) => {
            const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);
            if (error || !data) throw new ParseError("A photo couldn't be loaded. Try adding it again.");
            // The phone re-encodes every photo as JPEG before uploading it.
            return { mediaType: "image/jpeg" as const, data: Buffer.from(await data.arrayBuffer()).toString("base64") };
          }),
        );
        input = { type: "photos", images };
        break;
      }
    }

    const draft = await parseRecipe(input);
    return NextResponse.json({ draft, sourceUrl });
  } catch (error) {
    if (error instanceof ParseError || error instanceof PageFetchError) return fail(error.message, 422);
    if (error instanceof Anthropic.RateLimitError) return fail("The AI is busy right now. Try again in a minute.", 503);
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error", error.status, error.message);
      return fail("The AI service had a problem. Try again shortly.", 502);
    }
    console.error("Parse failed", error);
    return fail("Something went wrong while reading the recipe.", 500);
  }
}
