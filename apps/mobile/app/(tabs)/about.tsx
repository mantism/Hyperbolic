import { Text, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function AboutScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>About Hyperbolic</Text>
        <Text style={styles.subtitle}>
          The ultimate app for tracking your tricking journey
        </Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Version</Text>
          <Text style={styles.sectionText}>1.0.0 (Beta)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.sectionText}>• Track your trick progression</Text>
          <Text style={styles.sectionText}>• Browse and track all tricks</Text>
          <Text style={styles.sectionText}>• Log training sessions</Text>
          <Text style={styles.sectionText}>• Connect with the community</Text>
        </View>
        
        {user && (
          <View style={styles.userSection}>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  userSection: {
    marginTop: "auto",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  userEmail: {
    fontSize: 14,
    color: "#999",
    marginBottom: 12,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#FF3B30",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutText: {
    color: "#FF3B30",
    fontWeight: "600",
    fontSize: 14,
  },
});
