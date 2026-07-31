/**
 * Frappe production build — outputs to visitor_management/public/frontend.
 * Clear Capacitor-only URL env vars so a prior `cap:sync` shell session cannot
 * bake VITE_API_BASE (cloud URL) into the local /vms/ bundle (CORS Network Error).
 * Keep VITE_NATIVE_PUSH so the live-WebView APK can register FCM from /vms/ JS.
 */
import { webcrypto } from "node:crypto";
import { build } from "vite";

delete process.env.VITE_CAPACITOR;
delete process.env.VITE_API_BASE;
delete process.env.CAPACITOR_SERVER_URL;

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

await build();
