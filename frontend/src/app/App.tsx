import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/routes/AppRouter";
import { AuthProvider } from "@/context/AuthContext";
import { AppLanguageProvider } from "@/context/AppLanguageContext";
import { CapacitorBootstrap } from "@/components/common/CapacitorBootstrap";
import { APP_BASE_PATH } from "@/config/env";

export function App() {
  return (
    <BrowserRouter basename={APP_BASE_PATH}>
      <AppLanguageProvider>
        <AuthProvider>
          <CapacitorBootstrap />
          <AppRouter />
        </AuthProvider>
      </AppLanguageProvider>
    </BrowserRouter>
  );
}
