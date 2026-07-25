import { Stack } from "expo-router";
import { useTheme } from "@/components/theme/theme-provider";

export default function StudentsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Student" }} />
    </Stack>
  );
}
