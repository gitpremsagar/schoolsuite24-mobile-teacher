import { Ionicons } from "@expo/vector-icons";
import { TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

export function SearchField({ style, ...rest }: TextInputProps) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        minHeight: 44,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.inputBg,
      }}
    >
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          {
            flex: 1,
            color: colors.text,
            fontSize: 15,
            paddingVertical: spacing.sm,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
