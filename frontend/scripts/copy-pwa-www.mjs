/**
 * Optional: keep www placeholders in sync (manifest link uses /assets/… directly).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const built = path.resolve(__dirname, "../../visitor_management/public/frontend");
const www = path.resolve(__dirname, "../../visitor_management/www");

for (const name of ["sw.js", "manifest.webmanifest"]) {
  const src = path.join(built, name);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-pwa] missing ${name}`);
    continue;
  }
  // Keep a www copy for debugging / future /vms/sw.js routing
  fs.copyFileSync(src, path.join(www, name === "sw.js" ? "vms_sw.js" : "vms_manifest.webmanifest"));
  console.log(`[copy-pwa] synced ${name}`);
}
