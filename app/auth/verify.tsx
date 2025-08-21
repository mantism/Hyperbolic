import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase/supabase";

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOTP = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    // TODO: Implement custom word-based OTP system
    // For now, we're using Supabase's numeric 6-digit OTP
    // Future: Generate word codes like "tiger-ocean-crystal-swift"
    // and send via custom email service (Resend, SendGrid, etc.)

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email!,
        token: otp,
        type: "email",
      });

      if (error) {
        Alert.alert("Error", "Invalid or expired code. Please try again.");
      } else {
        // Successfully verified, user is now logged in
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Error", "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email!,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "A new code has been sent to your email");
      }
    } catch {
      Alert.alert("Error", "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to{"\n"}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="000000"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            editable={!loading}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={verifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={resendCode}
            disabled={loading}
          >
            <Text style={styles.linkText}>Didn&apos;t receive the code? Resend</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>Use a different email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>The code expires in 60 minutes</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontWeight: "600",
    color: "#333",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    padding: 8,
  },
  linkText: {
    color: "#007AFF",
    fontSize: 14,
  },
  note: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
