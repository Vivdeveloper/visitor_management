/**
 * Capacitor production build — outputs to frontend/dist with base /.
 * Does not touch Frappe public/frontend or PWA www assets.
 */
import { webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const cryptoObj = webcrypto;

for (const g of [globalThis, global]) {
  try {
    Object.defineProperty(g, "crypto", {
      value: cryptoObj,
      configurable: true,
      writable: true,
    });
  } catch {
    g.crypto = cryptoObj;
  }
}

/** Load KEY=VALUE pairs from .env.capacitor without overriding existing shell env. */
function loadCapacitorEnvFile() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env.capacitor");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadCapacitorEnvFile();
process.env.VITE_CAPACITOR = "true";

await build({ mode: "capacitor" });
