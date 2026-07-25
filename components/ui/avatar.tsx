import { Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

export function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primaryMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.primary,
          fontWeight: "700",
          fontSize: size * 0.36,
        }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}
