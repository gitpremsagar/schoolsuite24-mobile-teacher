import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { isHolidayKey } from "@/components/attendance/month-calendar";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { ScreenState } from "@/components/ui/screen-state";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import { dateKey, monthLabel } from "@/lib/dates";
import { arr, obj, str, type AttendanceStatus } from "@/lib/types";

type CellStatus = AttendanceStatus | null;

function cycle(current: CellStatus): CellStatus {
  if (current == null) return "PRESENT";
  if (current === "PRESENT") return "ABSENT";
  return null;
}

const CELL_W = 36;
const NAME_W = 120;

export default function MonthRegisterScreen() {
  const params = useLocalSearchParams<{ classId?: string }>();
  const { colors, typography, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const now = new Date();
  const [classId, setClassId] = useState(params.classId ?? "");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [marks, setMarks] = useState<
    Record<string, Record<string, CellStatus>>
  >({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (params.classId) setClassId(params.classId);
  }, [params.classId]);

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });
  const classes = arr(classesQuery.data?.classes);
  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        label: formatClassLabel(str(c.classLevel), str(c.section) || null),
        value: str(c.id),
      })),
    [classes],
  );

  useEffect(() => {
    if (!classId && classOptions.length > 0) setClassId(classOptions[0].value);
  }, [classId, classOptions]);

  const monthQuery = useQuery({
    queryKey: ["attendance-month", classId, year, month],
    queryFn: async () => {
      const res = await teacherApi.attendance.month(classId, year, month);
      const next: Record<string, Record<string, CellStatus>> = {};
      for (const s of arr(res.students)) {
        const id = str(s.studentProfileId);
        const days = obj(s.days);
        const row: Record<string, CellStatus> = {};
        for (const [day, status] of Object.entries(days)) {
          if (status === "PRESENT" || status === "ABSENT") {
            row[day] = status;
          } else {
            row[day] = null;
          }
        }
        next[id] = row;
      }
      setMarks(next);
      setDirty(false);
      return res;
    },
    enabled: !!classId,
  });

  const students = arr(monthQuery.data?.students);
  const days = monthQuery.data?.days ?? [];
  const holidayKeys = useMemo(
    () => new Set(monthQuery.data?.holidays ?? []),
    [monthQuery.data?.holidays],
  );

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
    setDirty(false);
  }

  function goCurrentMonth() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setDirty(false);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records: {
        studentProfileId: string;
        date: string;
        status: AttendanceStatus;
        classId: string;
      }[] = [];
      for (const s of students) {
        const id = str(s.studentProfileId);
        const row = marks[id] ?? {};
        const original = obj(s.days);
        for (const day of days) {
          const key = dateKey(year, month, day);
          if (isHolidayKey(key, holidayKeys)) continue;
          const current = row[String(day)] ?? null;
          const prev =
            original[String(day)] === "PRESENT" ||
            original[String(day)] === "ABSENT"
              ? (original[String(day)] as AttendanceStatus)
              : null;
          if (current && current !== prev) {
            records.push({
              studentProfileId: id,
              date: key,
              status: current,
              classId,
            });
          }
        }
      }
      if (records.length === 0) {
        throw new Error("No changes to save.");
      }
      return teacherApi.attendance.saveMonth({ classId, records });
    },
    onSuccess: async (data) => {
      setDirty(false);
      const skipped = data.skippedHolidays ?? 0;
      toast.success(
        skipped > 0
          ? `Saved ${data.count} mark(s). Skipped ${skipped} holiday(s).`
          : `Saved ${data.count} mark(s).`,
      );
      await qc.invalidateQueries({ queryKey: ["attendance-month"] });
      await qc.invalidateQueries({ queryKey: ["attendance-day"] });
      await qc.invalidateQueries({ queryKey: ["attendance-pending"] });
      await monthQuery.refetch();
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to save month register"));
    },
  });

  const loadError = monthQuery.error
    ? handleApiError(monthQuery.error, "Failed to load month register")
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <ChipSelect
          label="Class"
          options={classOptions}
          value={classId}
          onChange={(v) => {
            setClassId(v);
            setDirty(false);
          }}
        />
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
        <Text style={{ ...typography.caption, color: colors.muted }}>
          Tap a cell to cycle Blank → P → A. Holidays are locked.
        </Text>
      </View>

      {!classId ? (
        <Text style={{ paddingHorizontal: spacing.lg, color: colors.muted }}>
          Select a class.
        </Text>
      ) : monthQuery.isLoading || loadError || students.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ScreenState
            loading={monthQuery.isLoading}
            error={loadError}
            empty={!monthQuery.isLoading && !loadError && students.length === 0}
            emptyLabel="No students enrolled."
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: dirty ? 120 : spacing.xxl,
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={{ flexDirection: "row" }}>
                <View
                  style={{
                    width: NAME_W,
                    padding: spacing.sm,
                    backgroundColor: colors.card,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                    justifyContent: "flex-end",
                  }}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.muted,
                      fontWeight: "700",
                    }}
                  >
                    Student
                  </Text>
                </View>
                {days.map((day) => {
                  const key = dateKey(year, month, day);
                  const holiday = isHolidayKey(key, holidayKeys);
                  return (
                    <View
                      key={day}
                      style={{
                        width: CELL_W,
                        paddingVertical: spacing.sm,
                        alignItems: "center",
                        backgroundColor: holiday
                          ? colors.warningBg
                          : colors.card,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: holiday ? colors.warning : colors.muted,
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {students.map((s) => {
                const id = str(s.studentProfileId);
                const name = str(s.name) || "Student";
                return (
                  <View key={id} style={{ flexDirection: "row" }}>
                    <View
                      style={{
                        width: NAME_W,
                        padding: spacing.sm,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 12, fontWeight: "600", color: colors.text }}
                      >
                        {name}
                      </Text>
                      <Text
                        style={{ fontSize: 10, color: colors.muted }}
                      >
                        #{str(s.rollNumber) || "—"}
                      </Text>
                    </View>
                    {days.map((day) => {
                      const key = dateKey(year, month, day);
                      const holiday = isHolidayKey(key, holidayKeys);
                      const status = marks[id]?.[String(day)] ?? null;
                      let bg = colors.bg;
                      let fg = colors.muted;
                      let letter = "";
                      if (holiday) {
                        bg = colors.warningBg;
                        fg = colors.warning;
                        letter = "H";
                      } else if (status === "PRESENT") {
                        bg = colors.successBg;
                        fg = colors.success;
                        letter = "P";
                      } else if (status === "ABSENT") {
                        bg = colors.dangerBg;
                        fg = colors.danger;
                        letter = "A";
                      }
                      return (
                        <Pressable
                          key={`${id}-${day}`}
                          disabled={holiday}
                          onPress={() => {
                            setMarks((prev) => ({
                              ...prev,
                              [id]: {
                                ...(prev[id] ?? {}),
                                [String(day)]: cycle(status),
                              },
                            }));
                            setDirty(true);
                          }}
                          style={{
                            width: CELL_W,
                            height: 40,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: bg,
                            borderBottomWidth: 1,
                            borderRightWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ fontWeight: "800", fontSize: 12, color: fg }}>
                            {letter}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {dirty ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: spacing.lg,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Button
            title="Save month changes"
            loading={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      ) : null}
    </View>
  );
}
