import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

let client: SupabaseClient | undefined;

/** The browser client. RLS limits it to the two allowed users. */
export function getSupabase(): SupabaseClient {
  client ??= createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
