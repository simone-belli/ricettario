"use client";

import { useEffect, useState } from "react";
import type { Recipe, RecipeDraft } from "./recipe";
import { getSupabase } from "./supabase/client";
import { PHOTO_BUCKET } from "./supabase/env";

export type Settings = { default_adults: number; default_children: number };

const DEFAULT_SETTINGS: Settings = { default_adults: 2, default_children: 2 };

function sortByUpdated(recipes: Recipe[]) {
  return [...recipes].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** All recipes, newest first, kept live as either user edits. */
export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    supabase
      .from("recipes")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setRecipes(data as Recipe[]);
      });

    const channel = supabase
      .channel("recipes-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, (change) => {
        setRecipes((current) => {
          if (!current) return current;
          if (change.eventType === "DELETE") return current.filter((r) => r.id !== change.old.id);
          const row = change.new as Recipe;
          return sortByUpdated([row, ...current.filter((r) => r.id !== row.id)]);
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { recipes, error };
}

/** One recipe, kept live. `null` while loading, `undefined` once known not to exist. */
export function useRecipe(id: string) {
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRecipe((data as Recipe | null) ?? undefined);
      });

    const channel = supabase
      .channel(`recipe-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes", filter: `id=eq.${id}` }, (change) => {
        setRecipe(change.eventType === "DELETE" ? undefined : (change.new as Recipe));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  return recipe;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from("settings")
      .select("default_adults, default_children")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSettings((data as Settings | null) ?? DEFAULT_SETTINGS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}

export async function saveSettings(settings: Settings) {
  const { error } = await getSupabase().from("settings").update(settings).eq("id", true);
  if (error) throw new Error(error.message);
}

export type RecipeSource = { source_url: string | null; source_text: string | null; photo_paths: string[] };

/** Only the editable columns, so stray fields (id, timestamps) never reach an insert or update. */
function draftColumns(draft: RecipeDraft): RecipeDraft {
  const { title, kind, batch_yield, notes, tags, ingredients, steps } = draft;
  return { title, kind, batch_yield, notes, tags, ingredients, steps };
}

export async function createRecipe(draft: RecipeDraft, source: RecipeSource): Promise<string> {
  const { data, error } = await getSupabase()
    .from("recipes")
    .insert({ ...draftColumns(draft), ...source })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateRecipe(id: string, draft: RecipeDraft) {
  const { error } = await getSupabase().from("recipes").update(draftColumns(draft)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRecipe(recipe: Recipe) {
  const supabase = getSupabase();
  const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
  if (error) throw new Error(error.message);
  if (recipe.photo_paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(recipe.photo_paths);
}

/** Matches a search query against title, ingredients, tags and notes. */
export function matchesSearch(recipe: Recipe, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [
    recipe.title,
    recipe.notes,
    recipe.tags.join(" "),
    recipe.ingredients.map((i) => i.name).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}
