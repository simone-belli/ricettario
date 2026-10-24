import Link from "next/link";
import type { ReactNode } from "react";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-lg bg-white font-serif italic font-bold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.7 }}
    >
      R
    </span>
  );
}

/** Red header with the tablecloth band. `back` shows a back link instead of the logo. */
export function AppHeader({ title, back, action }: { title?: string; back?: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 bg-brand text-brand-ink pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
        {back ? (
          <Link href={back} className="-ml-2 rounded-full px-2 py-1 text-lg" aria-label="Back">
            ←
          </Link>
        ) : (
          <Link href="/" aria-label="All recipes">
            <Logo size={32} />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate font-serif text-xl italic">{title ?? "Ricettario"}</h1>
        {action}
      </div>
      <div className="checkered" />
    </header>
  );
}
