import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
  const [punchingOut, setPunchingOut] = useState(false);

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

  async function doPunchOut() {
    setPunchingOut(true);
    try {
      await teacherApi.punch.out();
      await qc.invalidateQueries({ queryKey: ["punch-today"] });
      await qc.invalidateQueries({ queryKey: ["punch-month"] });
      toast.success("Punched out");
    } catch (err) {
      toast.error(handleApiError(err, "Punch failed"));
    } finally {
      setPunchingOut(false);
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
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {!punchInAt ? (
                <Button
                  title="Scan QR to punch in"
                  onPress={() => router.push("/(app)/qr-punch")}
                />
              ) : (
                <Button
                  title="Punch out"
                  disabled={!!punchOutAt}
                  loading={punchingOut}
                  onPress={() => doPunchOut()}
                />
              )}
              {punchInAt && !punchOutAt ? (
                <Button
                  title="Scan QR to punch out"
                  variant="secondary"
                  onPress={() => router.push("/(app)/qr-punch")}
                />
              ) : null}
            </View>
          </Card>

          <Card
            title="Month register"
            subtitle="View your present/absent days and punch times for the month."
          >
            <Button
              title="Open my month register"
              variant="secondary"
              onPress={() => router.push("/(app)/more/punch-month")}
            />
          </Card>
        </>
      )}
    </ScrollView>
  );
}
