// npm run db:push [-- --dry-run]
// Kjører supabase/migrations mot databasen i SUPABASE_DB_URL med offisiell Supabase CLI.
// Migrasjonshistorikk lagres i supabase_migrations.schema_migrations (samme som `supabase db push`).
// Passordet i URL-en maskeres i all output.
import { spawn } from "node:child_process";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL mangler i .env.local (Supabase → Connect → Session pooler).");
  process.exit(1);
}

let password = "";
try {
  password = decodeURIComponent(new URL(url).password);
} catch {
  console.error("SUPABASE_DB_URL er ikke en gyldig postgresql://-URL.");
  process.exit(1);
}
const mask = (text) => (password ? text.split(password).join("****") : text).replaceAll(url, "<SUPABASE_DB_URL>");

const child = spawn("npx", ["supabase", "db", "push", "--db-url", url, "--include-all", "--yes", ...process.argv.slice(2)], {
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (d) => process.stdout.write(mask(String(d))));
child.stderr.on("data", (d) => process.stderr.write(mask(String(d))));
child.on("close", (code) => process.exit(code ?? 1));
