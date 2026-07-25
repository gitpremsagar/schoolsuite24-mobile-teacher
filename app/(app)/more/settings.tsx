import Constants from "expo-constants";
import { ScrollView, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ThemeMode } from "@/lib/theme";

export default function SettingsScreen() {
  const { colors, typography, spacing, mode, setMode, resolved } = useTheme();
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "1.0.0";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
    >
      <Card title="Appearance" subtitle={`Currently ${resolved}`}>
        <SegmentedControl
          options={[
            { label: "System", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ]}
          value={mode}
          onChange={(v) => setMode(v as ThemeMode)}
        />
      </Card>

      <Card title="About">
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.body, color: colors.text }}>
            SchoolSuite Teacher
          </Text>
          <Text style={{ ...typography.caption, color: colors.muted }}>
            Version {version}
          </Text>
          <Text style={{ ...typography.caption, color: colors.muted }}>
            For school teachers — attendance, classes, and punch.
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}
