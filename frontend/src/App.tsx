import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import AppRouter from "@/routes/AppRouter";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-full">
          <Navbar />
          <AppRouter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
