import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Card } from "@/components/ui/card";
import { ScreenState } from "@/components/ui/screen-state";
import { StatTile } from "@/components/ui/stat-tile";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { num, obj, str } from "@/lib/types";

export default function SchoolScreen() {
  const { colors, typography, spacing } = useTheme();
  const query = useQuery({
    queryKey: ["school-me"],
    queryFn: () => teacherApi.school(),
  });

  const school = obj(query.data?.school);
  const counts = obj(school._count);
  const subscription = obj(school.subscription);
  const error = query.error
    ? handleApiError(query.error, "Failed to load school")
    : "";

  const address = [
    str(school.addressLine1),
    str(school.addressLine2),
    str(school.city),
    str(school.state),
    str(school.postalCode),
    str(school.country),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
        />
      }
    >
      {query.isLoading || error ? (
        <ScreenState loading={query.isLoading} error={error} />
      ) : (
        <>
          <Card
            title={str(school.name) || "School"}
            subtitle={address || undefined}
          >
            <Text style={{ ...typography.caption, color: colors.muted }}>
              Phone:{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {str(school.phone) || "—"}
              </Text>
            </Text>
            <Text style={{ ...typography.caption, color: colors.muted }}>
              Email:{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {str(school.email) || "—"}
              </Text>
            </Text>
            {school.establishedYear ? (
              <Text style={{ ...typography.caption, color: colors.muted }}>
                Established:{" "}
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {String(school.establishedYear)}
                </Text>
              </Text>
            ) : null}
          </Card>

          <Card title="Overview">
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <StatTile label="Students" value={num(counts.studentProfiles)} />
              <StatTile label="Staff" value={num(counts.staffProfiles)} />
              <StatTile label="Classes" value={num(counts.classes)} />
            </View>
          </Card>

          <Card title="Subscription">
            <Text style={{ ...typography.caption, color: colors.muted }}>
              Status:{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {str(subscription.status) || "—"}
              </Text>
            </Text>
            <Text style={{ ...typography.caption, color: colors.muted }}>
              Access:{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {subscription.isAccessEnabled === false ? "Disabled" : "Enabled"}
              </Text>
            </Text>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
