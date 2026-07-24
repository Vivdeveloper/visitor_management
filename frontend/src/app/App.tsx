import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/routes/AppRouter";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { APP_BASE_PATH } from "@/config/env";

export function App() {
  return (
    <BrowserRouter basename={APP_BASE_PATH}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
