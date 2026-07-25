import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { ScreenState } from "@/components/ui/screen-state";
import { StatTile } from "@/components/ui/stat-tile";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import { parseDateKey, todayKey } from "@/lib/dates";
import { arr, bool, num, obj, str } from "@/lib/types";

export default function ClassDetailScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { colors, typography, spacing } = useTheme();
  const today = todayKey();
  const parsed = parseDateKey(today)!;

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });

  const klass = useMemo(
    () => arr(classesQuery.data?.classes).find((c) => str(c.id) === classId),
    [classesQuery.data, classId],
  );

  const dayQuery = useQuery({
    queryKey: ["attendance-day", classId, today],
    queryFn: () => teacherApi.attendance.day(classId!, today),
    enabled: !!classId,
  });

  const monthQuery = useQuery({
    queryKey: ["attendance-month", classId, parsed.year, parsed.month],
    queryFn: () =>
      teacherApi.attendance.month(classId!, parsed.year, parsed.month),
    enabled: !!classId,
  });

  const records = arr(dayQuery.data?.records);
  const monthStudents = arr(monthQuery.data?.students);

  const monthStats = useMemo(() => {
    const holidays = new Set(monthQuery.data?.holidays ?? []);
    const map = new Map<
      string,
      { present: number; absent: number; marked: number; pct: number }
    >();
    for (const s of monthStudents) {
      const days = obj(s.days);
      let present = 0;
      let absent = 0;
      let marked = 0;
      for (const [day, status] of Object.entries(days)) {
        const key = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
        if (holidays.has(key)) continue;
        if (status === "PRESENT") {
          present += 1;
          marked += 1;
        } else if (status === "ABSENT") {
          absent += 1;
          marked += 1;
        }
      }
      map.set(str(s.studentProfileId), {
        present,
        absent,
        marked,
        pct: marked === 0 ? 0 : Math.round((present / marked) * 100),
      });
    }
    return map;
  }, [monthStudents, monthQuery.data?.holidays, parsed.year, parsed.month]);

  const label = klass
    ? formatClassLabel(str(klass.classLevel), str(klass.section) || null)
    : "Class";

  const error =
    handleApiError(dayQuery.error, "") ||
    handleApiError(monthQuery.error, "") ||
    handleApiError(classesQuery.error, "");

  return (
    <>
      <Stack.Screen options={{ title: label }} />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.bg }}
        data={records}
        keyExtractor={(item) => str(item.studentProfileId)}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.sm,
          paddingBottom: spacing.xxl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={dayQuery.isRefetching || monthQuery.isRefetching}
            onRefresh={() => {
              void dayQuery.refetch();
              void monthQuery.refetch();
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                {bool(klass?.isPrimary) ? (
                  <Badge label="Class teacher" tone="primary" />
                ) : (
                  <Badge label="Subject teacher" />
                )}
                <Badge
                  label={str(obj(klass?.academicYear).name) || "Year"}
                  tone="default"
                />
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <StatTile label="Students" value={records.length} />
                <StatTile
                  label="Present today"
                  value={num(obj(dayQuery.data?.summary).present)}
                  tone="success"
                />
                <StatTile
                  label="Absent today"
                  value={num(obj(dayQuery.data?.summary).absent)}
                  tone="danger"
                />
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Take attendance"
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/attendance",
                        params: { classId: classId!, date: today },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Month register"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/attendance/month",
                        params: { classId: classId! },
                      })
                    }
                  />
                </View>
              </View>
            </Card>
            <Text style={{ ...typography.title, color: colors.text }}>
              Roster
            </Text>
            {dayQuery.isLoading || error ? (
              <ScreenState
                loading={dayQuery.isLoading}
                error={error}
                empty={!dayQuery.isLoading && !error && records.length === 0}
                emptyLabel="No students enrolled."
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const student = obj(item.student);
          const user = obj(student.user);
          const name = str(user.name) || "Student";
          const id = str(item.studentProfileId);
          const stats = monthStats.get(id);
          return (
            <ListRow
              leading={<Avatar name={name} />}
              title={name}
              subtitle={`Roll ${str(item.rollNumber) || "—"} · ${
                stats
                  ? `${stats.pct}% this month (${stats.present}P/${stats.absent}A)`
                  : "—"
              }`}
              onPress={() => router.push(`/(app)/students/${id}`)}
            />
          );
        }}
        ListEmptyComponent={
          !dayQuery.isLoading && !error ? (
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              No students enrolled in this class.
            </Text>
          ) : null
        }
      />
    </>
  );
}
