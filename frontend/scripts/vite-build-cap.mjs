/**
 * Capacitor production build — outputs to frontend/dist with base /.
 * Does not touch Frappe public/frontend or PWA www assets.
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

process.env.VITE_CAPACITOR = "true";

await build({ mode: "capacitor" });
