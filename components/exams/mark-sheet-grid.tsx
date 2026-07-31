import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme } from "@/components/theme/theme-provider";
import type {
  MarkSheetRowStat,
  MarkSheetStudentRow,
  MarkSheetSubjectCol,
} from "@/lib/exams";

const STICKY_W = 120;
const CELL_W = 92;
const STAT_W = 64;
const ROW_H = 52;
const HEADER_H = 56;

type Props = {
  studentRows: MarkSheetStudentRow[];
  subjectCols: MarkSheetSubjectCol[];
  marks: Record<string, string>;
  rowStats: MarkSheetRowStat[];
  maxTotal: number;
  onMarksChange: (sheetId: string, value: string) => void;
};

/**
 * Sticky student column + one horizontal ScrollView for subjects/stats.
 * Vertical scroll wraps both so rows stay aligned. Gesture-handler horizontal
 * scroll wins touch negotiation against parent page scroll views.
 */
export function MarkSheetGrid({
  studentRows,
  subjectCols,
  marks,
  rowStats,
  onMarksChange,
}: Props) {
  const { colors, typography, spacing, radii } = useTheme();
  const [overLimit, setOverLimit] = useState<Record<string, boolean>>({});
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const [focusedSheetId, setFocusedSheetId] = useState<string | null>(null);
  const clearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    const timers = clearTimers.current;
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t);
    };
  }, []);

  const flashOverLimit = useCallback((sheetId: string) => {
    setOverLimit((prev) => ({ ...prev, [sheetId]: true }));
    if (clearTimers.current[sheetId]) {
      clearTimeout(clearTimers.current[sheetId]);
    }
    clearTimers.current[sheetId] = setTimeout(() => {
      setOverLimit((prev) => {
        const next = { ...prev };
        delete next[sheetId];
        return next;
      });
      delete clearTimers.current[sheetId];
    }, 1600);
  }, []);

  function handleCellChange(
    sheetId: string,
    maxMarks: number,
    text: string,
  ) {
    const cleaned = text.replace(/[^0-9.]/g, "");
    if (cleaned === "" || cleaned === ".") {
      onMarksChange(sheetId, cleaned);
      return;
    }
    const value = Number(cleaned);
    if (Number.isNaN(value)) {
      onMarksChange(sheetId, cleaned);
      return;
    }
    if (value < 0) {
      onMarksChange(sheetId, "0");
      return;
    }
    if (value > maxMarks) {
      onMarksChange(sheetId, String(maxMarks));
      flashOverLimit(sheetId);
      return;
    }
    onMarksChange(sheetId, cleaned);
  }

  function formatTotal(stats: MarkSheetRowStat | undefined) {
    if (!stats || stats.rank <= 0) return "—";
    return stats.total % 1 ? stats.total.toFixed(1) : String(stats.total);
  }

  const border = colors.border;

  return (
    <View
      style={{
        flex: 1,
        minHeight: 280,
        borderWidth: 1,
        borderColor: border,
        borderRadius: radii.lg,
        overflow: "hidden",
        backgroundColor: colors.card,
      }}
      accessibilityLabel="Mark sheet grid"
    >
      <ScrollView
        style={{ flex: 1 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bounces
      >
        <View style={{ flexDirection: "row" }}>
          {/* Sticky left: roll + name */}
          <View style={{ width: STICKY_W }}>
            <View
              style={{
                width: STICKY_W,
                height: HEADER_H,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: border,
                paddingHorizontal: spacing.sm,
                justifyContent: "center",
                backgroundColor: colors.bg,
              }}
            >
              <Text style={{ ...typography.label, color: colors.muted }}>
                Roll
              </Text>
              <Text style={{ ...typography.caption, color: colors.muted }}>
                Student
              </Text>
            </View>
            {studentRows.map((row, rowIndex) => {
              const tinted = focusRow === rowIndex;
              return (
                <View
                  key={row.studentProfileId}
                  style={{
                    width: STICKY_W,
                    height: ROW_H,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: border,
                    paddingHorizontal: spacing.sm,
                    justifyContent: "center",
                    backgroundColor: tinted
                      ? colors.primaryMuted
                      : colors.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {row.rollNumber || "—"}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: colors.text }}
                    numberOfLines={1}
                  >
                    {row.name || "Student"}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Single horizontal scroller for header + all mark rows */}
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator
            bounces
            decelerationRate="normal"
            style={{ flexGrow: 1, flexShrink: 1 }}
          >
            <View>
              <View style={{ flexDirection: "row" }}>
                {subjectCols.map((col) => (
                  <View
                    key={col.subjectId}
                    style={{
                      width: CELL_W,
                      height: HEADER_H,
                      borderRightWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: border,
                      paddingHorizontal: 6,
                      justifyContent: "center",
                      backgroundColor: colors.bg,
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {col.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.muted }}>
                      / {col.maxMarks}
                    </Text>
                  </View>
                ))}
                {(["Total", "%", "Rank"] as const).map((label) => (
                  <View
                    key={label}
                    style={{
                      width: STAT_W,
                      height: HEADER_H,
                      borderRightWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: border,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: colors.muted,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              {studentRows.map((row, rowIndex) => {
                const tinted = focusRow === rowIndex;
                const bg = tinted ? colors.primaryMuted : colors.card;
                const stats = rowStats[rowIndex];
                return (
                  <View
                    key={row.studentProfileId}
                    style={{ flexDirection: "row" }}
                  >
                    {subjectCols.map((col) => {
                      const sheet = row.bySubject[col.subjectId];
                      if (!sheet) {
                        return (
                          <View
                            key={col.subjectId}
                            style={{
                              width: CELL_W,
                              height: ROW_H,
                              borderRightWidth: 1,
                              borderBottomWidth: 1,
                              borderColor: border,
                              backgroundColor: colors.bg,
                            }}
                          />
                        );
                      }
                      const flash = !!overLimit[sheet.id];
                      const focused = focusedSheetId === sheet.id;
                      return (
                        <View
                          key={col.subjectId}
                          style={{
                            width: CELL_W,
                            height: ROW_H,
                            borderRightWidth: 1,
                            borderBottomWidth: 1,
                            borderColor: flash ? colors.danger : border,
                            backgroundColor: bg,
                            paddingHorizontal: 4,
                            justifyContent: "center",
                          }}
                        >
                          <TextInput
                            value={marks[sheet.id] ?? ""}
                            onChangeText={(t) =>
                              handleCellChange(sheet.id, sheet.maxMarks, t)
                            }
                            onFocus={() => {
                              setFocusRow(rowIndex);
                              setFocusedSheetId(sheet.id);
                            }}
                            onBlur={() => {
                              setFocusRow((r) =>
                                r === rowIndex ? null : r,
                              );
                              setFocusedSheetId((id) =>
                                id === sheet.id ? null : id,
                              );
                            }}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor={colors.muted}
                            selectTextOnFocus
                            // Unfocused inputs don't steal horizontal pans as aggressively
                            editable
                            caretHidden={!focused}
                            accessibilityLabel={`Marks for ${row.name}, ${col.name}`}
                            style={{
                              height: 40,
                              borderWidth: 1,
                              borderColor: flash
                                ? colors.danger
                                : focused
                                  ? colors.primary
                                  : colors.border,
                              borderRadius: radii.sm,
                              paddingHorizontal: 6,
                              textAlign: "center",
                              color: colors.text,
                              backgroundColor: colors.inputBg,
                              fontSize: 15,
                            }}
                          />
                        </View>
                      );
                    })}
                    <View
                      style={{
                        width: STAT_W,
                        height: ROW_H,
                        borderRightWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: border,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {formatTotal(stats)}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: STAT_W,
                        height: ROW_H,
                        borderRightWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: border,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {stats && stats.rank > 0
                          ? `${stats.percentage.toFixed(0)}%`
                          : "—"}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: STAT_W,
                        height: ROW_H,
                        borderRightWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: border,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {stats && stats.rank > 0 ? stats.rank : "—"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
