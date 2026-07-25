import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenState } from "@/components/ui/screen-state";
import { StatTile } from "@/components/ui/stat-tile";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import { parseDateKey, todayKey } from "@/lib/dates";
import { arr, obj, str } from "@/lib/types";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const today = todayKey();
  const parsed = parseDateKey(today)!;

  const studentQuery = useQuery({
    queryKey: ["student", id],
    queryFn: () => teacherApi.student(id!),
    enabled: !!id,
  });

  const student = obj(studentQuery.data?.student);
  const user = obj(student.user);
  const enrollments = arr(student.enrollments);
  const activeEnrollment = enrollments.find((e) => e.isActive !== false) ?? enrollments[0];
  const activeClass = obj(activeEnrollment?.class);
  const classId = str(activeClass.id) || str(activeEnrollment?.classId);

  const monthQuery = useQuery({
    queryKey: ["attendance-month", classId, parsed.year, parsed.month, "student", id],
    queryFn: () =>
      teacherApi.attendance.month(classId, parsed.year, parsed.month),
    enabled: !!classId,
  });

  const monthStats = useMemo(() => {
    const students = arr(monthQuery.data?.students);
    const row = students.find((s) => str(s.studentProfileId) === id);
    if (!row) return { present: 0, absent: 0, pct: 0 };
    const holidays = new Set(monthQuery.data?.holidays ?? []);
    const days = obj(row.days);
    let present = 0;
    let absent = 0;
    for (const [day, status] of Object.entries(days)) {
      const key = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
      if (holidays.has(key)) continue;
      if (status === "PRESENT") present += 1;
      if (status === "ABSENT") absent += 1;
    }
    const marked = present + absent;
    return {
      present,
      absent,
      pct: marked === 0 ? 0 : Math.round((present / marked) * 100),
    };
  }, [monthQuery.data, id, parsed.year, parsed.month]);

  const name = str(user.name) || "Student";
  const guardianPhone = str(student.guardianPhone);
  const guardianEmail = str(student.guardianEmail);
  const error = studentQuery.error
    ? handleApiError(studentQuery.error, "Failed to load student")
    : "";

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={studentQuery.isRefetching}
            onRefresh={() => {
              void studentQuery.refetch();
              void monthQuery.refetch();
            }}
          />
        }
      >
        {studentQuery.isLoading || error ? (
          <ScreenState loading={studentQuery.isLoading} error={error} />
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
                  <Text style={{ ...typography.caption, color: colors.muted }}>
                    Admission {str(student.admissionNumber) || "—"}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <StatTile
                label="This month"
                value={`${monthStats.pct}%`}
                tone="primary"
              />
              <StatTile
                label="Present"
                value={monthStats.present}
                tone="success"
              />
              <StatTile
                label="Absent"
                value={monthStats.absent}
                tone="danger"
              />
            </View>

            <Card title="Guardian">
              <Text style={{ ...typography.body, color: colors.text }}>
                {str(student.guardianName) ||
                  str(student.fatherName) ||
                  str(student.motherName) ||
                  "—"}
              </Text>
              <Text style={{ ...typography.caption, color: colors.muted }}>
                Phone: {guardianPhone || "—"}
              </Text>
              <Text style={{ ...typography.caption, color: colors.muted }}>
                Email: {guardianEmail || "—"}
              </Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Call"
                    variant="secondary"
                    disabled={!guardianPhone}
                    onPress={() => Linking.openURL(`tel:${guardianPhone}`)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Email"
                    variant="secondary"
                    disabled={!guardianEmail}
                    onPress={() => Linking.openURL(`mailto:${guardianEmail}`)}
                  />
                </View>
              </View>
            </Card>

            <Card title="Enrollments">
              {enrollments.length === 0 ? (
                <Text style={{ color: colors.muted }}>No enrollments.</Text>
              ) : (
                enrollments.map((e) => {
                  const klass = obj(e.class);
                  const year = obj(e.academicYear);
                  return (
                    <View
                      key={str(e.id)}
                      style={{
                        paddingVertical: spacing.sm,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        gap: 2,
                      }}
                    >
                      <Text style={{ ...typography.title, color: colors.text }}>
                        {formatClassLabel(
                          str(klass.classLevel),
                          str(klass.section) || null,
                        )}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.muted }}>
                        {str(year.name) || "Year"} · Roll{" "}
                        {str(e.rollNumber) || "—"}
                        {e.isActive === false ? " · Inactive" : ""}
                      </Text>
                    </View>
                  );
                })
              )}
            </Card>

            <Card title="Details">
              <DetailRow label="Gender" value={str(student.gender)} />
              <DetailRow label="Blood group" value={str(student.bloodGroup)} />
              <DetailRow
                label="Father"
                value={str(student.fatherName)}
              />
              <DetailRow
                label="Mother"
                value={str(student.motherName)}
              />
              <DetailRow
                label="Address"
                value={
                  str(student.currentAddress) ||
                  str(student.permanentAddress) ||
                  str(student.address)
                }
              />
            </Card>
          </>
        )}
      </ScrollView>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
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
