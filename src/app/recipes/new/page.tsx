"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe, type RecipeSource } from "@/lib/data";
import { uploadPhotos } from "@/lib/photos";
import { emptyDraft, type RecipeDraft } from "@/lib/recipe";

type Mode = "type" | "photo" | "paste";

const MODES: { id: Mode; label: string }[] = [
  { id: "type", label: "Type / dictate" },
  { id: "photo", label: "Photo" },
  { id: "paste", label: "Paste" },
];

type ParseRequest = { type: "text"; text: string } | { type: "url"; url: string } | { type: "photos"; paths: string[] };

async function requestParse(body: ParseRequest): Promise<{ draft: RecipeDraft; sourceUrl: string | null }> {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Something went wrong while reading the recipe.");
  return json;
}

function isSingleUrl(text: string) {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

function PhotoPreviews({ files }: { files: File[] }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- local blob previews
        <img key={url} src={url} alt={`Photo ${i + 1}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
      ))}
    </div>
  );
}

export default function NewRecipePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("type");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ draft: RecipeDraft; source: RecipeSource } | null>(null);

  async function read() {
    setError(null);
    try {
      if (mode === "photo") {
        setBusy("Uploading photos…");
        const paths = await uploadPhotos(files);
        setBusy("Reading the recipe…");
        const { draft } = await requestParse({ type: "photos", paths });
        setReview({ draft, source: { source_url: null, source_text: null, photo_paths: paths } });
      } else if (isSingleUrl(text)) {
        setBusy("Fetching the page…");
        const { draft, sourceUrl } = await requestParse({ type: "url", url: text.trim() });
        setReview({ draft, source: { source_url: sourceUrl, source_text: null, photo_paths: [] } });
      } else {
        setBusy("Reading the recipe…");
        const { draft } = await requestParse({ type: "text", text });
        setReview({ draft, source: { source_url: null, source_text: text.trim(), photo_paths: [] } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function pasteFromClipboard() {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setError("Couldn't read the clipboard. Long-press the box and choose Paste instead.");
    }
  }

  if (review) {
    return (
      <>
        <AppHeader title="Check and save" back="/" />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4">
          <p className="mb-4 rounded-xl bg-surface p-3 text-sm text-muted">
            Check what was read, fix anything that&apos;s off, then save.
          </p>
          <RecipeForm
            initial={review.draft}
            submitLabel="Save recipe"
            onCancel={() => setReview(null)}
            onSubmit={async (draft) => {
              const id = await createRecipe(draft, review.source);
              router.replace(`/recipes/${id}`);
            }}
          />
        </main>
      </>
    );
  }

  const canRead = mode === "photo" ? files.length > 0 : text.trim().length > 0;

  return (
    <>
      <AppHeader title="Add recipe" back="/" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-full px-2 py-2 text-sm font-medium ${mode === m.id ? "bg-brand text-brand-ink" : ""}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {mode === "type" && (
            <>
              <p className="mb-2 text-sm text-muted">
                Write it however it comes. To dictate, tap the microphone on your keyboard.
              </p>
              <textarea
                className="field min-h-64"
                placeholder="Ragù for 4: 300 g minced beef, 1 onion, a carrot…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {mode === "photo" && (
            <>
              <p className="mb-2 text-sm text-muted">Snap each notebook page. Several photos are read as one recipe.</p>
              <label className="btn btn-secondary w-full">
                {files.length ? "Choose different photos" : "Take or choose photos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
                />
              </label>
              {files.length > 0 && <PhotoPreviews files={files} />}
            </>
          )}

          {mode === "paste" && (
            <>
              <p className="mb-2 text-sm text-muted">Paste recipe text, or a link to a recipe page.</p>
              <button type="button" className="btn btn-secondary mb-2 w-full" onClick={pasteFromClipboard}>
                Paste from clipboard
              </button>
              <textarea
                className="field min-h-48"
                placeholder="https://… or the recipe text"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}
        </div>

        {error && <p className="mt-4 text-brand">{error}</p>}

        <button className="btn btn-primary mt-4 w-full" disabled={!canRead || busy !== null} onClick={read}>
          {busy ?? "Read recipe"}
        </button>
        <button
          className="mt-4 w-full text-sm text-muted underline"
          onClick={() =>
            setReview({ draft: emptyDraft(), source: { source_url: null, source_text: null, photo_paths: [] } })
          }
        >
          Skip the AI and fill it in myself
        </button>
      </main>
    </>
  );
}
