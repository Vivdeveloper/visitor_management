import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallStore = {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  hintOpen: boolean;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return ios || iPadOs;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(media || iosStandalone);
}

let store: InstallStore = {
  deferred: null,
  installed: typeof window !== "undefined" ? isStandaloneDisplay() : false,
  hintOpen: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function setStore(patch: Partial<InstallStore>) {
  store = { ...store, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): InstallStore {
  return store;
}

let listenersBound = false;

function bindGlobalListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    setStore({ deferred: e as BeforeInstallPromptEvent });
  });

  window.addEventListener("appinstalled", () => {
    setStore({ deferred: null, installed: true, hintOpen: false });
  });
}

/** Captures beforeinstallprompt once and shares install / platform guidance. */
export function usePwaInstall() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const ios = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    bindGlobalListeners();
    if (isStandaloneDisplay() && !store.installed) {
      setStore({ installed: true });
    }
  }, []);

  const canPrompt = Boolean(snapshot.deferred) && !snapshot.installed;
  const showButton = !snapshot.installed;

  const setHintOpen = useCallback((open: boolean) => {
    setStore({ hintOpen: open });
  }, []);

  const install = useCallback(async () => {
    const deferred = store.deferred;
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setStore({ installed: true, deferred: null, hintOpen: false });
      } else {
        setStore({ deferred: null });
      }
      return;
    }
    setStore({ hintOpen: true });
  }, []);

  return {
    installed: snapshot.installed,
    canPrompt,
    showButton,
    ios,
    hintOpen: snapshot.hintOpen,
    setHintOpen,
    install,
  };
}
