export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value);
  }
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
