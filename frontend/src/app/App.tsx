import { AppRouter } from "@/routes/AppRouter";
import { AuthProvider } from "@/context/AuthContext";
import { AppLanguageProvider } from "@/context/AppLanguageContext";
import { CapacitorBootstrap } from "@/components/common/CapacitorBootstrap";
import { NativeErrorBoundary } from "@/components/common/NativeErrorBoundary";

export function App() {
  return (
    <NativeErrorBoundary>
      <AppLanguageProvider>
        <AuthProvider>
          <CapacitorBootstrap />
          <AppRouter />
        </AuthProvider>
      </AppLanguageProvider>
    </NativeErrorBoundary>
  );
}
