import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkSheetGrid } from "@/components/exams/mark-sheet-grid";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { ScreenState } from "@/components/ui/screen-state";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import {
  computeRowStats,
  formatExamDate,
  isExamOwner,
  pivotMarkSheets,
  type MarkSheetSubjectCol,
} from "@/lib/exams";
import { arr, bool, num, obj, str } from "@/lib/types";

export default function ExamDetailScreen() {
  const { examId: examIdParam } = useLocalSearchParams<{ examId: string }>();
  const examId = str(examIdParam);
  const { colors, typography, spacing } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const userId = str(user?.id);

  const [classId, setClassId] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const examQuery = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => teacherApi.exams.get(examId),
    enabled: !!examId,
  });

  const exam = examQuery.data?.examination ?? null;
  const papers = useMemo(() => arr(exam?.papers), [exam]);
  const owner = exam ? isExamOwner(exam, userId) : false;

  const classOptions = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>();
    for (const p of papers) {
      const id = str(p.classId);
      if (map.has(id)) continue;
      const klass = obj(p.class);
      map.set(id, {
        value: id,
        label: formatClassLabel(
          str(klass.classLevel),
          (klass.section as string | null) || null,
        ),
      });
    }
    return [...map.values()];
  }, [papers]);

  useEffect(() => {
    if (!classId && classOptions.length > 0) {
      setClassId(classOptions[0].value);
      return;
    }
    if (
      classId &&
      classOptions.length > 0 &&
      !classOptions.some((c) => c.value === classId)
    ) {
      setClassId(classOptions[0].value);
    }
  }, [classId, classOptions]);

  const sheetsQuery = useQuery({
    queryKey: ["exam-marksheets", examId, classId],
    queryFn: () => teacherApi.exams.markSheets(examId, classId),
    enabled: !!examId && !!classId,
  });

  const sheets = arr(sheetsQuery.data?.markSheets);

  useEffect(() => {
    if (!sheetsQuery.data) return;
    const next: Record<string, string> = {};
    for (const s of sheetsQuery.data.markSheets) {
      next[str(s.id)] =
        s.marksObtained == null ? "" : String(s.marksObtained);
    }
    setMarks(next);
    setDirty(false);
  }, [sheetsQuery.data]);

  const subjectCols: MarkSheetSubjectCol[] = useMemo(() => {
    if (!classId) return [];
    return papers
      .filter((p) => str(p.classId) === classId)
      .map((p) => {
        const subject = obj(p.subject);
        return {
          subjectId: str(p.subjectId),
          name: str(subject.name) || "Subject",
          maxMarks: num(p.maxMarks),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [papers, classId]);

  const maxTotal = useMemo(
    () => subjectCols.reduce((sum, c) => sum + c.maxMarks, 0),
    [subjectCols],
  );

  const studentRows = useMemo(() => pivotMarkSheets(sheets), [sheets]);

  const rowStats = useMemo(
    () => computeRowStats(studentRows, subjectCols, marks, maxTotal),
    [studentRows, subjectCols, marks, maxTotal],
  );

  const classPublished =
    sheets.length > 0 && sheets.every((s) => bool(s.isPublished));

  const saveMutation = useMutation({
    mutationFn: (records: { id: string; marksObtained: number | null }[]) =>
      teacherApi.exams.saveMarks(examId, { records }),
    onSuccess: async () => {
      toast.success("Marks saved");
      setDirty(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["exam-marksheets", examId] }),
        qc.invalidateQueries({ queryKey: ["exam", examId] }),
        qc.invalidateQueries({ queryKey: ["exams"] }),
      ]);
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to save marks"));
    },
  });

  const publishMutation = useMutation({
    mutationFn: (publish: boolean) =>
      teacherApi.exams.publish(examId, { publish, classId }),
    onSuccess: async (_res, publish) => {
      toast.success(publish ? "Class results published" : "Class results unpublished");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["exam-marksheets", examId] }),
        qc.invalidateQueries({ queryKey: ["exam", examId] }),
        qc.invalidateQueries({ queryKey: ["exams"] }),
      ]);
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to update publish state"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => teacherApi.exams.remove(examId),
    onSuccess: async () => {
      toast.success("Examination deleted");
      await qc.invalidateQueries({ queryKey: ["exams"] });
      router.replace("/(app)/exams");
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to delete examination"));
    },
  });

  function onMarksChange(sheetId: string, value: string) {
    setMarks((prev) => ({ ...prev, [sheetId]: value }));
    setDirty(true);
  }

  function onSave() {
    const records: { id: string; marksObtained: number | null }[] = [];
    for (const s of sheets) {
      const id = str(s.id);
      const raw = marks[id]?.trim() ?? "";
      const maxMarks = num(s.maxMarks);
      const original = s.marksObtained == null ? null : num(s.marksObtained);
      let value: number | null;
      if (raw === "") {
        value = null;
      } else {
        const parsed = Number(raw);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > maxMarks) {
          toast.error(`Marks must be between 0 and ${maxMarks}.`);
          return;
        }
        value = parsed;
      }
      if (original === value) continue;
      records.push({ id, marksObtained: value });
    }
    if (records.length === 0) {
      toast.show("No changes to save", "info");
      setDirty(false);
      return;
    }
    saveMutation.mutate(records);
  }

  function onReset() {
    Alert.alert(
      "Reset marks",
      "Clear all marks in this form? You still need to Save to persist.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            const next: Record<string, string> = {};
            for (const s of sheets) next[str(s.id)] = "";
            setMarks(next);
            setDirty(true);
            toast.show("Marks cleared locally — Save to persist", "info");
          },
        },
      ],
    );
  }

  function onPublishToggle() {
    const publish = !classPublished;
    Alert.alert(
      publish ? "Publish class results" : "Unpublish class results",
      publish
        ? "Students in this class will see results for your subjects on this exam."
        : "Hide results for this class from the student portal.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: publish ? "Publish" : "Unpublish",
          onPress: () => publishMutation.mutate(publish),
        },
      ],
    );
  }

  function onDelete() {
    Alert.alert(
      "Delete examination",
      `Delete “${str(exam?.name)}”? This removes all mark sheets.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }

  const examError = examQuery.error
    ? handleApiError(examQuery.error, "Failed to load examination")
    : "";
  const sheetsError = sheetsQuery.error
    ? handleApiError(sheetsQuery.error, "Failed to load mark sheets")
    : "";

  if (examQuery.isLoading || examError || !exam) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <Stack.Screen options={{ title: "Examination" }} />
        <ScreenState
          loading={examQuery.isLoading}
          error={examError || (!examQuery.isLoading ? "Examination not found." : "")}
          empty={false}
        />
      </View>
    );
  }

  const bottomBarH = dirty ? 128 : 72;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: str(exam.name) || "Examination",
          headerRight: owner
            ? () => (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => router.push(`/(app)/exams/${examId}/edit`)}
                    accessibilityLabel="Edit exam"
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={onDelete}
                    accessibilityLabel="Delete exam"
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />

      {/* Meta stays outside the grid so horizontal pans aren't stolen */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.title, color: colors.text, fontSize: 18 }}>
            {str(exam.name)}
          </Text>
          <Text style={{ ...typography.caption, color: colors.muted }}>
            {formatExamDate(str(exam.examDate))}
          </Text>
          {exam.description ? (
            <Text
              style={{ ...typography.body, color: colors.text }}
              numberOfLines={2}
            >
              {str(exam.description)}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Badge
              label={`${num(exam.markedCount)}/${num(exam.markSheetCount)} marked`}
              tone="primary"
            />
            {classId ? (
              <Badge
                label={classPublished ? "Class published" : "Class draft"}
                tone={classPublished ? "success" : "warning"}
              />
            ) : null}
          </View>
        </View>

        {classOptions.length > 0 ? (
          <ChipSelect
            label="Class"
            options={classOptions}
            value={classId}
            onChange={(v) => {
              if (dirty) {
                Alert.alert(
                  "Unsaved changes",
                  "Switch class and discard local mark edits?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Switch",
                      style: "destructive",
                      onPress: () => setClassId(v),
                    },
                  ],
                );
              } else {
                setClassId(v);
              }
            }}
          />
        ) : null}
      </View>

      <View
        style={{
          flex: 1,
          minHeight: 0,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: bottomBarH + spacing.sm,
        }}
      >
        {sheetsQuery.isLoading || sheetsError ? (
          <ScreenState
            loading={sheetsQuery.isLoading}
            error={sheetsError}
            empty={false}
          />
        ) : studentRows.length === 0 ? (
          <ScreenState empty emptyLabel="No mark sheets for this class." />
        ) : (
          <MarkSheetGrid
            studentRows={studentRows}
            subjectCols={subjectCols}
            marks={marks}
            rowStats={rowStats}
            maxTotal={maxTotal}
            onMarksChange={onMarksChange}
          />
        )}
      </View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: spacing.md,
          gap: spacing.sm,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {dirty ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Reset"
                variant="secondary"
                onPress={onReset}
                disabled={saveMutation.isPending}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Save"
                onPress={onSave}
                loading={saveMutation.isPending}
                disabled={studentRows.length === 0}
              />
            </View>
          </View>
        ) : null}
        <Button
          title={classPublished ? "Unpublish class" : "Publish class"}
          variant={classPublished ? "secondary" : "primary"}
          onPress={onPublishToggle}
          loading={publishMutation.isPending}
          disabled={!classId || sheets.length === 0 || publishMutation.isPending}
        />
      </View>
    </View>
  );
}
