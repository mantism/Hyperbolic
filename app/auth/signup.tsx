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

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    if (!email || !username) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    // First, sign up with magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "hyperbolic://auth", // Deep link back to app
        data: {
          username: username,
        },
      },
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Store username temporarily so we can create profile after they verify
      await supabase.auth
        .updateUser({
          data: { pending_username: username },
        })
        .catch(() => {
          // Ignore error, this is just for convenience
        });

      Alert.alert(
        "Check Your Email",
        `We've sent a magic link to ${email}. Click the link to complete your registration and sign in.`,
        [{ text: "OK", onPress: () => router.replace("/auth/login") }]
      );
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join the Hyperbolic community with just your email
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            editable={!loading}
          />

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
            onPress={signUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <Link href="/auth/login" asChild>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.disclaimer}>
          We'll send you a 6-digit code to verify your email. No passwords
          needed!
        </Text>
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
  disclaimer: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
