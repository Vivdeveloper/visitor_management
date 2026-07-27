/**
 * Copy production build output to another bench's visitor_management app.
 * Usage: node scripts/sync-built-assets.mjs /path/to/frappe15/apps/visitor_management
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(__dirname, "../../visitor_management");
const targetRoot = path.resolve(process.argv[2] || "", "visitor_management");

if (!process.argv[2]) {
  console.error("Usage: node scripts/sync-built-assets.mjs <target-app-path>");
  console.error("Example: node scripts/sync-built-assets.mjs ../../../frappe15/apps/visitor_management");
  process.exit(1);
}

if (!fs.existsSync(path.join(targetRoot, "public", "frontend", "vms-app.js"))) {
  console.error(`[sync-built] target not found: ${targetRoot}`);
  process.exit(1);
}

const pairs = [
  ["public/frontend", "public/frontend"],
  ["www/vms_sw.js", "www/vms_sw.js"],
  ["www/vms_manifest.webmanifest", "www/vms_manifest.webmanifest"],
  ["www/vms.html", "www/vms.html"],
];

for (const [relFrom, relTo] of pairs) {
  const from = path.join(sourceRoot, relFrom);
  const to = path.join(targetRoot, relTo);
  if (!fs.existsSync(from)) {
    console.warn(`[sync-built] skip missing ${from}`);
    continue;
  }
  if (fs.statSync(from).isDirectory()) {
    fs.cpSync(from, to, { recursive: true, force: true });
    console.log(`[sync-built] synced dir ${relFrom}`);
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`[sync-built] synced file ${relTo}`);
  }
}

console.log("[sync-built] done");
