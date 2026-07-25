import { Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

type Tone = "default" | "primary" | "success" | "danger" | "warning";

export function Badge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: Tone;
}) {
  const { colors, radii, spacing } = useTheme();
  const bg =
    tone === "primary"
      ? colors.primaryMuted
      : tone === "success"
        ? colors.successBg
        : tone === "danger"
          ? colors.dangerBg
          : tone === "warning"
            ? colors.warningBg
            : colors.bg;
  const fg =
    tone === "primary"
      ? colors.primary
      : tone === "success"
        ? colors.success
        : tone === "danger"
          ? colors.danger
          : tone === "warning"
            ? colors.warning
            : colors.muted;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: radii.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: fg }}>{label}</Text>
    </View>
  );
}
