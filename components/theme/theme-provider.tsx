import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import {
  darkColors,
  lightColors,
  radii,
  spacing,
  typography,
  type ColorTokens,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

const THEME_MODE_KEY = "schoolsuite_teacher_theme_mode";

type ThemeContextValue = {
  colors: ColorTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_MODE_KEY);
        if (
          !cancelled &&
          (stored === "system" || stored === "light" || stored === "dark")
        ) {
          setModeState(stored);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void SecureStore.setItemAsync(THEME_MODE_KEY, next);
  }, []);

  const resolved: ResolvedTheme =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: resolved === "dark" ? darkColors : lightColors,
      typography,
      spacing,
      radii,
      mode,
      resolved,
      setMode,
    }),
    [mode, resolved, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
