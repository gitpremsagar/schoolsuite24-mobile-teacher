import { Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

type Option = { label: string; value: string };

export function ChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors, typography, spacing, radii } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text style={{ ...typography.label, color: colors.text }}>{label}</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChange(opt.value)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.full,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: active ? colors.primaryText : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
