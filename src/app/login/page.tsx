"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Logo } from "@/components/AppHeader";
import { getSupabase } from "@/lib/supabase/client";

function LinkError() {
  const failed = useSearchParams().get("error") === "link";
  if (!failed) return null;
  return (
    <p className="mb-4 text-sm text-brand">
      That sign-in link didn&apos;t work. Request a new one, or use the code from the email.
    </p>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError("We couldn't send a link to that address. Is it one of the family accounts?");
    else setSent(true);
  }

  // The home-screen app on iPhone doesn't share cookies with Safari, so a tapped
  // link signs in Safari only. Typing the code from the email signs in here.
  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("That code didn't work. Check it, or request a new email.");
    else window.location.replace("/");
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="bg-brand px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)] text-center text-brand-ink">
        <Logo size={72} />
        <h1 className="mt-4 font-serif text-3xl italic">Ricettario</h1>
        <p className="mt-1 opacity-90">Our family recipes</p>
      </div>
      <div className="checkered" />

      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <Suspense>
          <LinkError />
        </Suspense>
        {!sent ? (
          <form onSubmit={sendLink} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input
                className="field"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p>
              We sent an email to <strong>{email}</strong>. Tap the link in it, or type the code here.
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Code from the email</span>
              <input
                className="field tracking-widest"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? "Checking…" : "Sign in"}
            </button>
            <button type="button" className="w-full text-sm text-muted underline" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </form>
        )}
        {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      </div>
    </main>
  );
}
