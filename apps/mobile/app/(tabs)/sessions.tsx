import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import SessionsList from "@/components/SessionsList";
import StartSessionModal from "@/components/StartSessionModal";
import ActiveSessionBanner from "@/components/ActiveSessionBanner";
import { useSession } from "@/contexts/SessionContext";
import { Session } from "@/lib/services/sessionService";

export default function SessionsScreen() {
  const router = useRouter();
  const { hasActiveSession, activeSession } = useSession();
  const [showStartModal, setShowStartModal] = useState(false);

  const handleSessionPress = (session: Session) => {
    router.push(`/session/${session.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {hasActiveSession && (
        <ActiveSessionBanner
          onPress={() => router.push(`/session/${activeSession?.id}`)}
        />
      )}

      <View style={styles.content}>
        <SessionsList
          onStartSession={() => setShowStartModal(true)}
          onSessionPress={handleSessionPress}
        />
      </View>

      <StartSessionModal
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
});
