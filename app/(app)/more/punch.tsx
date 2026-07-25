import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenState } from "@/components/ui/screen-state";
import { StatTile } from "@/components/ui/stat-tile";
import { useToast } from "@/components/ui/toast";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatDurationMs, formatTime } from "@/lib/dates";
import { obj, str } from "@/lib/types";

export default function PunchScreen() {
  const { colors, typography, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [punching, setPunching] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const punchQuery = useQuery({
    queryKey: ["punch-today"],
    queryFn: () => teacherApi.punch.today(),
  });

  const staffQuery = useQuery({
    queryKey: ["staff-me"],
    queryFn: () => teacherApi.me(),
  });

  const attendance = obj(punchQuery.data?.attendance);
  const staff = obj(staffQuery.data?.staff);
  const punchInAt = str(attendance.punchInAt) || null;
  const punchOutAt = str(attendance.punchOutAt) || null;
  const expectedIn = str(staff.expectedPunchInTime) || null;
  const expectedOut = str(staff.expectedPunchOutTime) || null;

  let punchStatus: "not-started" | "working" | "done" = "not-started";
  if (punchInAt && punchOutAt) punchStatus = "done";
  else if (punchInAt) punchStatus = "working";

  const workedMs = punchInAt
    ? (punchOutAt ? new Date(punchOutAt).getTime() : now) -
      new Date(punchInAt).getTime()
    : 0;

  const error = punchQuery.error
    ? handleApiError(punchQuery.error, "Failed to load punch status")
    : "";

  async function doPunch(kind: "in" | "out") {
    setPunching(kind);
    try {
      if (kind === "in") await teacherApi.punch.in();
      else await teacherApi.punch.out();
      await qc.invalidateQueries({ queryKey: ["punch-today"] });
      toast.success(kind === "in" ? "Punched in" : "Punched out");
    } catch (err) {
      toast.error(handleApiError(err, "Punch failed"));
    } finally {
      setPunching(null);
    }
  }

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
          refreshing={punchQuery.isRefetching}
          onRefresh={() => punchQuery.refetch()}
        />
      }
    >
      {punchQuery.isLoading || error ? (
        <ScreenState loading={punchQuery.isLoading} error={error} />
      ) : (
        <>
          <Card title="Today">
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <StatTile
                label="Status"
                value={
                  punchStatus === "done"
                    ? "Done"
                    : punchStatus === "working"
                      ? "Working"
                      : "Not started"
                }
                tone={
                  punchStatus === "done"
                    ? "success"
                    : punchStatus === "working"
                      ? "primary"
                      : "default"
                }
              />
              <StatTile
                label="Worked"
                value={punchInAt ? formatDurationMs(workedMs) : "—"}
              />
            </View>
            <View style={{ gap: 4, marginTop: spacing.sm }}>
              <Text style={{ ...typography.caption, color: colors.muted }}>
                In: {formatTime(punchInAt)}
                {expectedIn ? ` (expected ${expectedIn})` : ""}
              </Text>
              <Text style={{ ...typography.caption, color: colors.muted }}>
                Out: {formatTime(punchOutAt)}
                {expectedOut ? ` (expected ${expectedOut})` : ""}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  title="Punch in"
                  variant="secondary"
                  disabled={!!punchInAt}
                  loading={punching === "in"}
                  onPress={() => doPunch("in")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Punch out"
                  disabled={!punchInAt || !!punchOutAt}
                  loading={punching === "out"}
                  onPress={() => doPunch("out")}
                />
              </View>
            </View>
          </Card>
          <Card
            title="History"
            subtitle="Punch history is only available to school admins. This screen shows today's punch only."
          />
        </>
      )}
    </ScrollView>
  );
}
