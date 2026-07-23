import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, type AuthProfile } from "@/api/vms";

type AuthContextValue = {
  user: AuthProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (profile: AuthProfile | null) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const VISITOR_KEY = "vms_visitor_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const profile = await authApi.me();
      if (profile.authenticated) {
        setUser(profile);
        sessionStorage.removeItem(VISITOR_KEY);
        if (profile.csrf_token) {
          window.csrf_token = profile.csrf_token;
          window.vms_csrf_token = profile.csrf_token;
        }
        return;
      }

      const raw = sessionStorage.getItem(VISITOR_KEY);
      if (raw) {
        setUser(JSON.parse(raw) as AuthProfile);
        return;
      }

      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setProfile = useCallback((profile: AuthProfile | null) => {
    setUser(profile);
    if (profile?.session_type === "visitor") {
      sessionStorage.setItem(VISITOR_KEY, JSON.stringify(profile));
    } else {
      sessionStorage.removeItem(VISITOR_KEY);
    }
    if (profile?.csrf_token) {
      window.csrf_token = profile.csrf_token;
      window.vms_csrf_token = profile.csrf_token;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      sessionStorage.removeItem(VISITOR_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      setProfile,
      logout,
      isAuthenticated: Boolean(
        user?.authenticated || user?.session_type === "visitor" || user?.verified
      ),
    }),
    [user, loading, refresh, setProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
