import React, { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginForm from "./components/LoginForm";
// ❌ Ya no importamos ConsultaDNI aquí, DashboardPage se encarga de eso
// import ConsultaDNI from "./components/ConsultaDNI"; 
import DashboardPage from "./pages/DashboardPage";

// --- Componente de Carga Genérico ---
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-[#9BD2EF] to-white">
      <p className="text-gray-700 font-medium text-lg animate-pulse">
        Verificando sesión...
      </p>
    </div>
  );
}

// --- Componente de Ruta Privada ---
function PrivateRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();

  // 1. Si estamos cargando, muestra la pantalla de carga
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. Si terminó de cargar y NO hay usuario, redirige a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si se definieron roles y el usuario NO los cumple
  if (roles && !roles.includes(user.role)) {
    // Lo redirigimos al inicio, que a su vez lo
    // enviará a su página por defecto (/dashboard)
    return <Navigate to="/" replace />;
  }

  // 4. Si todo está bien, muestra el contenido
  return <>{children}</>;
}

// --- Componente Principal App ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA DE LOGIN */}
        <Route path="/login" element={<LoginForm />} />

        {/* ❌ RUTA /consulta ELIMINADA */}
        {/* Esta ruta ya no es necesaria. DashboardPage la maneja internamente. */}

        {/* ✅ RUTA /dashboard (AHORA PARA TODOS LOS ROLES) */}
        {/* Esta es la página principal para TODOS los usuarios logueados */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute roles={["admin", "analista", "usuario"]}>
              <DashboardPage />
            </PrivateRoute>
          }
        />

        {/* RUTA RAÍZ (/) */}
        {/* Protegida por PrivateRoute, que usará RedirectByRole */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <RedirectByRole />
            </PrivateRoute>
          }
        />

        {/* CUALQUIER OTRA RUTA */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/* ✅ Redirige automáticamente a TODOS a /dashboard */
function RedirectByRole() {
  const { user, loading } = useAuth();

  // Espera a que termine la carga
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;

  // TODOS los roles (admin, analista, usuario) son enviados
  // a /dashboard. La página DashboardPage se encargará
  // de mostrarles el contenido y botones correctos.
  return <Navigate to="/dashboard" replace />;
}
