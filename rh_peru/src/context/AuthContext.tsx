// src/context/AuthContext.tsx
import { createContext, useState, useEffect, useContext } from "react";
import { apiClient } from "../api/apiClient"; // Asegúrate que la ruta sea correcta

// (Tu interfaz de User)
interface User {
  username: string;
  nombre: string;
  apellido: string;
  role: "admin" | "usuario" | "analista";
  allowedFields: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Empezamos en true

  const login = async (username: string, password: string) => {
    try {
      // Usamos /auth/login como en tu server.ts
      const { data } = await apiClient.post("/auth/login", { username, password });

      if (!data.success) {
        throw new Error("Credenciales inválidas");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  // 🔄 --- ¡LÓGICA DE SESIÓN CORREGIDA Y SIMPLIFICADA! --- 🔄
  useEffect(() => {
    // 1. El listener para el evento del interceptor es correcto y se queda.
    // Esto es para cuando el token EXPIRA durante el uso.
    const handleSessionExpired = () => {
      setUser(null);
    };
    window.addEventListener("sessionExpired", handleSessionExpired);

    // 2. Lógica de verificación al cargar la app (¡SIN API CALL!)
    // Simplemente leemos lo que ya guardamos en el login.
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        // Si tenemos token Y datos de usuario, confiamos en ellos.
        setUser(JSON.parse(storedUser));
      }
      // Si el token es inválido, el interceptor de respuesta
      // (apiClient.ts) lo detectará en la *próxima* petición que
      // haga el usuario y disparará "sessionExpired".
      // No necesitamos verificarlo activamente aquí.

    } catch (error) {
      // Si el JSON del usuario está corrupto, limpiamos todo.
      console.error("Error al parsear usuario de localStorage", error);
      logout();
    } finally {
      // Terminamos de "cargar"
      setLoading(false);
    }

    // 3. Cleanup
    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, []); // El array vacío es correcto.

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};