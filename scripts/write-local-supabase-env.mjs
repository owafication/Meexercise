import { execFileSync, execSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const localSupabase = resolve(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "supabase.cmd" : "supabase",
);

function runSupabase(args) {
  if (process.platform === "win32") {
    const command = [
      `"${localSupabase}"`,
      ...args.map((arg) => `"${String(arg).replaceAll('"', '""')}"`),
    ].join(" ");

    return execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.env.ComSpec || "cmd.exe",
    });
  }

  return execFileSync(localSupabase, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

if (process.argv.includes("--probe")) {
  const version = runSupabase(["--version"]).trim();

  if (!version) {
    throw new Error("Project-local Supabase CLI probe returned no version.");
  }

  process.stdout.write(`${version}\n`);
  process.exit(0);
}

const output = runSupabase(["status", "-o", "env"]);
const values = new Map();

for (const rawLine of output.split(/\r?\n/)) {
  const line = rawLine.trim();
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);

  if (!match) {
    continue;
  }

  let value = match[2].trim();

  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }

  values.set(match[1], value);
}

const apiUrl = values.get("API_URL");
const browserKey = values.get("PUBLISHABLE_KEY") ?? values.get("ANON_KEY");

if (!apiUrl || !browserKey) {
  throw new Error(
    "Supabase status did not provide the local API URL and browser-safe key.",
  );
}

const contents = [
  `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${browserKey}`,
  "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000",
  "",
].join("\n");

writeFileSync(resolve(process.cwd(), ".env.local"), contents, {
  encoding: "utf8",
  mode: 0o600,
});
