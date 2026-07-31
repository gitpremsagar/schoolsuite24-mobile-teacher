import { Stack } from "expo-router";
import { useTheme } from "@/components/theme/theme-provider";

export default function ExamsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Exams" }} />
      <Stack.Screen name="create" options={{ title: "New exam" }} />
      <Stack.Screen name="[examId]" options={{ headerShown: false }} />
    </Stack>
  );
}
