import fs from "fs";
import path from "path";
// (Asegúrate de que UserRole en 'types.ts' incluya "analista")
import { StoredUser, AllowedField, UserRole } from "./types";

const { promises: fsPromises } = fs;

// ────────────────────────────────────────────────
// CONSTANTES DE DATOS
// ────────────────────────────────────────────────

export const DATA_DIR = path.resolve(process.cwd(), "data");
export const USERS_FILE = path.join(DATA_DIR, "users.json");
export const RESTRICTIONS_FILE = path.join(DATA_DIR, "r.json"); // <-- NUEVA LÍNEA

export const ALL_PERSONA_FIELDS: AllowedField[] = [
  "dni", "ap_pat", "ap_mat", "nombres", "fecha_nac", "fch_inscripcion",
  "fch_emision", "fch_caducidad", "ubigeo_nac", "ubigeo_dir", "direccion",
  "sexo", "est_civil", "dig_ruc", "madre", "padre",
];

export const DEFAULT_ALLOWED_FIELDS: AllowedField[] = [
  "dni", "nombres", "ap_pat", "ap_mat",
];

// ────────────────────────────────────────────────
// HELPERS DE USUARIO
// ────────────────────────────────────────────────

export const normalizeUsername = (v: string): string => v.trim().toLowerCase();

export const isAllowedField = (f: string): f is AllowedField =>
  ALL_PERSONA_FIELDS.includes(f as any);

export const parseAllowedFields = (fields: unknown): AllowedField[] | null => {
  if (!Array.isArray(fields)) return null;
  const sanitized = fields
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter(Boolean);
  const unique = Array.from(new Set(sanitized));
  const valid = unique.filter(isAllowedField) as AllowedField[];
  return valid.length > 0 ? valid : null;
};

/**
 * Sanitiza al usuario para enviarlo al cliente.
 */
export const sanitizeUser = (u: StoredUser) => {
  const { activeToken, ...rest } = u;
  return {
    ...rest,
    password: u.passwordHash, // Añadir campo password legible
  };
};


// ────────────────────────────────────────────────
// FUNCIONES DE "BASE DE DATOS" (JSON)
// ────────────────────────────────────────────────

// Inicializar directorio y archivo
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
  
  // --- NUEVA LÍNEA ---
  // Inicializar r.json si no existe
  if (!fs.existsSync(RESTRICTIONS_FILE)) {
    fs.writeFileSync(RESTRICTIONS_FILE, "[]", "utf8");
  }
  // --- FIN NUEVA LÍNEA ---
  
} catch (error) {
  console.error("Failed to initialize user storage:", error);
}

export const readUsersFromDisk = async (): Promise<StoredUser[]> => {
  try {
    const raw = await fsPromises.readFile(USERS_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    // Normalizar datos al leer
    return data.map((u) => {
      // --- LÓGICA DE ROL CORREGIDA ---
      const validRoles: UserRole[] = ["admin", "usuario", "analista"];
      const role = validRoles.includes(u.role) ? u.role : "usuario";
      // --- FIN DE CORRECCIÓN ---

      return {
        username: normalizeUsername(u.username || ""),
        nombre: u.nombre || "",
        apellido: u.apellido || "",
        passwordHash: u.passwordHash || "",
        allowedFields: Array.isArray(u.allowedFields)
          ? u.allowedFields.filter(isAllowedField)
          : DEFAULT_ALLOWED_FIELDS,
        role: role, // <-- CAMBIO APLICADO
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
        activeToken: u.activeToken || null,
      };
    });
  } catch {
    return [];
  }
};

export const writeUsersToDisk = async (users: StoredUser[]): Promise<void> =>
  fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

export const findUserByUsername = async (
  u: string
): Promise<StoredUser | undefined> =>
  (await readUsersFromDisk()).find((x) => x.username === normalizeUsername(u));

// --- NUEVA FUNCIÓN ---
/**
 * Lee la lista de DNIs restringidos desde r.json
 */
export const readRestrictionsFromDisk = async (): Promise<string[]> => {
  try {
    const raw = await fsPromises.readFile(RESTRICTIONS_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    
    // Asegurarse de que solo sean strings
    return data.filter(item => typeof item === 'string');
  } catch (error) {
    console.error("Error al leer r.json:", error);
    return []; // Devolver vacío en caso de error
  }
};
// --- FIN NUEVA FUNCIÓN ---