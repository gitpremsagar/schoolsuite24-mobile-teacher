import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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
import { buildMyAssignments, paperKey, papersFromAssignments, type PaperKey } from "@/lib/exams";
import { arr, str } from "@/lib/types";

export default function CreateExamScreen() {
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

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });

  const assignments = useMemo(
    () => buildMyAssignments(arr(classesQuery.data?.classes), userId),
    [classesQuery.data?.classes, userId],
  );

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => teacherApi.exams.create(body),
    onSuccess: async (res) => {
      toast.success("Examination created");
      await qc.invalidateQueries({ queryKey: ["exams"] });
      const id = str(res.examination?.id);
      if (id) router.replace(`/(app)/exams/${id}`);
      else router.back();
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to create examination"));
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
    const academicYearId =
      assignments.find((a) => a.classId === classIds[0])?.academicYearId ||
      undefined;

    createMutation.mutate({
      name: trimmed,
      description: description.trim() || null,
      examDate,
      academicYearId,
      scope: "CLASSES",
      classIds,
      papers: paperPayload,
    });
  }

  const loadError = classesQuery.error
    ? handleApiError(classesQuery.error, "Failed to load assignments")
    : "";

  if (classesQuery.isLoading || loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <ScreenState
          loading={classesQuery.isLoading}
          error={loadError}
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
        <Text style={{ ...typography.caption, color: colors.muted }}>
          Only your assigned class subjects are available.
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
          <Text style={{ color: colors.danger, fontSize: 13 }}>
            {formError}
          </Text>
        ) : null}

        <Button
          title="Create examination"
          onPress={onSubmit}
          loading={createMutation.isPending}
          disabled={assignments.length === 0}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
