import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { DateStepper } from "@/components/ui/date-stepper";
import { ScreenState } from "@/components/ui/screen-state";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { todayKey } from "@/lib/dates";
import {
  buildMyAssignments,
  isExamOwner,
  paperKey,
  papersFromAssignments,
  papersFromExam,
  toDateInput,
  type PaperKey,
} from "@/lib/exams";
import { arr, str } from "@/lib/types";

export default function EditExamScreen() {
  const { examId: examIdParam } = useLocalSearchParams<{ examId: string }>();
  const examId = str(examIdParam);
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const userId = str(user?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [examDate, setExamDate] = useState(todayKey());
  const [papers, setPapers] = useState<Record<PaperKey, string>>({});
  const [formError, setFormError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const examQuery = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => teacherApi.exams.get(examId),
    enabled: !!examId,
  });

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });

  const exam = examQuery.data?.examination ?? null;
  const examYearId = str(exam?.academicYearId);
  const assignments = useMemo(() => {
    const all = buildMyAssignments(arr(classesQuery.data?.classes), userId);
    if (!examYearId) return all;
    return all.filter((a) => a.academicYearId === examYearId);
  }, [classesQuery.data?.classes, userId, examYearId]);

  useEffect(() => {
    if (!exam || hydrated) return;
    if (!isExamOwner(exam, userId)) {
      toast.error("Only the exam owner can edit");
      router.back();
      return;
    }
    setName(str(exam.name));
    setDescription(exam.description ? str(exam.description) : "");
    setExamDate(toDateInput(str(exam.examDate)) || todayKey());
    setPapers(papersFromExam(exam));
    setHydrated(true);
  }, [exam, hydrated, userId, toast]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      teacherApi.exams.update(examId, body),
    onSuccess: async () => {
      toast.success("Examination updated");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["exam", examId] }),
        qc.invalidateQueries({ queryKey: ["exams"] }),
        qc.invalidateQueries({ queryKey: ["exam-marksheets", examId] }),
      ]);
      router.back();
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to update examination"));
    },
  });

  function togglePaper(classId: string, subjectId: string) {
    const key = paperKey(classId, subjectId);
    setPapers((prev) => {
      const next = { ...prev };
      if (key in next) delete next[key];
      else next[key] = "100";
      return next;
    });
  }

  function selectAllSubjects() {
    setPapers((prev) => papersFromAssignments(assignments, prev));
  }

  function clearAllSubjects() {
    setPapers({});
  }

  function onSubmit() {
    setFormError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Exam name is required.");
      return;
    }
    if (!examDate) {
      setFormError("Exam date is required.");
      return;
    }
    const paperEntries = Object.entries(papers);
    if (paperEntries.length === 0) {
      setFormError("Select at least one assigned subject.");
      return;
    }
    const paperPayload = paperEntries.map(([key, maxMarksStr]) => {
      const [classId, subjectId] = key.split(":");
      return { classId, subjectId, maxMarks: Number(maxMarksStr) };
    });
    if (paperPayload.some((p) => !p.maxMarks || p.maxMarks <= 0)) {
      setFormError("Each paper needs a positive max marks value.");
      return;
    }
    const classIds = [...new Set(paperPayload.map((p) => p.classId))];

    updateMutation.mutate({
      name: trimmed,
      description: description.trim() || null,
      examDate,
      scope: "CLASSES",
      classIds,
      papers: paperPayload,
    });
  }

  const loadError = examQuery.error
    ? handleApiError(examQuery.error, "Failed to load examination")
    : classesQuery.error
      ? handleApiError(classesQuery.error, "Failed to load assignments")
      : "";

  if (examQuery.isLoading || classesQuery.isLoading || loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <ScreenState
          loading={examQuery.isLoading || classesQuery.isLoading}
          error={loadError}
          empty={false}
        />
      </View>
    );
  }

  if (!exam || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <ScreenState
          loading={!hydrated && !!exam}
          error={!exam ? "Examination not found." : ""}
          empty={false}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ ...typography.caption, color: colors.warning }}>
          Adding a subject creates mark sheets. Removing a subject deletes its
          marks.
        </Text>

        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Unit Test / Chapter Test"
          autoCapitalize="words"
        />

        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.label, color: colors.text }}>
            Exam date
          </Text>
          <DateStepper value={examDate} onChange={setExamDate} />
        </View>

        <TextField
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes"
          multiline
          style={{ minHeight: 72, textAlignVertical: "top", paddingTop: 10 }}
        />

        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.sm,
            }}
          >
            <Text style={{ ...typography.label, color: colors.text }}>
              Your subjects
            </Text>
            {assignments.length > 0 ? (
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Pressable
                  onPress={selectAllSubjects}
                  accessibilityRole="button"
                  accessibilityLabel="Select all subjects"
                  hitSlop={8}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.primary,
                      fontWeight: "700",
                    }}
                  >
                    Select all
                  </Text>
                </Pressable>
                <Pressable
                  onPress={clearAllSubjects}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all subjects"
                  hitSlop={8}
                  disabled={Object.keys(papers).length === 0}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color:
                        Object.keys(papers).length === 0
                          ? colors.muted
                          : colors.danger,
                      fontWeight: "700",
                    }}
                  >
                    Clear
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          {assignments.length === 0 ? (
            <Text style={{ ...typography.caption, color: colors.muted }}>
              No subjects are assigned to you yet.
            </Text>
          ) : (
            assignments.map((a) => {
              const key = paperKey(a.classId, a.subjectId);
              const selected = key in papers;
              return (
                <View
                  key={key}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected
                      ? colors.primaryMuted
                      : colors.card,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                    gap: spacing.sm,
                  }}
                >
                  <Pressable
                    onPress={() => togglePaper(a.classId, a.subjectId)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={{ ...typography.title, color: colors.text }}>
                      {selected ? "✓ " : ""}
                      {a.classLabel} · {a.subjectName}
                    </Text>
                    {!selected ? (
                      <Text
                        style={{
                          ...typography.caption,
                          color: colors.muted,
                          marginTop: 4,
                        }}
                      >
                        Tap to include
                      </Text>
                    ) : null}
                  </Pressable>
                  {selected ? (
                    <TextField
                      label="Max marks"
                      value={papers[key]}
                      onChangeText={(t) =>
                        setPapers((prev) => ({
                          ...prev,
                          [key]: t.replace(/[^0-9.]/g, ""),
                        }))
                      }
                      keyboardType="decimal-pad"
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {formError ? (
          <Text style={{ color: colors.danger, fontSize: 13 }}>{formError}</Text>
        ) : null}

        <Button
          title="Save changes"
          onPress={onSubmit}
          loading={updateMutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
