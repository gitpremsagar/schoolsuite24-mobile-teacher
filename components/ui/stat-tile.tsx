import { Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger" | "warning" | "primary";
}) {
  const { colors, typography, spacing, radii } = useTheme();
  const valueColor =
    tone === "success"
      ? colors.success
      : tone === "danger"
        ? colors.danger
        : tone === "warning"
          ? colors.warning
          : tone === "primary"
            ? colors.primary
            : colors.text;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 2,
        minWidth: 90,
      }}
    >
      <Text style={{ ...typography.caption, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: "700", color: valueColor }}>
        {value}
      </Text>
    </View>
  );
}
