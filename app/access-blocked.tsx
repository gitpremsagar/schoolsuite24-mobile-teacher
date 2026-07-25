import { router } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AccessBlockedScreen() {
  const { logout } = useAuth();
  const { colors, typography, spacing } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: spacing.xl,
        justifyContent: "center",
        gap: spacing.lg,
      }}
    >
      <Card
        title="School access disabled"
        subtitle="Your school's subscription is inactive. Ask your school admin to renew access."
      >
        <Text style={{ ...typography.caption, color: colors.muted }}>
          Teachers cannot renew billing from this app.
        </Text>
      </Card>
      <Button
        title="Sign out"
        variant="secondary"
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      />
    </View>
  );
}
