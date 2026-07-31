import { Stack } from "expo-router";
import { useTheme } from "@/components/theme/theme-provider";

export default function ExamIdLayout() {
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
      <Stack.Screen name="index" options={{ title: "Examination" }} />
      <Stack.Screen name="edit" options={{ title: "Edit exam" }} />
    </Stack>
  );
}
