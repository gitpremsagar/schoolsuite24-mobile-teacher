import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { errorMessage } from "@/lib/api/subscription";

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user?.role === "TEACHER") {
    return <Redirect href="/(app)" />;
  }

  async function onSubmit() {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/(app)");
    } catch (err) {
      setError(errorMessage(err, "Sign in failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
          <Text style={{ ...typography.h1, color: colors.text }}>
            SchoolSuite Teacher
          </Text>
          <Text style={{ ...typography.body, color: colors.muted }}>
            Sign in with your teacher account.
          </Text>
        </View>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="teacher@school.edu"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
        />

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>
        ) : null}

        <Button title="Sign in" loading={submitting} onPress={onSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
