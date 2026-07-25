import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  isHolidayKey,
  MonthCalendar,
} from "@/components/attendance/month-calendar";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { DateStepper } from "@/components/ui/date-stepper";
import { ScreenState } from "@/components/ui/screen-state";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { StatTile } from "@/components/ui/stat-tile";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import { parseDateKey, todayKey } from "@/lib/dates";
import { arr, obj, str, type AttendanceStatus } from "@/lib/types";

type Status = AttendanceStatus | null;

function cycleStatus(current: Status): Status {
  if (current == null) return "PRESENT";
  if (current === "PRESENT") return "ABSENT";
  return null;
}

function statusLabel(s: Status) {
  if (s === "PRESENT") return "Present";
  if (s === "ABSENT") return "Absent";
  return "Blank";
}

export default function TakeAttendanceScreen() {
  const params = useLocalSearchParams<{ classId?: string; date?: string }>();
  const { colors, typography, spacing, radii } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [classId, setClassId] = useState(params.classId ?? "");
  const [date, setDate] = useState(params.date ?? todayKey());
  const [dayMarks, setDayMarks] = useState<Record<string, Status>>({});
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (params.classId) setClassId(params.classId);
  }, [params.classId]);

  useEffect(() => {
    if (params.date) setDate(params.date);
  }, [params.date]);

  const parsed = parseDateKey(date) ?? parseDateKey(todayKey())!;

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
    if (!classId && classOptions.length > 0) {
      setClassId(classOptions[0].value);
    }
  }, [classId, classOptions]);

  const holidaysQuery = useQuery({
    queryKey: ["attendance-holidays", parsed.year, parsed.month, classId],
    queryFn: () =>
      teacherApi.attendance.month(classId || null, parsed.year, parsed.month),
    enabled: !!parsed,
  });

  const holidayKeys = useMemo(
    () => new Set(holidaysQuery.data?.holidays ?? []),
    [holidaysQuery.data?.holidays],
  );
  const isHoliday = isHolidayKey(date, holidayKeys);

  const dayQuery = useQuery({
    queryKey: ["attendance-day", classId, date],
    queryFn: async () => {
      const res = await teacherApi.attendance.day(classId, date);
      const list = arr(res.records);
      const initial: Record<string, Status> = {};
      for (const r of list) {
        const spid = str(r.studentProfileId);
        const att = obj(r.attendance);
        if (att.status === "PRESENT" || att.status === "ABSENT") {
          initial[spid] = att.status as AttendanceStatus;
        } else {
          initial[spid] = null;
        }
      }
      setDayMarks(initial);
      setDirty(false);
      return res;
    },
    enabled: !!classId && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isHoliday,
  });

  const records = arr(dayQuery.data?.records);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const student = obj(r.student);
      const name = str(obj(student.user).name).toLowerCase();
      const roll = str(r.rollNumber).toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [records, search]);

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const r of records) {
      const s = dayMarks[str(r.studentProfileId)] ?? null;
      if (s === "PRESENT") present += 1;
      else if (s === "ABSENT") absent += 1;
      else unmarked += 1;
    }
    return { present, absent, unmarked };
  }, [records, dayMarks]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = records
        .map((r) => str(r.studentProfileId))
        .filter((id) => dayMarks[id] === "PRESENT" || dayMarks[id] === "ABSENT")
        .map((id) => ({
          studentProfileId: id,
          status: dayMarks[id] as AttendanceStatus,
        }));
      if (payload.length === 0) {
        throw new Error("Mark at least one student.");
      }
      return teacherApi.attendance.saveDay({
        classId,
        date,
        records: payload,
      });
    },
    onSuccess: async (_data, _vars, _ctx) => {
      setDirty(false);
      const count = records.filter(
        (r) =>
          dayMarks[str(r.studentProfileId)] === "PRESENT" ||
          dayMarks[str(r.studentProfileId)] === "ABSENT",
      ).length;
      toast.success(`Saved attendance for ${count} student(s).`);
      await qc.invalidateQueries({ queryKey: ["attendance-day"] });
      await qc.invalidateQueries({ queryKey: ["attendance-month"] });
      await qc.invalidateQueries({ queryKey: ["attendance-pending"] });
      await dayQuery.refetch();
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to save attendance"));
    },
  });

  function setAll(status: AttendanceStatus) {
    if (isHoliday) return;
    const next: Record<string, Status> = {};
    for (const r of records) next[str(r.studentProfileId)] = status;
    setDayMarks(next);
    setDirty(true);
  }

  function resetMarks() {
    const initial: Record<string, Status> = {};
    for (const r of records) {
      const att = obj(r.attendance);
      if (att.status === "PRESENT" || att.status === "ABSENT") {
        initial[str(r.studentProfileId)] = att.status as AttendanceStatus;
      } else {
        initial[str(r.studentProfileId)] = null;
      }
    }
    setDayMarks(initial);
    setDirty(false);
  }

  function toggleStudent(id: string) {
    if (isHoliday) return;
    setDayMarks((prev) => ({
      ...prev,
      [id]: cycleStatus(prev[id] ?? null),
    }));
    setDirty(true);
  }

  const loadError = dayQuery.error
    ? handleApiError(dayQuery.error, "Failed to load class attendance")
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: dirty ? 120 : spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ChipSelect
          label="Class"
          options={classOptions}
          value={classId}
          onChange={(v) => {
            setClassId(v);
            setDirty(false);
          }}
        />
        <DateStepper
          value={date}
          onChange={(d) => {
            setDate(d);
            setDirty(false);
          }}
          onOpenCalendar={() => setCalendarOpen(true)}
        />

        {!classId ? (
          <Text style={{ color: colors.muted }}>
            Select a class to take attendance.
          </Text>
        ) : null}

        {classId && isHoliday ? (
          <View
            style={{
              backgroundColor: colors.warningBg,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.warning,
              padding: spacing.md,
            }}
          >
            <Text style={{ color: colors.warning, fontWeight: "700" }}>
              {date} is a holiday. Attendance cannot be marked.
            </Text>
          </View>
        ) : null}

        {classId && !isHoliday ? (
          <>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <StatTile
                label="Present"
                value={summary.present}
                tone="success"
              />
              <StatTile
                label="Absent"
                value={summary.absent}
                tone="danger"
              />
              <StatTile
                label="Unmarked"
                value={summary.unmarked}
                tone="warning"
              />
            </View>

            <SearchField
              placeholder="Search students"
              value={search}
              onChangeText={setSearch}
            />

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              <Button
                title="All present"
                variant="secondary"
                onPress={() => setAll("PRESENT")}
              />
              <Button
                title="All absent"
                variant="secondary"
                onPress={() => setAll("ABSENT")}
              />
              <Button title="Reset" variant="ghost" onPress={resetMarks} />
            </View>

            <ScreenState
              loading={dayQuery.isLoading}
              error={loadError}
              empty={!dayQuery.isLoading && !loadError && records.length === 0}
              emptyLabel="No students enrolled in this class."
            />

            {!dayQuery.isLoading && !loadError
              ? filtered.map((r) => {
                  const id = str(r.studentProfileId);
                  const student = obj(r.student);
                  const name =
                    str(obj(student.user).name) || str(r.name) || "Student";
                  const status = dayMarks[id] ?? null;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleStudent(id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor:
                          status === "PRESENT"
                            ? colors.successBg
                            : status === "ABSENT"
                              ? colors.dangerBg
                              : colors.card,
                        borderRadius: radii.lg,
                        borderWidth: 1,
                        borderColor:
                          status === "PRESENT"
                            ? colors.success
                            : status === "ABSENT"
                              ? colors.danger
                              : colors.border,
                        padding: spacing.lg,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ ...typography.title, color: colors.text }}
                        >
                          {name}
                        </Text>
                        <Text
                          style={{
                            ...typography.caption,
                            color: colors.muted,
                            marginTop: 2,
                          }}
                        >
                          Roll: {str(r.rollNumber) || "—"}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          minWidth: 64,
                          textAlign: "right",
                          color:
                            status === "PRESENT"
                              ? colors.success
                              : status === "ABSENT"
                                ? colors.danger
                                : colors.muted,
                        }}
                      >
                        {statusLabel(status)}
                      </Text>
                    </Pressable>
                  );
                })
              : null}

            {!dayQuery.isLoading && records.length > 0 ? (
              <Text style={{ ...typography.caption, color: colors.muted }}>
                Tap a student to cycle Blank → Present → Absent.
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {dirty && !isHoliday ? (
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
            title="Save attendance"
            loading={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      ) : null}

      <Sheet
        visible={calendarOpen}
        title="Pick a date"
        onClose={() => setCalendarOpen(false)}
      >
        <MonthCalendar
          year={parsed.year}
          month={parsed.month}
          holidayKeys={holidayKeys}
          selectedDay={parsed.day}
          onPressDay={(day) => {
            const next = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            setDate(next);
            setDirty(false);
            setCalendarOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}
