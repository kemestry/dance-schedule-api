import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Redirect } from "expo-router";

import { useAuthSession } from "@/providers/AuthProvider";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function SignInScreen() {
  const {
    isSupabaseEnabled,
    loading,
    session,
    requestMagicLink,
    magicLinkRequestedFor,
    clearMagicLinkRequest
  } = useAuthSession();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValue = useMemo(() => normalizeEmail(email), [email]);

  if (!isSupabaseEnabled) {
    return <Redirect href="/(tabs)/schedule" />;
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#5BAA8B" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/schedule" />;
  }

  const handleSubmit = async () => {
    if (!emailValue) {
      setError("Enter the email you want to use for your CompCoach account.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestMagicLink({
        email: emailValue,
        fullName: fullName.trim() || undefined
      });
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "We could not send the sign-in link right now.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>PARENT SIGN IN</Text>
          <Text style={styles.title}>Welcome to CompCoach</Text>
          <Text style={styles.subtitle}>
            Sign in with email so your weekends, dancer lists, and imports stay with you across
            devices.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="parent@example.com"
            placeholderTextColor="#8A928C"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Full name (optional)</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Michael Athill"
            placeholderTextColor="#8A928C"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <Pressable
            disabled={submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              submitting && styles.primaryButtonDisabled
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#123629" />
            ) : (
              <Text style={styles.primaryButtonText}>Send magic link</Text>
            )}
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {magicLinkRequestedFor ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Check your email</Text>
              <Text style={styles.noticeBody}>
                We sent a sign-in link to {magicLinkRequestedFor}. Open it on this phone and
                CompCoach will bring you back in automatically.
              </Text>
              <Pressable onPress={clearMagicLinkRequest}>
                <Text style={styles.noticeAction}>Use another email</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.supportingCopy}>
              We’re starting with passwordless sign-in because it’s the lightest path for busy
              dance weekends.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F7F4"
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
    gap: 20
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F7F4"
  },
  heroCard: {
    backgroundColor: "#123629",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12
  },
  eyebrow: {
    color: "#B8FA34",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2
  },
  title: {
    color: "#F8F7F4",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800"
  },
  subtitle: {
    color: "#D0D7D2",
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "500"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "#DED8CA"
  },
  label: {
    color: "#123629",
    fontSize: 16,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#DED8CA",
    borderRadius: 24,
    backgroundColor: "#FBF8F0",
    fontSize: 18,
    fontWeight: "600",
    color: "#18211B",
    paddingHorizontal: 18,
    paddingVertical: 18
  },
  primaryButton: {
    minHeight: 62,
    borderRadius: 24,
    backgroundColor: "#B8FA34",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#123629",
    fontSize: 20,
    fontWeight: "800"
  },
  errorText: {
    color: "#D35A45",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24
  },
  noticeCard: {
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: "#F2ECDD",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10
  },
  noticeTitle: {
    color: "#123629",
    fontSize: 18,
    fontWeight: "800"
  },
  noticeBody: {
    color: "#63706A",
    fontSize: 17,
    lineHeight: 27,
    fontWeight: "500"
  },
  noticeAction: {
    color: "#123629",
    fontSize: 16,
    fontWeight: "800"
  },
  supportingCopy: {
    color: "#63706A",
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "500"
  }
});
