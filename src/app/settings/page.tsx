"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Stepper } from "@/components/Stepper";
import { saveSettings, useSettings, type Settings } from "@/lib/data";
import { portionsFor } from "@/lib/scaling";
import { getSupabase } from "@/lib/supabase/client";

function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setStatus("Saving…");
    try {
      await saveSettings(settings);
      setStatus("Saved");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  return (
    <>
      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-serif text-lg italic">Our family</h2>
        <p className="text-sm text-muted">Every recipe opens scaled for this many people. Shared by both of you.</p>
        <Stepper
          label="Adults"
          value={settings.default_adults}
          onChange={(default_adults) => setSettings((s) => ({ ...s, default_adults }))}
        />
        <Stepper
          label="Children"
          value={settings.default_children}
          onChange={(default_children) => setSettings((s) => ({ ...s, default_children }))}
        />
        <p className="text-sm text-muted">
          = {portionsFor(settings.default_adults, settings.default_children)} portions
        </p>
        <button className="btn btn-primary w-full" onClick={save}>
          Save
        </button>
        {status && <p className="text-center text-sm text-muted">{status}</p>}
      </section>
    </>
  );
}

export default function SettingsPage() {
  const settings = useSettings();

  return (
    <>
      <AppHeader title="Settings" back="/" />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 pt-4">
        {settings ? <SettingsForm initial={settings} /> : <p className="text-muted">Loading…</p>}
        <button
          className="btn btn-secondary w-full"
          onClick={async () => {
            await getSupabase().auth.signOut();
            window.location.replace("/login");
          }}
        >
          Sign out
        </button>
      </main>
    </>
  );
}
