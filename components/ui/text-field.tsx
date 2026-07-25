import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, style, ...rest }: Props) {
  const { colors, typography, spacing, radii } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text style={{ ...typography.label, color: colors.text }}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          {
            minHeight: 44,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.inputBg,
            color: colors.text,
            fontSize: 15,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
}
