import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScreenState } from "@/components/ui/screen-state";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import { arr, bool, obj, str } from "@/lib/types";

export default function ProfileScreen() {
  const { colors, typography, spacing } = useTheme();
  const query = useQuery({
    queryKey: ["staff-me"],
    queryFn: () => teacherApi.me(),
  });

  const staff = obj(query.data?.staff);
  const user = obj(staff.user);
  const assignments = arr(staff.classAssignments);
  const name = str(user.name) || "Teacher";
  const error = query.error
    ? handleApiError(query.error, "Failed to load profile")
    : "";

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
          <Card>
            <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
              <Avatar name={name} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...typography.h2, color: colors.text }}>
                  {name}
                </Text>
                <Text style={{ ...typography.caption, color: colors.muted }}>
                  {str(user.email)}
                </Text>
                <Badge label={str(staff.staffType) || "TEACHER"} tone="primary" />
              </View>
            </View>
          </Card>

          <Card title="Staff details">
            <Row label="Employee code" value={str(staff.employeeCode)} />
            <Row label="Designation" value={str(staff.designation)} />
            <Row label="Department" value={str(staff.department)} />
            <Row label="Phone" value={str(user.phone) || str(staff.phone)} />
            <Row
              label="Expected in"
              value={str(staff.expectedPunchInTime)}
            />
            <Row
              label="Expected out"
              value={str(staff.expectedPunchOutTime)}
            />
            <Row
              label="Working"
              value={bool(staff.isCurrentlyWorking) ? "Yes" : "No"}
            />
          </Card>

          <Card title="Class assignments">
            {assignments.length === 0 ? (
              <Text style={{ color: colors.muted }}>No class assignments.</Text>
            ) : (
              assignments.map((a) => {
                const klass = obj(a.class);
                return (
                  <View
                    key={str(a.id) || str(klass.id)}
                    style={{
                      paddingVertical: spacing.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      gap: 4,
                    }}
                  >
                    <Text style={{ ...typography.title, color: colors.text }}>
                      {formatClassLabel(
                        str(klass.classLevel),
                        str(klass.section) || null,
                      )}
                    </Text>
                    <Badge
                      label={bool(a.isPrimary) ? "Class teacher" : "Subject teacher"}
                      tone={bool(a.isPrimary) ? "primary" : "default"}
                    />
                  </View>
                );
              })
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingVertical: 4,
      }}
    >
      <Text style={{ ...typography.caption, color: colors.muted }}>{label}</Text>
      <Text
        style={{
          ...typography.caption,
          color: colors.text,
          fontWeight: "600",
          flex: 1,
          textAlign: "right",
        }}
      >
        {value || "—"}
      </Text>
    </View>
  );
}
