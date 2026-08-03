import { API_BASE } from "@/config/env";

type UploadResult = {
  file_url?: string;
  file_name?: string;
};

function parseServerMessages(raw?: string): string {
  if (!raw) return "";
  try {
    const msgs = JSON.parse(raw) as string[];
    return msgs
      .map((m) => {
        try {
          return (JSON.parse(m) as { message?: string }).message || "";
        } catch {
          return m;
        }
      })
      .filter(Boolean)
      .join(" ");
  } catch {
    return "";
  }
}

/**
 * Upload an image for Add Entry via VMS API (not core upload_file).
 * Gate users need Visitor Entry create; guests need verified OTP (+ mobile).
 */
export async function uploadPublicFile(file: File, mobile?: string): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("is_private", "0");
  body.append("folder", "Home");
  if (mobile) {
    body.append("mobile", mobile);
  }

  const token = window.csrf_token || window.vms_csrf_token;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers["X-Frappe-CSRF-Token"] = token;
  }

  const res = await fetch(
    `${API_BASE}/api/method/visitor_management.react_api.visitor.upload_visitor_media`,
    {
      method: "POST",
      credentials: "include",
      headers,
      body,
    },
  );

  const json = (await res.json()) as {
    message?: UploadResult | string;
    exc?: string;
    exc_type?: string;
    exception?: string;
    _server_messages?: string;
  };

  const fromMessages = parseServerMessages(json._server_messages);
  if (!res.ok || json.exc || json.exception) {
    const fromException = (() => {
      if (!json.exception) return "";
      const line = String(json.exception).split("\n").pop() || "";
      const cleaned = line.replace(/^.*Error:\s*/i, "").trim();
      if (cleaned && cleaned !== "frappe.exceptions.PermissionError") return cleaned;
      return "";
    })();
    throw new Error(
      fromMessages ||
        fromException ||
        (typeof json.message === "string" ? json.message : "") ||
        (json.exc_type === "PermissionError"
          ? "Permission denied while uploading. Sign in as security (Create on Visitor Entry) or verify OTP first."
          : "") ||
        "Photo upload failed",
    );
  }

  const message = json.message;
  if (typeof message === "string") {
    throw new Error(message || "Photo upload failed");
  }
  if (!message?.file_url) {
    throw new Error("Photo upload did not return a file URL");
  }
  return message.file_url;
}
