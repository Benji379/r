// src/components/LoginForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // ⬅️ 1. Añadimos el estado de carga

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true); // ⬅️ 2. Activamos la carga

    try {
      // ---------------------------------
      // ⬇️ LÓGICA DE TIEMPO MODIFICADA ⬇️
      // ---------------------------------

      // Creamos la promesa de login
      const loginPromise = login(username, password);

      // Creamos una promesa de temporizador (1500ms = 1.5s)
      const timerPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      // Esperamos a que AMBAS promesas se completen.
      // Promise.all se asegura de que el "Cargando..." dure
      // al menos 1.5s, pero también espera a que el login termine
      // si tarda MÁS de 1.5s.
      await Promise.all([loginPromise, timerPromise]);

      // Si llegamos aquí, el login (loginPromise) fue exitoso
      navigate("/"); // Redirige automáticamente

      // ---------------------------------
      // ⬆️ FIN DE LÓGICA MODIFICADA ⬆️
      // ---------------------------------
    } catch (err: any) {
      // Si loginPromise falla, Promise.all se detiene y entra aquí
      setError("Credenciales inválidas o error de conexión.");
    } finally {
      // 3. Desactivamos la carga (ya sea en éxito o error)
      setIsLoading(false);
    }
  };

  return (
    // Contenedor principal con el gradiente solicitado
    <div className="flex justify-center items-center h-screen bg-gradient-to-b from-[#9BD2EF] to-white">
      {/* Formulario con estilo "glassmorphism" */}
      <form
        onSubmit={handleSubmit}
        className="bg-white/30 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-sm"
      >
        {/* Título y subtítulo */}
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-900">
          Iniciar Sesión
        </h1>
        <p className="text-center text-gray-700 text-sm mb-6">
          Ingresa tus credenciales para continuar.
        </p>

        {/* Campo de Usuario con icono */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {/* Icono de Usuario */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6a1.5 1.5 0 01-1.499-1.632z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading} // ⬅️ 4. Deshabilitar campo
            className="w-full p-3 pl-10 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed" // ⬅️ Estilos disabled
          />
        </div>

        {/* Campo de Contraseña con icono */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {/* Icono de Candado */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading} // ⬅️ 4. Deshabilitar campo
            className="w-full p-3 pl-10 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed" // ⬅️ Estilos disabled
          />
        </div>

        {/* Mensaje de error (preservado) */}
        {error && (
          <p className="text-red-800 bg-red-100/70 p-3 rounded-lg text-sm mb-4 text-center font-medium border border-red-200">
            {error}
          </p>
        )}

        {/* Botón de Submit (estilo oscuro como en la imagen) */}
        <button
          type="submit"
          disabled={isLoading} // ⬅️ 4. Deshabilitar botón
          className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed" // ⬅️ Estilos disabled
        >
          {/* 5. Cambiar texto del botón */}
          {isLoading ? "Cargando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
