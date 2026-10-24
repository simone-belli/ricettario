// Writes .env.local for running the app against the local Supabase
// (`npm run db:start`), keeping any Anthropic key already there.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const ENV_FILE = ".env.local";

function readEnv(text) {
  return Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value]),
  );
}

let status;
try {
  status = readEnv(execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
} catch {
  console.error("The local database isn't running. Start Docker Desktop, run `npm run db:start`, then try again.");
  process.exit(1);
}

const existing = existsSync(ENV_FILE) ? readEnv(readFileSync(ENV_FILE, "utf8")) : {};
let anthropicKey = existing.ANTHROPIC_API_KEY ?? "";

if (!anthropicKey.startsWith("sk-ant-")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  anthropicKey = (await rl.question("Paste your Anthropic API key (or press Enter to skip the AI for now): ")).trim();
  rl.close();
}

writeFileSync(
  ENV_FILE,
  [
    "# Local development — written by `npm run local:setup`",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
    `ANTHROPIC_API_KEY=${anthropicKey}`,
    "",
  ].join("\n"),
);

console.log(`\nWrote ${ENV_FILE}.${anthropicKey ? "" : " The AI is off until you add a key: run this again or edit the file."}`);
console.log("Next: npm run dev, then open http://localhost:3000");
