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
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        if (error.message.includes("User not found")) {
          Alert.alert(
            "Account Not Found",
            "No account exists with this email. Please sign up first.",
            [{ text: "OK", onPress: () => router.push("/auth/signup") }]
          );
        } else {
          Alert.alert("Error", error.message);
        }
      } else {
        // Navigate to OTP verification screen
        router.push({
          pathname: "/auth/verify",
          params: { email },
        });
      }
    } catch {
      Alert.alert("Error", "Failed to send verification code");
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
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send you a 6-digit code to sign in
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
            )}
          </TouchableOpacity>

          <Link href="/auth/signup" asChild>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>
                Don&apos;t have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
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
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
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
    fontSize: 16,
    letterSpacing: 0, // Explicitly set to normal
    textAlign: "left", // Explicitly set alignment
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
});
