import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/theme/theme-provider";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), 2800);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + spacing.sm,
          left: spacing.lg,
          right: spacing.lg,
          gap: spacing.sm,
          zIndex: 1000,
        }}
      >
        {toasts.map((t) => {
          const bg =
            t.tone === "success"
              ? colors.successBg
              : t.tone === "error"
                ? colors.dangerBg
                : colors.card;
          const fg =
            t.tone === "success"
              ? colors.success
              : t.tone === "error"
                ? colors.danger
                : colors.text;
          return (
            <Animated.View
              key={t.id}
              entering={FadeInUp}
              exiting={FadeOutUp}
            >
              <Pressable
                onPress={() => dismiss(t.id)}
                style={{
                  backgroundColor: bg,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                }}
              >
                <Text style={{ color: fg, fontWeight: "600", fontSize: 14 }}>
                  {t.message}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
