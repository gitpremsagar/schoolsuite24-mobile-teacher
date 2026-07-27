const raw = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

/** Hosted backend base URL (no trailing slash). Never use localhost in production builds. */
// export const API_URL = raw.replace(/\/$/, "");
export const API_URL = "https://api.schoolsuite24.com";

export function assertApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Add it to mobile-teacher/.env (hosted API base URL).",
    );
  }
  return API_URL;
}
