import { AppRouter } from "@/routes/AppRouter";
import { AuthProvider } from "@/context/AuthContext";
import { AppLanguageProvider } from "@/context/AppLanguageContext";
import { CapacitorBootstrap } from "@/components/common/CapacitorBootstrap";

export function App() {
  return (
    <AppLanguageProvider>
      <AuthProvider>
        <CapacitorBootstrap />
        <AppRouter />
      </AuthProvider>
    </AppLanguageProvider>
  );
}
