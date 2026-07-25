import { Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";

export function ScreenState({
  loading,
  error,
  empty,
  emptyLabel = "Nothing here yet.",
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyLabel?: string;
}) {
  const { colors, spacing } = useTheme();

  if (loading) {
    return (
      <View style={{ gap: spacing.sm, paddingVertical: spacing.md }}>
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </View>
    );
  }
  if (error) {
    return (
      <View
        style={{
          paddingVertical: spacing.xl,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.danger, fontSize: 14, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }
  if (empty) {
    return (
      <View
        style={{
          paddingVertical: spacing.xl,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
          {emptyLabel}
        </Text>
      </View>
    );
  }
  return null;
}
