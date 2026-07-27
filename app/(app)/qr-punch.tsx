import { useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { handleApiError } from "@/lib/api/errors";
import { teacherApi } from "@/lib/api/teacher";
import { formatTime } from "@/lib/dates";
import { obj, str } from "@/lib/types";

/** Pulls the token out of a scanned deep link, or accepts a bare token. */
function readToken(scanned: string): string | null {
  const value = scanned.trim();
  if (!value) return null;
  const match = /[?&]token=([^&#\s]+)/.exec(value);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  if (value.includes("://") || /\s/.test(value)) return null;
  return value;
}

type Result = {
  action: "PUNCH_IN" | "PUNCH_OUT";
  punchInAt: string | null;
  punchOutAt: string | null;
};

export default function QrPunchScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { colors, typography, spacing, radii } = useTheme();
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const submit = useCallback(
    async (value: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setSubmitting(true);
      setError("");
      try {
        const data = await teacherApi.punch.qr(value);
        const attendance = obj(data.attendance);
        setResult({
          action: data.action,
          punchInAt: str(attendance.punchInAt) || null,
          punchOutAt: str(attendance.punchOutAt) || null,
        });
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["punch-today"] }),
          qc.invalidateQueries({ queryKey: ["punch-month"] }),
        ]);
      } catch (err) {
        setError(handleApiError(err, "Could not record your punch"));
      } finally {
        setSubmitting(false);
        busyRef.current = false;
      }
    },
    [qc],
  );

  const deepLinkToken = typeof token === "string" ? token : "";

  useEffect(() => {
    if (deepLinkToken) {
      void submit(deepLinkToken);
    }
  }, [deepLinkToken, submit]);

  function retry() {
    setResult(null);
    setError("");
    if (deepLinkToken) {
      void submit(deepLinkToken);
    }
  }

  const scanning = !deepLinkToken && !result && !error && !submitting;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
    >
      {result ? (
        <Card
          title={result.action === "PUNCH_IN" ? "Punched in" : "Punched out"}
          subtitle="Your attendance has been recorded."
        >
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatTile
              label="In"
              value={formatTime(result.punchInAt)}
              tone={result.action === "PUNCH_IN" ? "success" : "default"}
            />
            <StatTile
              label="Out"
              value={formatTime(result.punchOutAt)}
              tone={result.action === "PUNCH_OUT" ? "success" : "default"}
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button title="Done" onPress={() => router.replace("/(app)")} />
          </View>
        </Card>
      ) : null}

      {error ? (
        <Card title="Punch failed" subtitle={error}>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              title={deepLinkToken ? "Try again" : "Scan again"}
              onPress={retry}
            />
            <Button
              title="Back"
              variant="secondary"
              onPress={() => router.replace("/(app)")}
            />
          </View>
        </Card>
      ) : null}

      {submitting ? (
        <Card title="Recording your punch…" subtitle="Please wait a moment." />
      ) : null}

      {scanning ? (
        permission?.granted ? (
          <>
            <Card
              title="Scan the school QR"
              subtitle="Point your camera at the punch QR poster to punch in or out."
            />
            <View
              style={{
                height: 340,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
                backgroundColor: colors.card,
              }}
            >
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => {
                  const value = readToken(data);
                  if (!value) {
                    setError("That QR code is not a punch code.");
                    return;
                  }
                  void submit(value);
                }}
              />
            </View>
            <Text style={{ ...typography.caption, color: colors.muted }}>
              The first scan of the day punches you in, the next one punches you
              out.
            </Text>
          </>
        ) : (
          <Card
            title="Camera access needed"
            subtitle={
              permission?.canAskAgain === false
                ? "Enable camera access for this app in your device settings, then come back."
                : "Allow camera access so you can scan the school punch QR code."
            }
          >
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Button
                title="Allow camera"
                disabled={permission?.canAskAgain === false}
                onPress={() => void requestPermission()}
              />
              <Button
                title="Back"
                variant="secondary"
                onPress={() => router.replace("/(app)")}
              />
            </View>
          </Card>
        )
      ) : null}
    </ScrollView>
  );
}
