import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSession } from "@/contexts/SessionContext";
import { Session } from "@/lib/services/sessionService";
import SessionCard from "./SessionCard";

interface SessionsListProps {
  onStartSession?: () => void;
  onSessionPress?: (session: Session) => void;
}

export default function SessionsList({
  onStartSession,
  onSessionPress,
}: SessionsListProps) {
  const {
    activeSession,
    sessions,
    loading,
    refreshing,
    refetchSessions,
    deleteSession,
  } = useSession();

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session? The logs will remain but won't be associated with any session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSession(sessionId),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.sectionTitle}>Session History</Text>
      {onStartSession && !activeSession && (
        <TouchableOpacity style={styles.startButton} onPress={onStartSession}>
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActiveSession = () => {
    if (!activeSession) return null;

    return (
      <View style={styles.activeSessionSection}>
        <Text style={styles.activeSectionTitle}>Current Session</Text>
        <SessionCard
          session={activeSession}
          onPress={onSessionPress}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="timer-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No sessions yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a session to track your training
      </Text>
      {onStartSession && !activeSession && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={onStartSession}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Start Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <FlatList
      data={sessions}
      renderItem={({ item }) => (
        <SessionCard
          session={item}
          onDelete={handleDeleteSession}
          onPress={onSessionPress}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <>
          {renderActiveSession()}
          {renderHeader()}
        </>
      }
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refetchSessions} />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  activeSessionSection: {
    marginBottom: 24,
  },
  activeSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
