"use client";

import { useState, type FormEvent } from "react";
import { emptyIngredient, type Ingredient, type RecipeDraft, type ScalingMode } from "@/lib/recipe";

const UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "pinch", "clove", "slice", "sprig", "can", "packet"];

const SCALING_LABELS: Record<ScalingMode, string> = {
  linear: "Scales",
  rounded: "Whole units",
  fixed: "Fixed",
};

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function parseQuantity(text: string): number | null {
  const normalised = text.trim().replace(",", ".");
  if (!normalised) return null;
  const fraction = normalised.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const value = Number(normalised);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Keeps the typed text (e.g. "0," on the way to "0,5") while reporting the parsed number. */
function QuantityInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : String(Number(value.toFixed(3))));
  return (
    <input
      className="field"
      inputMode="decimal"
      placeholder="Qty"
      aria-label="Quantity"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseQuantity(e.target.value));
      }}
    />
  );
}

function RowButtons({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <div className="flex gap-1 text-muted">
      <button type="button" className="h-9 w-9 rounded-full border border-line" onClick={onUp} aria-label="Move up">
        ↑
      </button>
      <button type="button" className="h-9 w-9 rounded-full border border-line" onClick={onDown} aria-label="Move down">
        ↓
      </button>
      <button type="button" className="h-9 w-9 rounded-full border border-line" onClick={onRemove} aria-label="Remove">
        ✕
      </button>
    </div>
  );
}

type Props = {
  initial: RecipeDraft;
  submitLabel: string;
  onSubmit: (draft: RecipeDraft) => Promise<void>;
  onCancel?: () => void;
};

export function RecipeForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(initial);
  // Stable keys so editing one row never remounts another.
  const [ingredientKeys, setIngredientKeys] = useState(() => initial.ingredients.map(() => crypto.randomUUID()));
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const updateIngredient = (index: number, patch: Partial<Ingredient>) =>
    set(
      "ingredients",
      draft.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    );

  const moveIngredient = (index: number, delta: number) => {
    set("ingredients", move(draft.ingredients, index, delta));
    setIngredientKeys((keys) => move(keys, index, delta));
  };

  const removeIngredient = (index: number) => {
    set(
      "ingredients",
      draft.ingredients.filter((_, i) => i !== index),
    );
    setIngredientKeys((keys) => keys.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    set("ingredients", [...draft.ingredients, emptyIngredient()]);
    setIngredientKeys((keys) => [...keys, crypto.randomUUID()]);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleaned: RecipeDraft = {
      ...draft,
      title: draft.title.trim(),
      batch_yield: draft.kind === "batch" ? draft.batch_yield.trim() : "",
      notes: draft.notes.trim(),
      tags: tagsText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      ingredients: draft.ingredients
        .map((i) => ({ ...i, name: i.name.trim(), unit: i.unit.trim(), note: i.note.trim() }))
        .filter((i) => i.name),
      steps: draft.steps.map((s) => s.trim()).filter(Boolean),
    };
    if (!cleaned.title) {
      setError("Give the recipe a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(cleaned);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the recipe.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Title</span>
        <input className="field font-serif text-lg" value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Amounts are for</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["portion", "batch"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => set("kind", kind)}
              className={`btn ${draft.kind === kind ? "btn-primary" : "btn-secondary"}`}
              aria-pressed={draft.kind === kind}
            >
              {kind === "portion" ? "One adult portion" : "One batch"}
            </button>
          ))}
        </div>
        {draft.kind === "batch" && (
          <input
            className="field mt-2"
            placeholder="What one batch makes, e.g. 1 cake, 24 cm tin"
            value={draft.batch_yield}
            onChange={(e) => set("batch_yield", e.target.value)}
          />
        )}
      </fieldset>

      <section>
        <h2 className="mb-2 font-serif text-lg italic">
          Ingredients <span className="text-sm not-italic text-muted">({draft.kind === "portion" ? "per adult" : "per batch"})</span>
        </h2>
        <datalist id="units">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <ul className="space-y-3">
          {draft.ingredients.map((ing, index) => (
            <li key={ingredientKeys[index]} className="space-y-2 rounded-xl border border-line bg-surface p-3">
              <div className="grid grid-cols-[5rem_5rem_1fr] gap-2">
                <QuantityInput value={ing.quantity} onChange={(quantity) => updateIngredient(index, { quantity })} />
                <input
                  className="field"
                  list="units"
                  placeholder="Unit"
                  aria-label="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="Ingredient"
                  aria-label="Ingredient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(index, { name: e.target.value })}
                />
              </div>
              <input
                className="field text-sm"
                placeholder="Note, e.g. finely chopped"
                aria-label="Note"
                value={ing.note}
                onChange={(e) => updateIngredient(index, { note: e.target.value })}
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  className="field w-auto"
                  aria-label="Scaling"
                  value={ing.scaling}
                  onChange={(e) => updateIngredient(index, { scaling: e.target.value as ScalingMode })}
                >
                  {Object.entries(SCALING_LABELS).map(([mode, label]) => (
                    <option key={mode} value={mode}>
                      {label}
                    </option>
                  ))}
                </select>
                <RowButtons
                  onUp={() => moveIngredient(index, -1)}
                  onDown={() => moveIngredient(index, 1)}
                  onRemove={() => removeIngredient(index)}
                />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary mt-3 w-full" onClick={addIngredient}>
          + Ingredient
        </button>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-lg italic">Method</h2>
        <ol className="space-y-3">
          {draft.steps.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="mt-2 w-6 shrink-0 text-right font-serif text-muted">{index + 1}.</span>
              <div className="flex-1 space-y-2">
                <textarea
                  className="field min-h-20"
                  value={step}
                  onChange={(e) => set("steps", draft.steps.map((s, i) => (i === index ? e.target.value : s)))}
                />
                <RowButtons
                  onUp={() => set("steps", move(draft.steps, index, -1))}
                  onDown={() => set("steps", move(draft.steps, index, 1))}
                  onRemove={() =>
                    set(
                      "steps",
                      draft.steps.filter((_, i) => i !== index),
                    )
                  }
                />
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-secondary mt-3 w-full" onClick={() => set("steps", [...draft.steps, ""])}>
          + Step
        </button>
      </section>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Notes</span>
        <textarea className="field min-h-20" value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tags</span>
        <input
          className="field"
          placeholder="pasta, quick, nonna's"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
        />
      </label>

      {error && <p className="text-brand">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        {onCancel && (
          <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary flex-1" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
