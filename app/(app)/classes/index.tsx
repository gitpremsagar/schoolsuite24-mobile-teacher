import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChipSelect } from "@/components/ui/chip-select";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { ScreenState } from "@/components/ui/screen-state";
import { SearchField } from "@/components/ui/search-field";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatClassLabel } from "@/lib/class-levels";
import { arr, bool, num, obj, str } from "@/lib/types";

const ALL = "__all__";

export default function ClassesScreen() {
  const { colors, typography, spacing } = useTheme();
  const [search, setSearch] = useState("");
  const [yearId, setYearId] = useState(ALL);

  const classesQuery = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => teacherApi.myClasses(),
  });

  const classes = arr(classesQuery.data?.classes);

  const yearOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) {
      const year = obj(c.academicYear);
      const id = str(year.id);
      const name = str(year.name) || id;
      if (id) map.set(id, name);
    }
    return [
      { label: "All years", value: ALL },
      ...[...map.entries()].map(([value, label]) => ({ value, label })),
    ];
  }, [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (yearId !== ALL && str(obj(c.academicYear).id) !== yearId) return false;
      if (!q) return true;
      const label = formatClassLabel(
        str(c.classLevel),
        str(c.section) || null,
      ).toLowerCase();
      const year = str(obj(c.academicYear).name).toLowerCase();
      return label.includes(q) || year.includes(q);
    });
  }, [classes, search, yearId]);

  const error = classesQuery.error
    ? handleApiError(classesQuery.error, "Failed to load classes")
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <SearchField
          placeholder="Search classes"
          value={search}
          onChangeText={setSearch}
        />
        {yearOptions.length > 2 ? (
          <ChipSelect
            label="Academic year"
            options={yearOptions}
            value={yearId}
            onChange={setYearId}
          />
        ) : null}
      </View>

      {classesQuery.isLoading || error || filtered.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ScreenState
            loading={classesQuery.isLoading}
            error={error}
            empty={!classesQuery.isLoading && !error && filtered.length === 0}
            emptyLabel={
              classes.length === 0
                ? "No classes assigned yet."
                : "No classes match your filters."
            }
          />
          {!classesQuery.isLoading && !error && classes.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title="No classes assigned"
              message="Ask your school admin to assign you to a class."
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => str(item.id)}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.sm,
          }}
          refreshControl={
            <RefreshControl
              refreshing={classesQuery.isRefetching}
              onRefresh={() => classesQuery.refetch()}
            />
          }
          renderItem={({ item }) => {
            const label = formatClassLabel(
              str(item.classLevel),
              str(item.section) || null,
            );
            const year = str(obj(item.academicYear).name);
            const count = num(obj(item._count).enrollments);
            const primary = bool(item.isPrimary);
            return (
              <ListRow
                leading={<Avatar name={label} />}
                title={label}
                subtitle={`${year || "Year"} · ${count} student${count === 1 ? "" : "s"}`}
                right={
                  <Badge
                    label={primary ? "Class teacher" : "Subject teacher"}
                    tone={primary ? "primary" : "default"}
                  />
                }
                onPress={() =>
                  router.push(`/(app)/classes/${str(item.id)}`)
                }
              />
            );
          }}
          ListHeaderComponent={
            <Text
              style={{
                ...typography.caption,
                color: colors.muted,
                marginBottom: spacing.xs,
              }}
            >
              {filtered.length} class{filtered.length === 1 ? "" : "es"}
            </Text>
          }
        />
      )}
    </View>
  );
}
