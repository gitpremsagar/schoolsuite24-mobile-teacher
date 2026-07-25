import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/components/theme/theme-provider";
import { formatDisplayDate } from "@/lib/dates";

export function DateStepper({
  value,
  onChange,
  onOpenCalendar,
}: {
  value: string;
  onChange: (next: string) => void;
  onOpenCalendar?: () => void;
}) {
  const { colors, typography, spacing, radii } = useTheme();

  function shift(delta: number) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    onChange(next);
  }

  function goToday() {
    const d = new Date();
    onChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => shift(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={onOpenCalendar}
          style={{
            flex: 1,
            minHeight: 40,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={{ ...typography.title, color: colors.text }}>
            {formatDisplayDate(value)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => shift(1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>
      <Pressable onPress={goToday}>
        <Text
          style={{
            textAlign: "center",
            color: colors.primary,
            fontWeight: "600",
            fontSize: 13,
          }}
        >
          Today
        </Text>
      </Pressable>
    </View>
  );
}
