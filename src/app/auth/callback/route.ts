import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Where the magic link lands: swaps the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const home = new URL("/", request.url);

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(home);
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("error", "link");
  return NextResponse.redirect(login);
}
