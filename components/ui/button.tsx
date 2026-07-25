import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: Variant;
};

export function Button({
  title,
  loading,
  variant = "primary",
  disabled,
  style,
  ...rest
}: Props) {
  const { colors, spacing, radii } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.dangerBg
        : variant === "ghost"
          ? "transparent"
          : colors.card;
  const borderColor =
    variant === "secondary"
      ? colors.border
      : variant === "danger"
        ? colors.danger
        : "transparent";
  const textColor =
    variant === "primary"
      ? colors.primaryText
      : variant === "danger"
        ? colors.danger
        : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        {
          minHeight: 44,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: variant === "secondary" || variant === "danger" ? 1 : 0,
          borderColor,
          opacity: state.pressed && !isDisabled ? 0.85 : isDisabled ? 0.5 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" || variant === "ghost"
              ? colors.primary
              : textColor
          }
        />
      ) : (
        <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
