import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.bg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radii.sm,
              backgroundColor: active ? colors.card : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? colors.text : colors.muted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
