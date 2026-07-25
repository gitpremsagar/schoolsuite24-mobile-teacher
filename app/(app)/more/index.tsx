import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";

export default function MoreScreen() {
  const { logout } = useAuth();
  const { colors, spacing } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.sm,
        paddingBottom: spacing.xxl,
      }}
    >
      <ListRow
        leading={<Ionicons name="time-outline" size={22} color={colors.primary} />}
        title="My punch"
        subtitle="Punch in and out for today"
        onPress={() => router.push("/(app)/more/punch")}
      />
      <ListRow
        leading={<Ionicons name="person-outline" size={22} color={colors.primary} />}
        title="Profile"
        subtitle="Your staff details"
        onPress={() => router.push("/(app)/more/profile")}
      />
      <ListRow
        leading={<Ionicons name="business-outline" size={22} color={colors.primary} />}
        title="School"
        subtitle="School information"
        onPress={() => router.push("/(app)/more/school")}
      />
      <ListRow
        leading={<Ionicons name="settings-outline" size={22} color={colors.primary} />}
        title="Settings"
        subtitle="Theme and preferences"
        onPress={() => router.push("/(app)/more/settings")}
      />
      <View style={{ marginTop: spacing.lg }}>
        <Button
          title="Sign out"
          variant="danger"
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        />
      </View>
    </ScrollView>
  );
}
