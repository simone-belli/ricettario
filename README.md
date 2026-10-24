# Ricettario

Simone and Kat's shared family recipe book: a mobile-first web app (PWA) for adding recipes by typing or dictating, photographing notebook pages, or pasting text and links, with portion scaling while cooking.

See [docs/SPEC.md](docs/SPEC.md) for the product spec.

**Stack:** Next.js 16 (App Router) · Tailwind CSS · Supabase (Postgres, Auth, Realtime, Storage) · Claude Sonnet 5.5 for parsing · Vercel hosting.

## Run it on your Mac

This runs the whole app on your computer: the app itself, plus a local copy of Supabase (database, login, photo storage). Nothing goes online except the AI calls to Anthropic.

### One-time setup

1. **Install Node.js.** Download the LTS version from [nodejs.org](https://nodejs.org) and run the installer.
2. **Install Docker Desktop.** Download it from [docker.com](https://www.docker.com/products/docker-desktop/) (pick "Apple Silicon" or "Intel" to match your Mac: Apple menu → About This Mac). Open it once and wait until it says it's running.
3. **Get an Anthropic API key** (optional, needed for reading photos, dictation and links):
   - Sign up at [console.anthropic.com](https://console.anthropic.com).
   - Under **Billing**, add a little credit. Each recipe read costs roughly a few cents.
   - Under **API keys**, create a key and copy it (it starts with `sk-ant-`). Treat it like a password.
4. **Open Terminal** (Spotlight → "Terminal") and go to the project folder, e.g.:

   ```bash
   cd ~/path/to/ricettario
   git fetch
   git checkout claude/initial-app
   git pull
   npm install
   ```

5. **Start the local database.** The first time downloads a few GB and takes several minutes:

   ```bash
   npm run db:start
   ```

6. **Connect the app to it.** This asks for your Anthropic key (press Enter to skip) and saves everything in `.env.local`, which is never committed:

   ```bash
   npm run local:setup
   ```

### Every time

```bash
npm run db:start   # if it isn't running already (Docker Desktop must be open)
npm run dev
```

Then open **http://localhost:3000**.

**Signing in:** use `simone@example.com` or `kat@example.com`. No real email is sent: open **http://127.0.0.1:54324** to see the local inbox, then type the 6-digit code into the app (or click the link). To try the live sync, sign in as Simone in one browser and Kat in another (or a private window).

The app starts with two sample recipes.

**Useful extras**

| Command / address | What it does |
|---|---|
| http://127.0.0.1:54323 | Supabase Studio: browse the tables and stored photos |
| `npm run db:reset` | Wipe local data and reload the sample recipes |
| `npm run db:stop` | Stop the local database (your data is kept) |
| Ctrl + C in Terminal | Stop the app |

The local setup works on the Mac itself. Opening it from your phone needs the real (online) setup below.

## Deploying (real setup)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql` in the **SQL editor**, then allow your two addresses:

   ```sql
   insert into public.allowed_emails (email) values ('simone@…'), ('kat@…');
   ```
3. **Authentication → Users:** add both users ("Add user").
4. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Leave the Email provider on.
5. **Authentication → URL Configuration:** set the Site URL to the Vercel URL and add `https://<your-app>/auth/callback` (and `http://localhost:3000/auth/callback` for development) to the redirect URLs.
6. **Authentication → Emails → Magic Link:** paste in the template from `supabase/templates/magic_link.html`. It adds the 6-digit code, which the home-screen app needs: on iPhone it doesn't share cookies with Safari, so a tapped link only signs in Safari.

### 2. Anthropic

Create an API key at [console.anthropic.com](https://console.anthropic.com). It is only used by the server route `/api/parse`.

### 3. Environment

Copy `.env.example` to `.env.local` and fill in the values. Add the same three variables to the Vercel project.

### 4. Deploy

Import the repository in Vercel.

### Checks

```bash
npm test           # unit tests (scaling)
npm run lint
npm run build
```

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
| `supabase/seed.sql` | Local-only test accounts and sample recipes |
| `scripts/setup-local.mjs` | Writes `.env.local` for the local setup |

Access control lives in the database: every table and the photo bucket only allow the emails listed in `allowed_emails`.
