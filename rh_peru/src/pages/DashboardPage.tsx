// src/pages/DashboardPage.tsx
import { useState, useEffect } from "react"; // --- (MODIFICADO) Importar useEffect ---
// --- Ajuste de rutas ---
import { useAuth } from "../context/AuthContext";
import ConsultaDNI from "../components/ConsultaDNI";
import RegisterForm from "../components/RegisterForm";
// --- Importar el componente de procesamiento ---
import ProcesamientoAvanzado from "../components/ProcesamientoAvanzado";

// --- Añadir 'procesamiento' a los tipos de Vista ---
type Vista = "consultas" | "usuarios" | "procesamiento";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  // Estado para controlar la vista activa. 'consultas' es el default.
  const [vistaActual, setVistaActual] = useState<Vista>("consultas");

  // --- (MODIFICADO) Lógica de roles con optional chaining (más seguro) ---
  const isAdmin = user?.role === "admin";
  const isAnalista = user?.role === "analista";

  // --- (NUEVO) Efecto para validar la vista inicial ---
  // Esto asegura que si el estado inicial 'vistaActual' (p.ej. "usuarios")
  // no es uno al que el usuario tiene acceso, se le redirija
  // automáticamente a su primera vista disponible ("consultas").
  useEffect(() => {
    if (user) {
      // Definir permisos
      const puedeVerProcesamiento = isAdmin || isAnalista;
      const puedeVerUsuarios = isAdmin;

      // Validar la vista actual. Si la vista actual es una para la que
      // el usuario NO tiene permisos, lo reseteamos a "consultas".
      if (vistaActual === "procesamiento" && !puedeVerProcesamiento) {
        setVistaActual("consultas");
      } else if (vistaActual === "usuarios" && !puedeVerUsuarios) {
        setVistaActual("consultas");
      }
      // No es necesario un 'else' para "consultas", ya que todos pueden verla.
    }
    // Este efecto solo debe ejecutarse cuando el usuario (y sus roles) cargan.
  }, [user, isAdmin, isAnalista]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-[#9BD2EF] to-white">
        <p className="text-gray-700 font-medium">Cargando datos del usuario...</p>
      </div>
    );
  }

  // Helper para las clases de los botones
  const getButtonClass = (vista: Vista) => {
    const isActive = vistaActual === vista;
    return isActive
      ? "bg-gray-900 text-white shadow-lg" // Estilo activo
      : "bg-white/40 hover:bg-white/60 text-gray-900"; // Estilo inactivo
  };

  return (
    // Fondo degradado principal
    <div className="min-h-screen bg-gradient-to-b from-[#9BD2EF] to-white flex flex-col">
      
      {/* ───────── Navbar "Glassmorphism" ───────── */}
      <header className="bg-white/30 backdrop-blur-lg shadow-lg p-4 flex justify-between items-center sticky top-0 z-10">
        
        {/* Botones de Navegación */}
        <div className="flex flex-wrap gap-2">
          {/* --- Botón visible para todos (admin, analista, usuario) --- */}
          {(isAdmin || isAnalista || user.role === "usuario") && (
            <button
              onClick={() => setVistaActual("consultas")}
              className={`px-4 py-2 rounded-lg transition font-medium ${getButtonClass("consultas")}`}
            >
              Consultas RENIEC
            </button>
          )}

          {/* --- Botón para Admins y Analistas --- */}
          {(isAdmin || isAnalista) && (
            <button
              onClick={() => setVistaActual("procesamiento")}
              className={`px-4 py-2 rounded-lg transition font-medium ${getButtonClass("procesamiento")}`}
            >
              Procesamiento Avanzado
            </button>
          )}

          {/* Botón solo para Admins */}
          {isAdmin && (
            <button
              onClick={() => setVistaActual("usuarios")}
              className={`px-4 py-2 rounded-lg transition font-medium ${getButtonClass("usuarios")}`}
            >
              Gestión de Usuarios
            </button>
          )}
        </div>

        {/* Botón de Cerrar Sesión */}
        <button
          onClick={logout}
          className="bg-red-600/70 hover:bg-red-700/70 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
        >
          Cerrar sesión
        </button>
      </header>

      {/* ───────── Contenido Principal (Renderizado Condicional) ───────── */}
      <main className="flex-1 p-4 md:p-8">
        
        {/* Muestra ConsultasDNI */}
        {vistaActual === "consultas" && (
          <ConsultaDNI />
        )}

        {/* --- Muestra ProcesamientoAvanzado si es admin o analista --- */}
        {vistaActual === "procesamiento" && (isAdmin || isAnalista) && (
          <ProcesamientoAvanzado />
        )}

        {/* Muestra RegisterForm si la vista es 'usuarios' Y es admin */}
        {vistaActual === "usuarios" && isAdmin && (
          <RegisterForm />
        )}

      </main>
    </div>
  );
}