import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
// (Asegúrate de que UserRole en 'types.ts' incluya "analista")
import {
  AuthenticatedRequest,
  PersonaData,
  PersonaPayload,
  ReniecApiResponse,
  AllowedField,
  FilteredPersonaPayload,
  StoredUser,
  UserRole,
} from "./types";
import {
  readUsersFromDisk,
  writeUsersToDisk,
  findUserByUsername,
  sanitizeUser,
  normalizeUsername,
  parseAllowedFields,
  DEFAULT_ALLOWED_FIELDS,
  readRestrictionsFromDisk, // <-- 1. IMPORTAR NUEVA FUNCIÓN
} from "./db";

// ────────────────────────────────────────────────
// CONFIGURACIÓN Y CONSTANTES
// ────────────────────────────────────────────────
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ────────────────────────────────────────────────
// HELPERS (Lógica de RENIEC)
// ────────────────────────────────────────────────

const getCommonHeaders = () => ({
  accept: "*/*",
  "accept-language": "es-ES,es;q=0.9",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  origin: "https://buscardniperu.com",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "x-requested-with": "XMLHttpRequest",
});

// --- 2. NUEVO HELPER DE RESTRICCIÓN ---
// --- 2. NUEVO HELPER DE RESTRICCIÓN ---
const RESTRICTED_FIELDS_FOR_SAPO: (keyof PersonaData)[] = [
  "fch_inscripcion",
  "fch_emision",
  "fch_caducidad",
  "ubigeo_nac",
  "ubigeo_dir",
  "direccion",
  // "sexo", <-- quitado
  // "est_civil", <-- quitado
  "dig_ruc",
  "madre",
  "padre",
];

/**
 * Aplica la censura "no seas sapo" a los datos de la persona
 * si su DNI está en la lista de restricciones.
 */
const applySapoFilter = (
  payload: PersonaPayload,
  restrictions: string[]
): PersonaPayload => {

  const censorPerson = (item: PersonaData): PersonaData => {
    // Si el DNI no está en la lista de restricciones, devolver el item original
    if (!restrictions.includes(item.dni)) {
      return item;
    }

    // Si está restringido, aplicar censura
    const censoredItem = { ...item };
    for (const field of RESTRICTED_FIELDS_FOR_SAPO) {
      // Usamos 'as any' para sobreescribir el tipo con un string
      (censoredItem as any)[field] = "no seas sapo";
    }
    return censoredItem;
  };

  // Si el payload es nulo o indefinido, devolverlo tal cual
  if (!payload) return payload;

  // Aplicar la función de censura tanto a un objeto único como a un array
  if (Array.isArray(payload)) {
    return payload.map(censorPerson);
  }
  return censorPerson(payload);
};
// --- FIN NUEVO HELPER ---

const filterPersonaPayload = (
  payload: PersonaPayload,
  allowedFields: AllowedField[]
): FilteredPersonaPayload => {
  const project = (item: PersonaData): Partial<PersonaData> =>
    allowedFields.reduce<Partial<PersonaData>>((acc, field) => {
      acc[field] = item[field];
      return acc;
    }, {});
    
  // Si el payload es nulo o indefinido, devolverlo tal cual
  if (!payload) return payload;

  return Array.isArray(payload) ? payload.map(project) : project(payload);
};

// ────────────────────────────────────────────────
// CONTROLADORES (Lógica de Endpoints)
// ────────────────────────────────────────────────

// --- Controladores de Auth ---
export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    const user = await findUserByUsername(String(username || ""));
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Usuario no encontrado" });
    }

    const passwordOk = user.passwordHash === String(password || "");
    if (!passwordOk) {
      return res
        .status(401)
        .json({ success: false, error: "Credenciales inválidas" });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "12h",
    });

    const users = await readUsersFromDisk();
    const userIndex = users.findIndex((u) => u.username === user.username);
    if (userIndex === -1) {
      return res
        .status(500)
        .json({ success: false, error: "Error de consistencia de datos" });
    }

    users[userIndex].activeToken = token;
    users[userIndex].updatedAt = new Date().toISOString();
    await writeUsersToDisk(users);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(users[userIndex]),
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error al autenticar" });
  }
};

export const logoutController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "No autorizado" });
    }
    const users = await readUsersFromDisk();
    const userIndex = users.findIndex(
      (u) => u.username === req.user!.username
    );
    if (userIndex > -1) {
      users[userIndex].activeToken = null;
      users[userIndex].updatedAt = new Date().toISOString();
      await writeUsersToDisk(users);
    }
    res.json({ success: true, message: "Sesión cerrada exitosamente" });
  } catch (error) {
    console.error("Error en logout:", error);
    res.status(500).json({ success: false, error: "Error al cerrar sesión" });
  }
};

export const getMeController = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user)
    return res
      .status(404)
      .json({ success: false, error: "Usuario no encontrado" });
  return res.json({ success: true, user: sanitizeUser(req.user) });
};

// --- Controladores de Usuarios (Admin) ---
export const createUserController = async (req: Request, res: Response) => {
  try {
    const { username, password, nombre, apellido, allowedFields, role } =
      req.body;
    if (!username || !password || !nombre || !apellido)
      return res.status(400).json({
        success: false,
        error: "Campos requeridos: username, password, nombre, apellido",
      });

    const users = await readUsersFromDisk();
    const normalized = normalizeUsername(username);
    if (users.some((u) => u.username === normalized))
      return res
        .status(409)
        .json({ success: false, error: "El usuario ya existe" });

    const parsed = parseAllowedFields(allowedFields) ?? DEFAULT_ALLOWED_FIELDS;
    const now = new Date().toISOString();

    // --- LÓGICA DE ROL CORREGIDA ---
    const validRoles: UserRole[] = ["admin", "usuario", "analista"];
    const newUserRole = validRoles.includes(role) ? role : "usuario";
    // --- FIN DE CORRECCIÓN ---

    const newUser: StoredUser = {
      username: normalized,
      nombre,
      apellido,
      passwordHash: password, // Guardar texto plano
      allowedFields: parsed,
      role: newUserRole, // <-- CAMBIO APLICADO
      activeToken: null,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    await writeUsersToDisk(users);
    res.status(201).json({ success: true, user: sanitizeUser(newUser) });
  } catch (e) {
    res.status(500).json({ success: false, error: "Error creando usuario" });
  }
};

export const getAllUsersController = async (_: Request, res: Response) => {
  const users = await readUsersFromDisk();
  res.json({ success: true, users: users.map(sanitizeUser) });
};

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const users = await readUsersFromDisk();
    const username = normalizeUsername(req.params.username);
    const index = users.findIndex((u) => u.username === username);

    if (index === -1)
      return res
        .status(404)
        .json({ success: false, error: "Usuario no encontrado" });

    const parsed =
      parseAllowedFields(req.body.allowedFields) ??
      users[index].allowedFields;

    // --- LÓGICA DE ROL CORREGIDA ---
    const validRoles: UserRole[] = ["admin", "usuario", "analista"];
    let newRole = users[index].role; // Mantener el rol existente por defecto
    if (req.body.role && validRoles.includes(req.body.role)) {
      newRole = req.body.role; // Asignar el nuevo rol si es válido
    }
    // --- FIN DE CORRECCIÓN ---

    users[index] = {
      ...users[index],
      username: req.body.username
        ? normalizeUsername(req.body.username)
        : users[index].username,
      nombre: req.body.nombre ?? users[index].nombre,
      apellido: req.body.apellido ?? users[index].apellido,
      role: newRole, // <-- CAMBIO APLICADO
      allowedFields: parsed,
      updatedAt: new Date().toISOString(),
    };

    if (req.body.password && req.body.password.trim() !== "") {
      users[index].passwordHash = req.body.password.trim();
    }

    await writeUsersToDisk(users);
    res.json({ success: true, user: sanitizeUser(users[index]) });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res
      .status(500)
      .json({ success: false, error: "Error al actualizar usuario" });
  }
};

// --- NUEVO CONTROLADOR ---
export const deleteUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const users = await readUsersFromDisk();
    const username = normalizeUsername(req.params.username);

    // No permitir que un admin se elimine a sí mismo
    if (req.user?.username === username) {
      return res.status(400).json({
        success: false,
        error: "No puedes eliminar tu propia cuenta de administrador",
      });
    }

    const index = users.findIndex((u) => u.username === username);

    if (index === -1)
      return res
        .status(404)
        .json({ success: false, error: "Usuario no encontrado" });

    users.splice(index, 1);
    await writeUsersToDisk(users);

    res.status(200).json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res
      .status(500)
      .json({ success: false, error: "Error al eliminar usuario" });
  }
};
// --- FIN NUEVO CONTROLADOR ---

// --- Controladores de RENIEC ---
export const consultaDniController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const dni = String(req.query.dni || "").trim();
    if (!dni || !/^\d{8}$/.test(dni))
      return res.status(400).json({ success: false, error: "DNI inválido" });

    // --- 3. INICIO MODIFICACIÓN ---
    // Leer la lista de restricciones
    const restrictions = await readRestrictionsFromDisk();
    // --- FIN MODIFICACIÓN ---

    const response = await axios.post<ReniecApiResponse>(
      "https://buscardniperu.com/wp-admin/admin-ajax.php",
      `dni=${dni}&action=consulta_dni_api&tipo=dni&pagina=1`,
      {
        headers: {
          ...getCommonHeaders(),
          referer: "https://buscardniperu.com/como-saber-la-edad-por-dni/",
        },
      }
    );

    // --- 3. INICIO MODIFICACIÓN ---
    // Aplicar el filtro "sapo" ANTES del filtro de permisos
    const sapoFilteredData = applySapoFilter(response.data.data, restrictions);
    // --- FIN MODIFICACIÓN ---

    const allowedFields = req.user?.allowedFields ?? DEFAULT_ALLOWED_FIELDS;

    // --- 3. INICIO MODIFICACIÓN ---
    // Aplicar el filtro de permisos sobre los datos ya censurados
    const filtered = filterPersonaPayload(sapoFilteredData, allowedFields);
    // --- FIN MODIFICACIÓN ---

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Error en consulta DNI:", error);
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
};

export const consultaNombresController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { nombres = "", ap_pat = "", ap_mat = "" } = req.query;
    if (!nombres || !ap_pat || !ap_mat)
      return res.status(400).json({
        success: false,
        error: "Parámetros requeridos: nombres, ap_pat, ap_mat",
      });

    // --- 3. INICIO MODIFICACIÓN ---
    // Leer la lista de restricciones
    const restrictions = await readRestrictionsFromDisk();
    // --- FIN MODIFICACIÓN ---

    const params = new URLSearchParams({
      ap_pat: String(ap_pat),
      ap_mat: String(ap_mat),
      nombres: String(nombres),
      action: "consulta_dni_api",
      tipo: "nombre",
      pagina: "1",
    });

    const response = await axios.post<ReniecApiResponse>(
      "https://buscardniperu.com/wp-admin/admin-ajax.php",
      params.toString(),
      {
        headers: {
          ...getCommonHeaders(),
          referer: "https://buscardniperu.com/buscar-dni-por-nombres/",
        },
      }
    );

    // --- 3. INICIO MODIFICACIÓN ---
    // Aplicar el filtro "sapo" ANTES del filtro de permisos
    // Esto funciona para búsquedas por nombre porque applySapoFilter
    // itera sobre el array de resultados y comprueba cada DNI.
    const sapoFilteredData = applySapoFilter(response.data.data, restrictions);
    // --- FIN MODIFICACIÓN ---

    const allowedFields = req.user?.allowedFields ?? DEFAULT_ALLOWED_FIELDS;

    // --- 3. INICIO MODIFICACIÓN ---
    // Aplicar el filtro de permisos sobre los datos ya censurados
    const filtered = filterPersonaPayload(sapoFilteredData, allowedFields);
    // --- FIN MODIFICACIÓN ---

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Error en consulta-nombres:", error);
    res
      .status(500)
      .json({ success: false, error: "Error interno del servidor" });
  }
};