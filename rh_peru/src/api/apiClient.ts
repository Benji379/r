// src/api/apiClient.ts
import axios from "axios";

// 1. APUNTA DIRECTAMENTE AL BACKEND
// Esta URL debe ser la de tu backend (donde corre server.ts)
const API_URL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL, // <-- ¡ESTO AHORA ES OBLIGATORIO!
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. INTERCEPTOR DE PETICIÓN (Request)
// (Este ya lo tenías, se encarga de *enviar* el token)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. INTERCEPTOR DE RESPUESTA (Response)
// (Este también es correcto, maneja errores 401)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // ¡Error 401! Token expirado o inválido.
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Avisamos al AuthContext para que actualice el estado
      window.dispatchEvent(new CustomEvent("sessionExpired"));
      
      // Redirigir al login
      if (window.location.pathname !== "/login") {
         window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);