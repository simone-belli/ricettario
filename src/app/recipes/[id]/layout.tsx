import { Suspense } from "react";

/** The recipe id is only known at request time, so these pages render inside a boundary. */
export default function RecipeLayout({ children }: LayoutProps<"/recipes/[id]">) {
  return <Suspense fallback={<main className="px-4 pt-8 text-muted">Loading…</main>}>{children}</Suspense>;
}
