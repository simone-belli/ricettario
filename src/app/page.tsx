"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { matchesSearch, useRecipes } from "@/lib/data";

export default function RecipeListPage() {
  const { recipes, error } = useRecipes();
  const [query, setQuery] = useState("");
  const visible = recipes?.filter((r) => matchesSearch(r, query));

  return (
    <>
      <AppHeader
        action={
          <Link href="/settings" className="rounded-full px-2 py-1 text-xl" aria-label="Settings">
            ⚙
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">
        <input
          className="field"
          type="search"
          placeholder="Search recipes or ingredients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {error && <p className="mt-6 text-brand">Couldn&apos;t load recipes: {error}</p>}
        {!recipes && !error && <p className="mt-6 text-muted">Loading…</p>}

        {recipes && recipes.length === 0 && (
          <div className="mt-12 text-center text-muted">
            <p className="font-serif text-xl italic text-foreground">No recipes yet</p>
            <p className="mt-2">Add the first one: type it, snap a notebook page, or paste a link.</p>
          </div>
        )}

        {visible && recipes!.length > 0 && visible.length === 0 && (
          <p className="mt-6 text-muted">Nothing matches &ldquo;{query}&rdquo;.</p>
        )}

        <ul className="mt-4 space-y-2">
          {visible?.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="block rounded-xl border border-line bg-surface px-4 py-3 active:opacity-80"
              >
                <span className="block font-serif text-lg">{recipe.title}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">
                  {recipe.ingredients
                    .slice(0, 5)
                    .map((i) => i.name)
                    .join(", ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <Link
        href="/recipes/new"
        className="btn btn-primary fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 shadow-lg"
      >
        + Add recipe
      </Link>
    </>
  );
}
