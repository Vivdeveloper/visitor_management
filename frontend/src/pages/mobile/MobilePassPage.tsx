import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { passApi, type MyPassRow } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { resolveMode } from "@/lib/roles";

export function MobilePassPage() {
  const { user } = useAuth();
  const mode = resolveMode(user);
  const mobile = user?.mobile || user?.mobile_no || "";
  const [rows, setRows] = useState<MyPassRow[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMine = useCallback(async () => {
    if (!mobile) return;
    setLoading(true);
    setError(null);
    try {
      const list = await passApi.listMyPasses(mobile);
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load passes");
    } finally {
      setLoading(false);
    }
  }, [mobile]);

  useEffect(() => {
    if (mode === "visitor" || mode === "host" || mode === "security") {
      void loadMine();
    }
  }, [mode, loadMine]);

  return (
    <section className="m-page">
      <h1>{mode === "visitor" ? "My pass" : "Passes"}</h1>
      <p className="m-sub">
        {mode === "visitor"
          ? "Passes linked to your verified mobile"
          : "Your visitor history on this mobile, or open a public pass token"}
      </p>

      {loading ? <p className="m-sub">Loading…</p> : null}
      {error ? <p className="login-error">{error}</p> : null}

      {rows.length > 0 ? (
        <ul className="m-list">
          {rows.map((row) => (
            <li key={row.name} className="m-card">
              <div className="m-card-title">{row.full_name || row.name}</div>
              <div className="m-card-meta">
                {row.status}
                {row.person_to_meet_name || row.host_name
                  ? ` · ${row.person_to_meet_name || row.host_name}`
                  : ""}
              </div>
              {row.name ? (
                <Link className="m-btn primary" to={`/pass/${encodeURIComponent(row.name)}`}>
                  Open pass
                </Link>
              ) : (
                <span className="m-sub">No pass yet</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-sub">No passes found for this mobile.</p>
      )}

      <div className="m-card" style={{ marginTop: "1rem" }}>
        <div className="m-card-title">Open by token</div>
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            const t = token.trim().replace(/^.*\//, "");
            if (t) window.location.assign(`/vms/pass/${t}`);
          }}
        >
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token or /vms/pass/… URL"
          />
          <button type="submit">Open</button>
        </form>
      </div>
    </section>
  );
}
