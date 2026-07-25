import { Text, View, type ViewProps } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

type Props = ViewProps & {
  title?: string;
  subtitle?: string;
};

export function Card({ title, subtitle, children, style, ...rest }: Props) {
  const { colors, typography, spacing, radii } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
      {...rest}
    >
      {title ? (
        <Text style={{ ...typography.title, color: colors.text }}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={{ ...typography.caption, color: colors.muted }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
