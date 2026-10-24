"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Stepper } from "@/components/Stepper";
import { useRecipe, useSettings } from "@/lib/data";
import { photoUrls } from "@/lib/photos";
import type { Recipe } from "@/lib/recipe";
import { BATCH_MULTIPLIERS, formatAmount, formatFactor, portionsFor, scaleQuantity } from "@/lib/scaling";

/** Keeps the phone screen awake while a recipe is open, where supported. */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && request();
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, [enabled]);
}

function Photos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const key = paths.join("|");
  useEffect(() => {
    photoUrls(key ? key.split("|") : []).then(setUrls);
  }, [key]);
  if (!urls.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-serif text-lg italic">Original</h2>
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url, i) => (
          <a key={url} href={url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs */}
            <img src={url} alt={`Original page ${i + 1}`} className="w-full rounded-lg" />
          </a>
        ))}
      </div>
    </section>
  );
}

function RecipeView({ recipe, defaults }: { recipe: Recipe; defaults: { adults: number; children: number } }) {
  const [adults, setAdults] = useState(defaults.adults);
  const [children, setChildren] = useState(defaults.children);
  const [multiplier, setMultiplier] = useState(1);
  const [awake, setAwake] = useState(true);
  useWakeLock(awake);

  const factor = recipe.kind === "portion" ? portionsFor(adults, children) : multiplier;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-4">
      <h1 className="font-serif text-3xl">{recipe.title}</h1>
      {recipe.tags.length > 0 && <p className="mt-1 text-sm text-muted">{recipe.tags.join(" · ")}</p>}

      <section className="mt-5 space-y-3 rounded-xl border border-line bg-surface p-4">
        {recipe.kind === "portion" ? (
          <>
            <Stepper label="Adults" value={adults} onChange={setAdults} />
            <Stepper label="Children" value={children} onChange={setChildren} />
            <p className="text-sm text-muted">
              = {formatFactor(factor)} {factor === 1 ? "portion" : "portions"} (a child is half a portion)
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {BATCH_MULTIPLIERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMultiplier(m)}
                  aria-pressed={multiplier === m}
                  className={`btn min-w-14 ${multiplier === m ? "btn-primary" : "btn-secondary"}`}
                >
                  ×{formatFactor(m)}
                </button>
              ))}
            </div>
            {recipe.batch_yield && (
              <p className="text-sm text-muted">
                One batch makes {recipe.batch_yield}
                {multiplier !== 1 && ` — making ×${formatFactor(multiplier)}`}
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-serif text-xl italic">Ingredients</h2>
        <ul className="divide-y divide-line">
          {recipe.ingredients.map((ing, i) => {
            const amount = formatAmount(scaleQuantity(ing, factor), ing.unit);
            return (
              <li key={i} className="flex gap-3 py-2">
                <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{amount}</span>
                <span>
                  {ing.name}
                  {ing.note && <span className="text-muted">, {ing.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {recipe.steps.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-serif text-xl italic">Method</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">
                  {i + 1}
                </span>
                <p className="leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className="mt-6">
          <h2 className="mb-2 font-serif text-xl italic">Notes</h2>
          <p className="whitespace-pre-line leading-relaxed">{recipe.notes}</p>
        </section>
      )}

      {recipe.source_url && (
        <p className="mt-6 text-sm text-muted">
          From{" "}
          <a href={recipe.source_url} target="_blank" rel="noreferrer" className="underline">
            {new URL(recipe.source_url).hostname}
          </a>
        </p>
      )}

      <Photos paths={recipe.photo_paths} />

      <label className="mt-8 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={awake} onChange={(e) => setAwake(e.target.checked)} />
        Keep the screen on while cooking
      </label>
    </main>
  );
}

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const recipe = useRecipe(id);
  const settings = useSettings();

  return (
    <>
      <AppHeader
        title={recipe?.title}
        back="/"
        action={
          recipe && (
            <Link href={`/recipes/${id}/edit`} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              Edit
            </Link>
          )
        }
      />
      {recipe === undefined ? (
        <main className="px-4 pt-8 text-center text-muted">
          This recipe doesn&apos;t exist any more.{" "}
          <Link href="/" className="underline">
            Back to all recipes
          </Link>
        </main>
      ) : !recipe || !settings ? (
        <main className="px-4 pt-8 text-muted">Loading…</main>
      ) : (
        <RecipeView recipe={recipe} defaults={{ adults: settings.default_adults, children: settings.default_children }} />
      )}
    </>
  );
}
