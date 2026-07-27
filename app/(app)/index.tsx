import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/components/auth/auth-provider";
import { isHolidayKey } from "@/components/attendance/month-calendar";
import { useTheme } from "@/components/theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { ScreenState } from "@/components/ui/screen-state";
import { StatTile } from "@/components/ui/stat-tile";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import {
  formatDurationMs,
  formatTime,
  parseDateKey,
  todayKey,
} from "@/lib/dates";
import { arr, num, obj, str } from "@/lib/types";

export default function TodayScreen() {
  const { user } = useAuth();
  const { colors, typography, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const today = todayKey();
  const parsed = parseDateKey(today)!;
  const [now, setNow] = useState(() => Date.now());
  const [punchingOut, setPunchingOut] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const staffQuery = useQuery({
    queryKey: ["staff-me"],
    queryFn: () => teacherApi.me(),
  });

  const punchQuery = useQuery({
    queryKey: ["punch-today"],
    queryFn: () => teacherApi.punch.today(),
  });

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });

  const holidaysQuery = useQuery({
    queryKey: ["attendance-holidays", parsed.year, parsed.month],
    queryFn: () => teacherApi.attendance.month(null, parsed.year, parsed.month),
  });

  const classes = arr(classesQuery.data?.classes);
  const holidayKeys = useMemo(
    () => new Set(holidaysQuery.data?.holidays ?? []),
    [holidaysQuery.data?.holidays],
  );
  const isHoliday = isHolidayKey(today, holidayKeys);

  const pendingQueries = useQueries({
    queries: classes.map((c) => ({
      queryKey: ["attendance-pending", str(c.id), today],
      queryFn: () => teacherApi.attendance.day(str(c.id), today),
      enabled: !!str(c.id) && !isHoliday,
    })),
  });

  const staff = obj(staffQuery.data?.staff);
  const staffUser = obj(staff.user);
  const name = str(staffUser.name) || str(user?.name) || "Teacher";
  const attendance = obj(punchQuery.data?.attendance);
  const punchInAt = str(attendance.punchInAt) || null;
  const punchOutAt = str(attendance.punchOutAt) || null;
  const expectedIn = str(staff.expectedPunchInTime) || null;
  const expectedOut = str(staff.expectedPunchOutTime) || null;

  let punchStatus: "not-started" | "working" | "done" = "not-started";
  if (punchInAt && punchOutAt) punchStatus = "done";
  else if (punchInAt) punchStatus = "working";

  const workedMs = punchInAt
    ? (punchOutAt ? new Date(punchOutAt).getTime() : now) -
      new Date(punchInAt).getTime()
    : 0;

  async function refreshAll() {
    await Promise.all([
      staffQuery.refetch(),
      punchQuery.refetch(),
      classesQuery.refetch(),
      holidaysQuery.refetch(),
      ...pendingQueries.map((q) => q.refetch()),
    ]);
  }

  async function doPunchOut() {
    setPunchingOut(true);
    try {
      await teacherApi.punch.out();
      await qc.invalidateQueries({ queryKey: ["punch-today"] });
      toast.success("Punched out");
    } catch (err) {
      toast.error(handleApiError(err, "Punch failed"));
    } finally {
      setPunchingOut(false);
    }
  }

  const loadError =
    handleApiError(staffQuery.error, "") ||
    handleApiError(classesQuery.error, "") ||
    handleApiError(punchQuery.error, "");

  const pendingRows = classes.map((c, i) => {
    const q = pendingQueries[i];
    const summary = obj(q?.data?.summary);
    const unmarked = num(summary.unmarked);
    const present = num(summary.present);
    const absent = num(summary.absent);
    const loaded = !!q?.data;
    const pending = isHoliday ? false : loaded ? unmarked > 0 : true;
    return {
      class: c,
      pending,
      unmarked,
      present,
      absent,
      loading: q?.isLoading,
    };
  });

  const pendingCount = pendingRows.filter((r) => r.pending).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refreshAll} />
      }
    >
      <View style={{ gap: 4 }}>
        <Text style={{ ...typography.caption, color: colors.muted }}>
          Good day
        </Text>
        <Text style={{ ...typography.h1, color: colors.text }}>{name}</Text>
        {str(staff.designation) ? (
          <Text style={{ ...typography.caption, color: colors.muted }}>
            {str(staff.designation)}
            {str(staff.department) ? ` · ${str(staff.department)}` : ""}
          </Text>
        ) : null}
      </View>

      {loadError ? (
        <Text style={{ color: colors.danger }}>{loadError}</Text>
      ) : null}

      {isHoliday ? (
        <View
          style={{
            backgroundColor: colors.warningBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.warning,
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.warning, fontWeight: "700" }}>
            Today is a holiday. Student attendance cannot be marked.
          </Text>
        </View>
      ) : null}

      <Card title="My punch">
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatTile
            label="Status"
            value={
              punchStatus === "done"
                ? "Done"
                : punchStatus === "working"
                  ? "Working"
                  : "Not started"
            }
            tone={
              punchStatus === "done"
                ? "success"
                : punchStatus === "working"
                  ? "primary"
                  : "default"
            }
          />
          <StatTile
            label="Worked"
            value={punchInAt ? formatDurationMs(workedMs) : "—"}
          />
        </View>
        <View style={{ gap: 4, marginTop: spacing.sm }}>
          <Text style={{ ...typography.caption, color: colors.muted }}>
            In: {formatTime(punchInAt)}
            {expectedIn ? ` (expected ${expectedIn})` : ""}
          </Text>
          <Text style={{ ...typography.caption, color: colors.muted }}>
            Out: {formatTime(punchOutAt)}
            {expectedOut ? ` (expected ${expectedOut})` : ""}
          </Text>
        </View>
        {!punchInAt ? (
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Scan QR to punch in"
              onPress={() => router.push("/(app)/qr-punch")}
            />
          </View>
        ) : (
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Punch out"
              disabled={!!punchOutAt}
              loading={punchingOut}
              onPress={() => doPunchOut()}
            />
          </View>
        )}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ ...typography.title, color: colors.text }}>
            Attendance today
          </Text>
          {!isHoliday && classes.length > 0 ? (
            <Badge
              label={
                pendingCount === 0
                  ? "All done"
                  : `${pendingCount} pending`
              }
              tone={pendingCount === 0 ? "success" : "warning"}
            />
          ) : null}
        </View>

        {classesQuery.isLoading ? (
          <ScreenState loading />
        ) : classes.length === 0 ? (
          <EmptyState
            icon="school-outline"
            title="No classes assigned"
            message="Ask your school admin to assign you as a class teacher."
          />
        ) : (
          pendingRows.map((row) => {
            const c = row.class;
            const label = formatClassLabel(
              str(c.classLevel),
              str(c.section) || null,
            );
            return (
              <ListRow
                key={str(c.id)}
                title={label}
                subtitle={
                  isHoliday
                    ? "Holiday"
                    : row.loading
                      ? "Loading…"
                      : row.pending
                        ? `${row.unmarked} unmarked · ${row.present}P / ${row.absent}A`
                        : `${row.present} present · ${row.absent} absent`
                }
                right={
                  <Badge
                    label={
                      isHoliday
                        ? "Holiday"
                        : row.pending
                          ? "Pending"
                          : "Done"
                    }
                    tone={
                      isHoliday
                        ? "warning"
                        : row.pending
                          ? "warning"
                          : "success"
                    }
                  />
                }
                onPress={() =>
                  router.push({
                    pathname: "/(app)/attendance",
                    params: { classId: str(c.id), date: today },
                  })
                }
              />
            );
          })
        )}
      </View>

      <Pressable
        onPress={() => router.push("/(app)/attendance/month")}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card
          title="Month register"
          subtitle="Backfill or review attendance for the full month."
        />
      </Pressable>
    </ScrollView>
  );
}
