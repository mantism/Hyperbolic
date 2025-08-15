import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Hyperbolic</Text>
          <Text style={styles.subtitle}>Track your tricking journey</Text>
          
          <View style={styles.authButtons}>
            <Link href="/auth/login" asChild>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
            
            <Link href="/auth/signup" asChild>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
          
          <Text style={styles.description}>
            Join the community and start tracking your tricks, combos, and progress.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Ready to work on some tricks?</Text>
        
        <View style={styles.featureButtons}>
          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Browse Tricks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>My Arsenal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.featureButton}>
            <Text style={styles.featureButtonText}>Track Session</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.comingSoon}>
          More features coming soon!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#ccc",
    marginBottom: 40,
    textAlign: "center",
  },
  authButtons: {
    width: "100%",
    maxWidth: 300,
    gap: 16,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
  },
  description: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 24,
  },
  featureButtons: {
    width: "100%",
    maxWidth: 300,
    gap: 16,
    marginBottom: 30,
  },
  featureButton: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  featureButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  comingSoon: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
