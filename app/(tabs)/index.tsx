import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();

  // This screen should only show app content
  // Auth is handled by /auth/* screens and _layout.tsx
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
