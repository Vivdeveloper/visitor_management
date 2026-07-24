/**
 * Build a root-scoped service worker at /vms_sw.js so Chrome can install
 * the PWA for /vms/ (assets SW alone cannot control /vms pages).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const built = path.resolve(__dirname, "../../visitor_management/public/frontend");
const www = path.resolve(__dirname, "../../visitor_management/www");
const assetBase = "/assets/visitor_management/frontend/";

function rewriteSwForRoot(swSource) {
	let sw = swSource;
	// Absolute workbox chunk (single or double quotes)
	sw = sw.replace(
		/define\(\[(['"])\.\/(workbox-[^'"]+)\1\]/g,
		`define([$1${assetBase}$2$1]`,
	);
	// Absolute precache asset URLs: "url": "file.js"
	sw = sw.replace(/"url":\s*"([^"]+)"/g, (full, url) => {
		if (
			url.startsWith("/") ||
			url.startsWith("http://") ||
			url.startsWith("https://") ||
			url.startsWith("data:")
		) {
			return full;
		}
		return `"url": "${assetBase}${url}"`;
	});
	// Compact form url:"file.js"
	sw = sw.replace(/url:"([^"]+)"/g, (full, url) => {
		if (
			url.startsWith("/") ||
			url.startsWith("http://") ||
			url.startsWith("https://") ||
			url.startsWith("data:")
		) {
			return full;
		}
		return `url:"${assetBase}${url}"`;
	});
	return sw;
}

const swSrc = path.join(built, "sw.js");
const manifestSrc = path.join(built, "manifest.webmanifest");

if (!fs.existsSync(swSrc)) {
	console.warn("[copy-pwa] missing sw.js — run vite build first");
} else {
	const rewritten = rewriteSwForRoot(fs.readFileSync(swSrc, "utf8"));
	fs.writeFileSync(path.join(www, "vms_sw.js"), rewritten);
	console.log("[copy-pwa] wrote www/vms_sw.js (scope-ready for /vms/)");
}

if (!fs.existsSync(manifestSrc)) {
	console.warn("[copy-pwa] missing manifest.webmanifest");
} else {
	fs.copyFileSync(manifestSrc, path.join(www, "vms_manifest.webmanifest"));
	console.log("[copy-pwa] synced www/vms_manifest.webmanifest");
}
