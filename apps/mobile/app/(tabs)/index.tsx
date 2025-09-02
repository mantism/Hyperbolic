import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // This screen should only show app content
  // Auth is handled by /auth/* screens and _layout.tsx
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hyperbolic</Text>
        <Text style={styles.subtitle}>Ready to work on some tricks?</Text>
        
        <View style={styles.featureButtons}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push("/(tabs)/browse")}
          >
            <Text style={styles.primaryButtonText}>Browse Tricks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push("/(tabs)/arsenal")}
          >
            <Text style={styles.secondaryButtonText}>My Arsenal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Track Session</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.userInfo}>
            {user?.email}
          </Text>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={signOut}
          >
            <Text style={styles.linkText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  featureButtons: {
    width: "100%",
    maxWidth: 300,
    gap: 12,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  userInfo: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    color: "#007AFF",
    fontSize: 14,
  },
});
