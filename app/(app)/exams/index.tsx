import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useLayoutEffect } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { ScreenState } from "@/components/ui/screen-state";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import {
  buildMyAssignments,
  formatExamDate,
  isExamOwner,
} from "@/lib/exams";
import { arr, num, str } from "@/lib/types";

export default function ExamsListScreen() {
  const { colors, typography, spacing } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const navigation = useNavigation();
  const userId = str(user?.id);

  const examsQuery = useQuery({
    queryKey: ["exams"],
    queryFn: () => teacherApi.exams.list(),
  });

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });

  const exams = arr(examsQuery.data?.examinations);
  const assignments = buildMyAssignments(arr(classesQuery.data?.classes), userId);
  const canCreate = assignments.length > 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teacherApi.exams.remove(id),
    onSuccess: async () => {
      toast.success("Examination deleted");
      await qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (err) => {
      toast.error(handleApiError(err, "Failed to delete examination"));
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            if (!canCreate) {
              toast.error("No subjects assigned yet");
              return;
            }
            router.push("/(app)/exams/create");
          }}
          accessibilityLabel="New exam"
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Text
            style={{
              color: canCreate ? colors.primary : colors.muted,
              fontWeight: "700",
              fontSize: 15,
            }}
          >
            New
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, canCreate, colors.primary, colors.muted, toast]);

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      "Delete examination",
      `Delete “${name}”? This removes all mark sheets.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  }

  const error = examsQuery.error
    ? handleApiError(examsQuery.error, "Failed to load exams")
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Exams" }} />

      {examsQuery.isLoading || error || exams.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={examsQuery.isRefetching}
              onRefresh={() => examsQuery.refetch()}
            />
          }
        >
          <ScreenState
            loading={examsQuery.isLoading}
            error={error}
            empty={!examsQuery.isLoading && !error && exams.length === 0}
            emptyLabel="No examinations for your subjects yet."
          />
          {!examsQuery.isLoading && !error && exams.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No exams yet"
              message={
                canCreate
                  ? "Create an exam for your assigned subjects to start entering marks."
                  : "Ask your school admin to assign you to class subjects first."
              }
            />
          ) : null}
          {canCreate && !examsQuery.isLoading && !error && exams.length === 0 ? (
            <Pressable
              onPress={() => router.push("/(app)/exams/create")}
              style={{
                alignSelf: "center",
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Create exam
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) => str(item.id)}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.sm,
          }}
          refreshControl={
            <RefreshControl
              refreshing={examsQuery.isRefetching}
              onRefresh={() => examsQuery.refetch()}
            />
          }
          renderItem={({ item }) => {
            const id = str(item.id);
            const name = str(item.name);
            const owner = isExamOwner(item, userId);
            const marked = num(item.markedCount);
            const total = num(item.markSheetCount);
            const published = num(item.publishedCount);
            return (
              <View style={{ gap: spacing.xs }}>
                <ListRow
                  title={name}
                  subtitle={formatExamDate(str(item.examDate))}
                  onPress={() => router.push(`/(app)/exams/${id}`)}
                  right={
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Badge
                        label={`${marked}/${total} marked`}
                        tone="primary"
                      />
                      {published > 0 ? (
                        <Badge
                          label={`${published} published`}
                          tone="success"
                        />
                      ) : null}
                    </View>
                  }
                />
                {owner ? (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: spacing.sm,
                      paddingHorizontal: spacing.sm,
                    }}
                  >
                    <Pressable
                      onPress={() => router.push(`/(app)/exams/${id}/edit`)}
                      accessibilityLabel={`Edit ${name}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={{
                          ...typography.caption,
                          color: colors.primary,
                          fontWeight: "600",
                        }}
                      >
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(id, name)}
                      accessibilityLabel={`Delete ${name}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.danger}
                      />
                      <Text
                        style={{
                          ...typography.caption,
                          color: colors.danger,
                          fontWeight: "600",
                        }}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
