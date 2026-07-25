export type ColorTokens = {
  bg: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  primaryMuted: string;
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  inputBg: string;
  overlay: string;
  skeleton: string;
};

export const lightColors: ColorTokens = {
  bg: "#F4F6F8",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  muted: "#64748B",
  primary: "#0F766E",
  primaryText: "#FFFFFF",
  primaryMuted: "#CCFBF1",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  success: "#15803D",
  successBg: "#DCFCE7",
  warning: "#B45309",
  warningBg: "#FEF3C7",
  inputBg: "#FFFFFF",
  overlay: "rgba(15, 23, 42, 0.45)",
  skeleton: "#E2E8F0",
};

export const darkColors: ColorTokens = {
  bg: "#0B1220",
  card: "#111827",
  border: "#1F2937",
  text: "#F8FAFC",
  muted: "#94A3B8",
  primary: "#2DD4BF",
  primaryText: "#042F2E",
  primaryMuted: "#134E4A",
  danger: "#F87171",
  dangerBg: "#450A0A",
  success: "#4ADE80",
  successBg: "#14532D",
  warning: "#FBBF24",
  warningBg: "#78350F",
  inputBg: "#0F172A",
  overlay: "rgba(0, 0, 0, 0.6)",
  skeleton: "#1F2937",
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  title: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
