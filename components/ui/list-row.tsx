import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
  leading,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  leading?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors, typography, spacing, radii } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...typography.title, color: colors.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...typography.caption, color: colors.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
        ) : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}
