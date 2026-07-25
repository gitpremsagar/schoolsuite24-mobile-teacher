import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon = "folder-open-outline",
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <Ionicons name={icon} size={40} color={colors.muted} />
      <Text style={{ ...typography.title, color: colors.text, textAlign: "center" }}>
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            ...typography.caption,
            color: colors.muted,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm, alignSelf: "stretch" }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
