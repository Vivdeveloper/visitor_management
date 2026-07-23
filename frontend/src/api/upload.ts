import { API_BASE } from "@/config/env";

type UploadResult = {
  file_url?: string;
  file_name?: string;
};

/** Upload an image via Frappe `/api/method/upload_file` and return `file_url`. */
export async function uploadPublicFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("is_private", "0");
  body.append("folder", "Home");

  const token = window.csrf_token || window.vms_csrf_token;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers["X-Frappe-CSRF-Token"] = token;
  }

  const res = await fetch(`${API_BASE}/api/method/upload_file`, {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });

  const json = (await res.json()) as {
    message?: UploadResult | string;
    exc?: string;
    _server_messages?: string;
  };

  if (!res.ok) {
    throw new Error("Photo upload failed");
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
