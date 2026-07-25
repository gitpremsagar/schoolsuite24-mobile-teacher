import { Stack } from "expo-router";
import { useTheme } from "@/components/theme/theme-provider";

export default function ClassesLayout() {
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
      <Stack.Screen name="index" options={{ title: "My classes" }} />
      <Stack.Screen name="[classId]" options={{ title: "Class" }} />
    </Stack>
  );
}
