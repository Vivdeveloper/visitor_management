/**
 * Android/iOS hardware back handling for the Capacitor WebView SPA.
 *
 * Avoids `window.history.length` (unreliable in WebViews — often exits the app
 * or leaves the SPA). Page handlers run first; then SPA depth / path.
 */

type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

let spaDepth = 0;
let navigateBack: (() => void) | null = null;
let navigateHome: (() => void) | null = null;

/** Current in-app path (HashRouter or BrowserRouter under /vms). */
export function getSpaPath(): string {
  const hash = window.location.hash || "";
  if (hash.startsWith("#")) {
    const raw = hash.slice(1) || "/";
    const path = raw.split("?")[0] || "/";
    return path.startsWith("/") ? path : `/${path}`;
  }
  let path = window.location.pathname || "/";
  if (path.startsWith("/vms")) {
    path = path.slice(4) || "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function isSpaHomePath(path = getSpaPath()): boolean {
  return path === "/" || path === "";
}

export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.lastIndexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  };
}

/** Wire React Router navigate from MobileLayout. */
export function setSpaNavigators(back: () => void, home: () => void): () => void {
  navigateBack = back;
  navigateHome = home;
  return () => {
    if (navigateBack === back) navigateBack = null;
    if (navigateHome === home) navigateHome = null;
  };
}

export function syncSpaDepth(navType: "POP" | "PUSH" | "REPLACE"): void {
  if (navType === "PUSH") {
    spaDepth += 1;
    return;
  }
  if (navType === "POP") {
    spaDepth = Math.max(0, spaDepth - 1);
    return;
  }
  /* REPLACE — depth unchanged */
}

export function resetSpaDepth(depth = 0): void {
  spaDepth = Math.max(0, depth);
}

export function getSpaDepth(): number {
  return spaDepth;
}

/**
 * @returns true if the event was handled (caller must not exit the app).
 */
export function dispatchHardwareBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    try {
      if (handlers[i]()) return true;
    } catch {
      /* ignore handler errors */
    }
  }

  if (spaDepth > 0) {
    if (navigateBack) navigateBack();
    else window.history.back();
    return true;
  }

  if (!isSpaHomePath()) {
    if (navigateHome) navigateHome();
    else if (navigateBack) navigateBack();
    else window.history.back();
    return true;
  }

  return false;
}
