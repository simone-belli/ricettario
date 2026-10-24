# Ricettario

Simone and Kat's shared family recipe book: a mobile-first web app (PWA) for adding recipes by typing or dictating, photographing notebook pages, or pasting text and links, with portion scaling while cooking.

See [docs/SPEC.md](docs/SPEC.md) for the product spec.

**Stack:** Next.js 16 (App Router) · Tailwind CSS · Supabase (Postgres, Auth, Realtime, Storage) · Claude Sonnet 5.5 for parsing · Vercel hosting.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In `supabase/migrations/0001_init.sql`, replace the two example addresses with Simone's and Kat's real emails, then run the file in the **SQL editor**.
3. **Authentication → Users:** add both users ("Add user").
4. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Leave the Email provider on.
5. **Authentication → URL Configuration:** set the Site URL to the Vercel URL and add `https://<your-app>/auth/callback` (and `http://localhost:3000/auth/callback` for development) to the redirect URLs.
6. **Authentication → Emails → Magic Link:** add the one-time code to the template so the home-screen app can sign in (on iPhone it doesn't share cookies with Safari, so a tapped link signs in Safari only):

   ```html
   <h2>Sign in to Ricettario</h2>
   <p><a href="{{ .ConfirmationURL }}">Tap to sign in</a></p>
   <p>Or type this code in the app: <strong>{{ .Token }}</strong></p>
   ```

### 2. Anthropic

Create an API key at [console.anthropic.com](https://console.anthropic.com). It is only used by the server route `/api/parse`.

### 3. Environment

Copy `.env.example` to `.env.local` and fill in the values. Add the same three variables to the Vercel project.

### 4. Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (scaling)
npm run lint
npm run build
```

Deploy by importing the repository in Vercel.

### Install on the phone

Open the site in Safari (iPhone) or Chrome (Android) → Share / menu → **Add to Home Screen**.

## How it fits together

| Path | What it does |
|---|---|
| `src/app/page.tsx` | Recipe list with search |
| `src/app/recipes/new/` | Type / photo / paste → AI parse → review → save |
| `src/app/recipes/[id]/` | Recipe view with adults/children or batch scaling; `edit/` to edit or delete |
| `src/app/settings/` | Default family composition (shared), sign out |
| `src/app/api/parse/route.ts` | Server route: fetches links, loads photos, calls Claude |
| `src/lib/parse/` | Claude prompt + structured output, safe web page fetcher |
| `src/lib/scaling.ts` | Portion maths and quantity formatting (unit tested) |
| `src/lib/data.ts` | Supabase reads/writes and live subscriptions |
| `src/proxy.ts` | Refreshes the session and redirects signed-out visitors to `/login` |
| `supabase/migrations/` | Schema, RLS policies, realtime, storage bucket |

Access control lives in the database: every table and the photo bucket only allow the emails listed in `allowed_emails`.
