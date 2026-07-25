export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TEACHER"
  | "EMPLOYEE"
  | "STUDENT";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  schoolId: string | null;
  isActive: boolean;
};

export type AuthResponse = {
  accessToken: string;
  /** Required for mobile SecureStore refresh; also set as httpOnly cookie for web. */
  refreshToken?: string;
  user: PublicUser;
  school?: { id: string; name: string };
};

export type ApiError = {
  error: string;
  code?: string;
};

export type AttendanceStatus = "PRESENT" | "ABSENT";

export type Row = Record<string, unknown>;

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

export function obj(v: unknown): Row {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {};
}

export function arr(v: unknown): Row[] {
  return Array.isArray(v) ? (v as Row[]) : [];
}

export function bool(v: unknown): boolean {
  return v === true;
}
