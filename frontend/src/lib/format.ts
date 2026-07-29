export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

/** Resolve Frappe file path / absolute URL for visitor photos. */
export function resolveFileUrl(path?: string | null): string | null {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

const TIME_LOCALE = "en-US";
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

export function formatTime(value?: string | Date | null) {
  if (!value) return "";
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleTimeString(TIME_LOCALE, TIME_OPTIONS);
  } catch {
    return String(value);
  }
}

/** Current clock time in 12-hour AM/PM format (e.g. 09:30 AM). */
export function formatNowTime() {
  return formatTime(new Date());
}

/** Elapsed wait since a timestamp — e.g. "45 min", "2h 15m", "123h 18m". */
export function formatWaitDuration(since?: string | Date | null): string | null {
  if (!since) return null;
  const start = since instanceof Date ? since.getTime() : new Date(since).getTime();
  if (Number.isNaN(start)) return null;

  const totalMinutes = Math.max(1, Math.round((Date.now() - start) / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(value);
  }
}

/** Date + time in 12-hour AM/PM format (e.g. Mon, 28 Jul 2026 · 09:30 AM). */
export function formatDateTime(value?: string | Date | null, compact = false) {
  if (!value) return "";
  const timeStr = formatTime(value);
  if (!timeStr) return "";
  if (compact) {
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return timeStr;
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return timeStr;
      const shortDate = d.toLocaleDateString([], { day: "2-digit", month: "short" });
      return `${shortDate} · ${timeStr}`;
    } catch {
      return timeStr;
    }
  }
  const dateStr = formatDate(value);
  return dateStr ? `${dateStr} · ${timeStr}` : timeStr;
}

export function extractError(err: unknown, fallback = "Something went wrong") {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as {
      response?: {
        status?: number;
        data?: {
          message?: string | { message?: string };
          _server_messages?: string;
          exception?: string;
        };
      };
      message?: string;
    };
    const data = ax.response?.data;
    if (data?._server_messages) {
      try {
        const msgs = JSON.parse(data._server_messages) as string[];
        const parsed = msgs
          .map((m) => {
            try {
              return (JSON.parse(m) as { message?: string }).message || "";
            } catch {
              return m;
            }
          })
          .filter(Boolean);
        if (parsed.length) return parsed.join(" ");
      } catch {
        /* ignore */
      }
    }
    if (typeof data?.message === "string" && data.message) return data.message;
    if (data?.message && typeof data.message === "object" && data.message.message) {
      return String(data.message.message);
    }
    if (ax.response?.status === 417) {
      return "Validation failed. Check host, purpose, and ID proof values from ERPNext.";
    }
    if (ax.message && ax.message !== "Request failed with status code 417") return ax.message;
  }
  if (err instanceof Error) {
    const msg = err.message || "";
    if (/plugin is not implemented/i.test(msg)) {
      return "Could not reach the server. Check your internet connection and try again.";
    }
    if (msg === "Network Error" || /cannot reach the server/i.test(msg)) {
      return "Cannot reach the server. Check your connection, then refresh and try again.";
    }
    if (err.message === "Request failed with status code 417") {
      return "Validation failed. Check host, purpose, and ID proof values from ERPNext.";
    }
    return err.message;
  }
  return fallback;
}

export function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}
