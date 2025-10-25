import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

// ────────────────────────────────────────────────
// INTERFACES Y TIPOS
// ────────────────────────────────────────────────

// --- RENIEC ---
export interface PersonaData {
  dni: string;
  ap_pat: string;
  ap_mat: string;
  nombres: string;
  fecha_nac: string;
  fch_inscripcion: string;
  fch_emision: string;
  fch_caducidad: string;
  ubigeo_nac: string;
  ubigeo_dir: string;
  direccion: string;
  sexo: string;
  est_civil: string;
  dig_ruc: string;
  madre: string;
  padre: string;
}

export type PersonaPayload = PersonaData | PersonaData[];

export interface ReniecApiResponse {
  success: boolean;
  data: PersonaPayload;
}

export type FilteredPersonaPayload =
  | Partial<PersonaData>
  | Array<Partial<PersonaData>>;

export interface ClientApiResponse {
  success: boolean;
  data: PersonaPayload | FilteredPersonaPayload;
}

export type AllowedField = keyof PersonaData;

// --- USUARIOS ---
export type UserRole = "admin" | "usuario" | "analista";

export interface StoredUser {
  username: string;
  nombre: string;
  apellido: string;
  passwordHash: string;
  allowedFields: AllowedField[];
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  activeToken?: string | null;
}

// --- AUTENTICACIÓN ---
export interface TokenPayload extends JwtPayload {
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}
