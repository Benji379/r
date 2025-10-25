import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthenticatedRequest } from "./src/types";
import { findUserByUsername } from "./src/db";
import { JWT_SECRET } from "./src/controller"; // Importa el secret
import * as controllers from "./src/controller"; // Importa todos los controladores

// ────────────────────────────────────────────────
// CONFIGURACIÓN Y APP
// ────────────────────────────────────────────────
const app = express();
const PORT = 8421;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ────────────────────────────────────────────────
// MIDDLEWARES DE AUTENTICACIÓN
// ────────────────────────────────────────────────
const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "Token requerido" });

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string" || !decoded.username) {
      return res.status(401).json({ success: false, error: "Token malformado" });
    }

    const user = await findUserByUsername(decoded.username);

    // Lógica de sesión única
    if (!user || user.activeToken !== token) {
      return res.status(401).json({
        success: false,
        error:
          "Sesión inválida. Es posible que se haya iniciado sesión en otro dispositivo.",
      });
    }

    jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = user;
    next();
  } catch (err) {
    res
      .status(401)
      .json({ success: false, error: "Token inválido o expirado" });
  }
};

const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "admin")
    return res
      .status(403)
      .json({ success: false, error: "Acceso restringido a administradores" });
  next();
};

// ────────────────────────────────────────────────
// RUTAS
// ────────────────────────────────────────────────

// --- Rutas de Autenticación ---
app.post("/auth/login", controllers.loginController);
app.post("/auth/logout", authenticateToken, controllers.logoutController);
app.get("/auth/me", authenticateToken, controllers.getMeController);

// --- Rutas de Administración de Usuarios ---
app.post(
  "/usuarios",
  authenticateToken,
  requireAdmin,
  controllers.createUserController
);
app.get(
  "/usuarios",
  authenticateToken,
  requireAdmin,
  controllers.getAllUsersController
);
app.patch(
  "/usuarios/:username",
  authenticateToken,
  requireAdmin,
  controllers.updateUserController
);
// --- NUEVA RUTA ---
app.delete(
  "/usuarios/:username",
  authenticateToken,
  requireAdmin,
  controllers.deleteUserController
);
// --- FIN NUEVA RUTA ---

// --- Rutas de Consulta RENIEC ---
app.get("/consulta", authenticateToken, controllers.consultaDniController);
app.get(
  "/consulta-nombres",
  authenticateToken,
  controllers.consultaNombresController
);

// --- Rutas de Compatibilidad (Alias) ---
app.post("/login", controllers.loginController); // Alias para /auth/login
app.get("/me", authenticateToken, controllers.getMeController); // Alias para /auth/me
app.get("/usuarios/me", authenticateToken, controllers.getMeController); // Alias para /auth/me

// --- Healthcheck ---
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "API funcionando correctamente" });
});

// --- Manejo de 404 ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint no encontrado. Verifica la ruta y el método HTTP.",
  });
});

// ────────────────────────────────────────────────
// INICIO DEL SERVIDOR
// ────────────────────────────────────────────────
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
  // Ahora también accesible en tu red local
});

export default app;