import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";

export type CalendarDayStatus = "PRESENT" | "ABSENT" | null;

type Props = {
  year: number;
  month: number;
  /** Map of day-of-month (1–31) → attendance status */
  marks?: Record<string, CalendarDayStatus>;
  /** YYYY-MM-DD keys that are holidays (API Sundays ∪ declared) */
  holidayKeys: Set<string>;
  selectedDay?: number | null;
  onPressDay?: (day: number) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** UTC Sunday check for YYYY-MM-DD (fallback if API omits holidays). */
function isSundayKey(key: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCDay() === 0;
}

export function isHolidayKey(key: string, holidayKeys: Set<string>): boolean {
  return holidayKeys.has(key) || isSundayKey(key);
}

function statusLetter(status: CalendarDayStatus, holiday: boolean) {
  if (holiday) return "H";
  if (status === "PRESENT") return "P";
  if (status === "ABSENT") return "A";
  return "";
}

export function MonthCalendar({
  year,
  month,
  marks = {},
  holidayKeys,
  selectedDay,
  onPressDay,
}: Props) {
  const { colors, spacing, radii } = useTheme();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const cells: { day: number | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let day = 1; day <= daysInMonth; day++) cells.push({ day });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((d) => (
          <Text
            key={d}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              fontWeight: "700",
              color: d === "Sun" ? colors.warning : colors.muted,
              marginBottom: 4,
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((cell, idx) => {
          if (cell.day == null) {
            return (
              <View
                key={`e-${idx}`}
                style={{ width: `${100 / 7}%` as unknown as number, aspectRatio: 1, padding: 2 }}
              />
            );
          }
          const day = cell.day;
          const key = dateKey(year, month, day);
          const holiday = isHolidayKey(key, holidayKeys);
          const status = marks[String(day)] ?? null;
          const selected = selectedDay === day;
          const disabled = holiday && !onPressDay ? true : false;

          let bg = colors.bg;
          let border = colors.border;
          let markColor = colors.text;
          if (holiday) {
            bg = colors.warningBg;
            border = colors.warning;
            markColor = colors.warning;
          } else if (status === "PRESENT") {
            bg = colors.successBg;
            border = colors.success;
            markColor = colors.success;
          } else if (status === "ABSENT") {
            bg = colors.dangerBg;
            border = colors.danger;
            markColor = colors.danger;
          }
          if (selected) {
            border = colors.primary;
          }

          return (
            <Pressable
              key={key}
              disabled={!onPressDay}
              onPress={() => onPressDay?.(day)}
              style={{
                width: `${100 / 7}%` as unknown as number,
                aspectRatio: 1,
                padding: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: radii.sm,
                  borderWidth: selected ? 2 : 1,
                  borderColor: border,
                  backgroundColor: bg,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: disabled ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: holiday ? colors.warning : colors.muted,
                    fontWeight: "600",
                  }}
                >
                  {day}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: markColor,
                    minHeight: 16,
                  }}
                >
                  {statusLetter(status, holiday)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingTop: spacing.xs,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.muted, fontWeight: "600" }}>
          P Present
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted, fontWeight: "600" }}>
          A Absent
        </Text>
        <Text style={{ fontSize: 11, color: colors.warning, fontWeight: "600" }}>
          H Holiday
        </Text>
      </View>
    </View>
  );
}
