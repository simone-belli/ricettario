"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RecipeForm } from "@/components/RecipeForm";
import { deleteRecipe, updateRecipe, useRecipe } from "@/lib/data";
import type { Recipe } from "@/lib/recipe";

function DeleteButton({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn mt-10 w-full border border-brand text-brand"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Delete “${recipe.title}” for both of you? This can't be undone.`)) return;
        setBusy(true);
        try {
          await deleteRecipe(recipe);
          router.replace("/");
        } catch (e) {
          setBusy(false);
          window.alert(e instanceof Error ? e.message : "Couldn't delete the recipe.");
        }
      }}
    >
      {busy ? "Deleting…" : "Delete recipe"}
    </button>
  );
}

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const recipe = useRecipe(id);
  // Load the form once: live updates from the other phone shouldn't overwrite edits in progress.
  const [initial, setInitial] = useState<Recipe | null>(null);
  if (recipe && !initial) setInitial(recipe);

  return (
    <>
      <AppHeader title="Edit recipe" back={`/recipes/${id}`} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-4">
        {recipe === undefined ? (
          <p className="text-muted">This recipe doesn&apos;t exist any more.</p>
        ) : !initial ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <>
            <RecipeForm
              initial={initial}
              submitLabel="Save changes"
              onCancel={() => router.back()}
              onSubmit={async (draft) => {
                await updateRecipe(id, draft);
                router.replace(`/recipes/${id}`);
              }}
            />
            <DeleteButton recipe={initial} />
          </>
        )}
      </main>
    </>
  );
}
