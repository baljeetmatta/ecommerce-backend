import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Button, Chip, Field } from "@/components/Ui";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";

export default function Signup() {
  const { register } = useAuth();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", gender: "prefer_not_to_say" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await register(form);
      router.replace({ pathname: "/login", params: { verificationSent: "true", email: form.email.trim().toLowerCase(), redirect } });
    } catch (signupError: any) {
      setError(signupError.message);
    } finally {
      setBusy(false);
    }
  };

  return <Screen title="Create account" back>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Join HRS Basket</Text>
        <Text style={styles.sub}>One account for faster checkout, saved carts and order updates.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <Field label="Full name" value={form.name} onChangeText={(value) => set("name", value)} placeholder="Your name" />
        <Field label="Email address" value={form.email} onChangeText={(value) => set("email", value)} autoCapitalize="none" keyboardType="email-address" />
        <Text style={styles.label}>Gender</Text>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {[["female", "Female"], ["male", "Male"], ["other", "Other"], ["prefer_not_to_say", "Prefer not to say"]].map(([value, label]) =>
            <Chip key={value} label={label} selected={form.gender === value} onPress={() => set("gender", value)} />
          )}
        </ScrollView>
        <Field label="Password" value={form.password} onChangeText={(value) => set("password", value)} secureTextEntry placeholder="At least 8 characters" />
        <Field label="Confirm password" value={form.confirmPassword} onChangeText={(value) => set("confirmPassword", value)} secureTextEntry />
        <Button title="Create my account" loading={busy} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 22, gap: 15, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: colors.ink },
  sub: { color: colors.muted, lineHeight: 21, marginBottom: 6 },
  error: { color: colors.danger, backgroundColor: "#fff0f0", padding: 12, borderRadius: 10 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink }
});
