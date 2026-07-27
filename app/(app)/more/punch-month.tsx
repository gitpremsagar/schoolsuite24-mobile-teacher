import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  isHolidayKey,
  MonthCalendar,
  type CalendarDayStatus,
} from "@/components/attendance/month-calendar";
import { useTheme } from "@/components/theme/theme-provider";
import { Card } from "@/components/ui/card";
import { ScreenState } from "@/components/ui/screen-state";
import { StatTile } from "@/components/ui/stat-tile";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { dateKey, formatTime, monthLabel } from "@/lib/dates";

export default function MyPunchMonthScreen() {
  const { colors, typography, spacing, radii } = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthQuery = useQuery({
    queryKey: ["punch-month", year, month],
    queryFn: () => teacherApi.punch.month(year, month),
  });

  const holidayKeys = useMemo(
    () => new Set(monthQuery.data?.holidays ?? []),
    [monthQuery.data?.holidays],
  );

  const staffDays = useMemo(
    () => monthQuery.data?.staff?.days ?? {},
    [monthQuery.data?.staff?.days],
  );
  const days = useMemo(
    () => monthQuery.data?.days ?? [],
    [monthQuery.data?.days],
  );

  const marks = useMemo(() => {
    const next: Record<string, CalendarDayStatus> = {};
    for (const day of days) {
      const cell = staffDays[String(day)];
      if (cell?.status === "PRESENT" || cell?.status === "ABSENT") {
        next[String(day)] = cell.status;
      } else {
        next[String(day)] = null;
      }
    }
    return next;
  }, [days, staffDays]);

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const day of days) {
      const key = dateKey(year, month, day);
      if (isHolidayKey(key, holidayKeys)) continue;
      const status = marks[String(day)];
      if (status === "PRESENT") present += 1;
      else if (status === "ABSENT") absent += 1;
      else unmarked += 1;
    }
    return { present, absent, unmarked };
  }, [days, year, month, holidayKeys, marks]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelectedDay(null);
  }

  function goCurrentMonth() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDay(null);
  }

  const selectedKey =
    selectedDay != null ? dateKey(year, month, selectedDay) : null;
  const selectedCell =
    selectedDay != null ? staffDays[String(selectedDay)] : null;
  const selectedHoliday =
    selectedKey != null ? isHolidayKey(selectedKey, holidayKeys) : false;

  const error = monthQuery.error
    ? handleApiError(monthQuery.error, "Failed to load monthly attendance")
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
          refreshing={monthQuery.isRefetching}
          onRefresh={() => monthQuery.refetch()}
        />
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable onPress={() => shiftMonth(-1)}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>‹ Prev</Text>
        </Pressable>
        <Pressable onPress={goCurrentMonth}>
          <Text style={{ ...typography.title, color: colors.text }}>
            {monthLabel(year, month)}
          </Text>
        </Pressable>
        <Pressable onPress={() => shiftMonth(1)}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Next ›</Text>
        </Pressable>
      </View>

      {monthQuery.isLoading || error ? (
        <ScreenState loading={monthQuery.isLoading} error={error} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatTile label="Present" value={summary.present} tone="success" />
            <StatTile label="Absent" value={summary.absent} tone="danger" />
            <StatTile label="Blank" value={summary.unmarked} tone="warning" />
          </View>

          <MonthCalendar
            year={year}
            month={month}
            marks={marks}
            holidayKeys={holidayKeys}
            selectedDay={selectedDay}
            onPressDay={(day) =>
              setSelectedDay((prev) => (prev === day ? null : day))
            }
          />

          {selectedDay != null ? (
            <Card title={selectedKey ?? `Day ${selectedDay}`}>
              {selectedHoliday ? (
                <Text style={{ color: colors.warning, fontWeight: "600" }}>
                  Holiday — no punch expected.
                </Text>
              ) : selectedCell ? (
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ ...typography.body, color: colors.text }}>
                    Status:{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {selectedCell.status}
                    </Text>
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.muted }}>
                    Punch in: {formatTime(selectedCell.punchInAt)}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.muted }}>
                    Punch out: {formatTime(selectedCell.punchOutAt)}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: colors.muted }}>
                  No attendance recorded for this day.
                </Text>
              )}
            </Card>
          ) : (
            <Text style={{ ...typography.caption, color: colors.muted }}>
              Tap a day to see punch in/out times.
            </Text>
          )}

          <Card title="Day register" subtitle="Working days this month">
            <View style={{ gap: spacing.sm }}>
              {days.map((day) => {
                const key = dateKey(year, month, day);
                const holiday = isHolidayKey(key, holidayKeys);
                const cell = staffDays[String(day)];
                const status = cell?.status ?? null;
                let bg = colors.bg;
                let border = colors.border;
                let label = "Blank";
                let tone = colors.muted;
                if (holiday) {
                  bg = colors.warningBg;
                  border = colors.warning;
                  label = "Holiday";
                  tone = colors.warning;
                } else if (status === "PRESENT") {
                  bg = colors.successBg;
                  border = colors.success;
                  label = "Present";
                  tone = colors.success;
                } else if (status === "ABSENT") {
                  bg = colors.dangerBg;
                  border = colors.danger;
                  label = "Absent";
                  tone = colors.danger;
                }

                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedDay(day)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.md,
                      padding: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor:
                        selectedDay === day ? colors.primary : border,
                      backgroundColor: bg,
                    }}
                  >
                    <View style={{ width: 36 }}>
                      <Text
                        style={{
                          fontWeight: "800",
                          fontSize: 16,
                          color: colors.text,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontWeight: "700", color: tone }}>
                        {label}
                      </Text>
                      {!holiday && cell ? (
                        <Text
                          style={{ ...typography.caption, color: colors.muted }}
                        >
                          {formatTime(cell.punchInAt)} –{" "}
                          {formatTime(cell.punchOutAt)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Text style={{ ...typography.caption, color: colors.muted }}>
            This register is read-only. Punch in by scanning the school QR, or
            ask an admin to correct past days.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
