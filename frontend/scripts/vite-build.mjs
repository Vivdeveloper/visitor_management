/**
 * Node 18 + workbox/terser: ensure Web Crypto is on global for serialize-javascript.
 */
import { webcrypto } from "node:crypto";
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

await build();
