import { Component, type ErrorInfo, type ReactNode } from "react";

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

function isDomRaceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || "";
  return (
    error.name === "NotFoundError" &&
    (msg.includes("removeChild") || msg.includes("insertBefore"))
  );
}

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Swallow transient WebView DOM races on native instead of showing a fatal overlay. */
export class NativeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State | null {
    if (isCapacitorNative() && isDomRaceError(error)) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    if (isCapacitorNative() && isDomRaceError(error)) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="vms-boot" style={{ padding: "2rem", textAlign: "center" }}>
          Something went wrong. Pull down to refresh or reopen the app.
        </div>
      );
    }
    return this.props.children;
  }
}
